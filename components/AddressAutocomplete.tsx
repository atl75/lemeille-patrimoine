"use client";
import { useState, useEffect, useRef } from "react";

type AddressSuggestion = {
  properties: {
    label: string;
    city: string;
    postcode: string;
    citycode: string;
    context: string;
  };
  geometry: {
    coordinates: [number, number];
  };
};

type AddressComponents = {
  address: string;
  city: string;
  region: string;
};

type Props = {
  value: string;
  onChange: (components: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  // Optionnel : remonte le texte brut à chaque frappe (pour conserver une saisie
  // libre non issue d'une suggestion). onChange reste déclenché à la sélection.
  onTextChange?: (text: string) => void;
};

export default function AddressAutocomplete({ value, onChange, placeholder, className, onTextChange }: Props) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isFocusedRef = useRef(false);

  // Synchronise depuis la valeur externe UNIQUEMENT quand le champ n'est pas en
  // cours d'édition — sinon, avec onTextChange, chaque frappe met à jour le
  // parent qui réécrase la saisie (curseur qui saute, caractères perdus).
  useEffect(() => {
    if (isFocusedRef.current) return;
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=8&autocomplete=1`
      );
      const data = await response.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresse:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onTextChange?.(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const region = suggestion.properties.context.includes('Île-de-France') || suggestion.properties.context.includes('Paris') 
      ? 'PARIS'
      : suggestion.properties.context.includes('Normandie')
      ? 'NORMANDIE'
      : 'COTE_D_AZUR';

    // Extraction automatique de l'arrondissement pour Paris
    let cityValue = suggestion.properties.city;
    const postcode = suggestion.properties.postcode;
    
    // Si c'est Paris (code postal 75001 à 75020)
    if (postcode && postcode.match(/^75(\d{3})$/)) {
      const arrondissement = parseInt(postcode.substring(2)); // Extraire les 3 derniers chiffres
      if (arrondissement >= 1 && arrondissement <= 20) {
        cityValue = `Paris ${arrondissement}e`;
      }
    }

    setInputValue(suggestion.properties.label);
    onChange({
      address: suggestion.properties.label,
      city: cityValue,
      region: region
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        aria-label="Adresse"
        className={className}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => { isFocusedRef.current = true; }}
        onBlur={() => { isFocusedRef.current = false; }}
        placeholder={placeholder}
        autoComplete="off"
        data-testid="input-address-autocomplete"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-gray-100"
              onClick={() => handleSelectSuggestion(suggestion)}
              data-testid={`suggestion-${index}`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">{suggestion.properties.label}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{suggestion.properties.context}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
