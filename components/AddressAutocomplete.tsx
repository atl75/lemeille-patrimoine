"use client";
import { useState, useEffect, useRef, useId } from "react";
import { addressComponents, createAddressSearch, type AddressSearchState, type AddressSuggestion } from '@/lib/addressSearch';

type AddressComponents = {
  address: string;
  city: string;
  region: string;
};

type Props = {
  inputAria?: Pick<React.InputHTMLAttributes<HTMLInputElement>, 'aria-invalid' | 'aria-describedby' | 'aria-required' | 'aria-label'>;
  value: string;
  onChange: (components: AddressComponents) => void;
  placeholder?: string;
  /**
   * Style de l'input. Sans lui, le champ n'avait AUCUNE classe : ni largeur,
   * ni bordure, ni marge interne — un input brut du navigateur, large d'une
   * vingtaine de caractères et désaligné de tous ses voisins. C'est ce qui
   * arrivait aux deux champs adresse de la fiche bien. D'où le repli
   * ci-dessous : un appel qui oublie le style obtient un champ correct, pas
   * un champ nu.
   */
  className?: string;
  // Optionnel : remonte le texte brut à chaque frappe (pour conserver une saisie
  // libre non issue d'une suggestion). onChange reste déclenché à la sélection.
  onTextChange?: (text: string) => void;
};

const STYLE_PAR_DEFAUT = 'w-full px-2 py-1.5 text-sm border rounded';

export default function AddressAutocomplete({ value, onChange, placeholder, className, onTextChange, inputAria }: Props) {
  const [inputValue, setInputValue] = useState(value);
  const [result, setResult] = useState<AddressSearchState>({ status: 'idle', suggestions: [] });
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestions = result.suggestions;
  const showSuggestions = result.status === 'ready';
  const prefix = useId();
  const listId = `${prefix}-suggestions`;
  const hintId = `${prefix}-aide`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<ReturnType<typeof createAddressSearch> | null>(null);
  const isFocusedRef = useRef(false);

  // Synchronise depuis la valeur externe UNIQUEMENT quand le champ n'est pas en
  // cours d'édition — sinon, avec onTextChange, chaque frappe met à jour le
  // parent qui réécrase la saisie (curseur qui saute, caractères perdus).
  useEffect(() => {
    if (isFocusedRef.current) return;
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const search = createAddressSearch(setResult);
    searchRef.current = search;
    return () => search.cancel();
  }, []);

  useEffect(() => {
    if (showSuggestions && activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [activeIndex, showSuggestions]);

  const dismiss = () => {
    searchRef.current?.cancel();
    setResult({ status: 'idle', suggestions: [] });
    setActiveIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onTextChange?.(newValue);

    setActiveIndex(-1);
    searchRef.current?.search(newValue);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    dismiss();
    setInputValue(suggestion.properties.label);
    onChange(addressComponents(suggestion));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') {
      if (result.status !== 'idle') {
        event.preventDefault();
        event.stopPropagation();
      }
      dismiss();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!showSuggestions) {
        if (result.status === 'idle') searchRef.current?.search(inputValue);
        return;
      }
      setActiveIndex(index => event.key === 'ArrowDown'
        ? Math.min(index + 1, suggestions.length - 1)
        : index < 0 ? suggestions.length - 1 : Math.max(0, index - 1));
    } else if (event.key === 'Enter' && showSuggestions && activeIndex >= 0) {
      event.preventDefault();
      handleSelectSuggestion(suggestions[activeIndex]);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
      <input
        ref={inputRef}
        type="text"
        aria-label="Adresse"
        {...inputAria}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        aria-controls={showSuggestions ? listId : undefined}
        aria-activedescendant={showSuggestions && activeIndex >= 0 ? `${prefix}-option-${activeIndex}` : undefined}
        aria-describedby={[inputAria?.['aria-describedby'], hintId].filter(Boolean).join(' ')}
        className={className ?? STYLE_PAR_DEFAUT}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => { isFocusedRef.current = true; searchRef.current?.search(inputValue); }}
        onBlur={() => { isFocusedRef.current = false; dismiss(); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        data-testid="input-address-autocomplete"
      />
      {result.status === 'loading' && (
        <div aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin motion-reduce:animate-none"></div>
        </div>
      )}
      </div>
      <span id={hintId} className="sr-only">Saisissez au moins trois caractères. Utilisez les flèches pour parcourir les suggestions, Entrée pour choisir, Échap pour fermer.{onTextChange ? ' Vous pouvez conserver votre saisie sans sélectionner de suggestion.' : ''}</span>
      {showSuggestions && (
        <ul ref={listRef} id={listId} role="listbox" aria-label="Adresses proposées" className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.properties.label}
              id={`${prefix}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`min-h-11 cursor-pointer w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-gray-100 ${index === activeIndex ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-inset ring-gray-600' : ''}`}
              onMouseDown={event => event.preventDefault()}
              onClick={() => handleSelectSuggestion(suggestion)}
              data-testid={`suggestion-${index}`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">{suggestion.properties.label}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{suggestion.properties.context}</div>
            </li>
          ))}
        </ul>
      )}
      <p role="status" aria-atomic="true" className={result.status === 'ready' || result.status === 'idle' ? 'sr-only' : 'mt-1 text-xs text-gray-700 dark:text-gray-200'}>
        {result.status === 'loading' ? 'Recherche d’adresses…'
          : result.status === 'empty' ? (onTextChange ? 'Aucune suggestion. Vous pouvez conserver l’adresse saisie.' : 'Aucune suggestion. Précisez la rue et la commune.')
          : result.status === 'error' ? (onTextChange ? 'Suggestions indisponibles. Vous pouvez saisir votre adresse et continuer.' : 'Suggestions indisponibles. Réessayez dans un instant.')
          : result.status === 'ready' ? `${suggestions.length} adresse${suggestions.length > 1 ? 's' : ''} proposée${suggestions.length > 1 ? 's' : ''}.` : ''}
      </p>
    </div>
  );
}
