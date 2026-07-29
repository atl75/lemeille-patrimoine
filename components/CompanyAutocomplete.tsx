"use client";

import { useState, useEffect, useRef } from "react";

interface Company {
  siren: string;
  name: string;
  address: string;
  activity: string;
  isActive: boolean;
  legalForm?: string;
  managerFirstName?: string;
  managerLastName?: string;
  managerRole?: string;
}

interface CompanyAutocompleteProps {
  value: string;
  onSelect: (company: Company) => void;
  label?: string;
}

export default function CompanyAutocomplete({ value, onSelect, label = "Raison sociale" }: CompanyAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);
  const userHasInteractedRef = useRef(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    
    const searchCompanies = async () => {
      if (query.length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      // Ne pas rechercher si on vient de sélectionner une entreprise
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }

      // Ne rechercher que si l'utilisateur a interagi avec le champ
      if (!userHasInteractedRef.current) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/companies?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data = await response.json();
        setResults(data.results || []);
        setShowDropdown(true);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Erreur recherche entreprise:", error);
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCompanies, 300);
    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (company: Company) => {
    justSelectedRef.current = true;
    userHasInteractedRef.current = false;
    setQuery(company.name);
    setShowDropdown(false);
    setResults([]);
    onSelect(company);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    userHasInteractedRef.current = true;
    setQuery(e.target.value);
  };

  return (
    <div className="relative">
      <label htmlFor="company-search" className="block text-sm font-medium mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="company-search"
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Rechercher une société..."
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#B89C6D] focus:border-transparent"
          data-testid="input-company-search"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-[#B89C6D] border-t-transparent rounded-full" />
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto"
          data-testid="dropdown-company-results"
        >
          {results.map((company, index) => (
            <button
              key={company.siren}
              type="button"
              onClick={() => handleSelect(company)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 flex items-start gap-3"
              data-testid={`button-company-${index}`}
            >
              <svg className="h-5 w-5 text-[#B89C6D] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">{company.name}</p>
                  {company.isActive && (
                    <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-1">
                  SIREN: {company.siren}
                </p>
                {company.address && (
                  <p className="text-xs text-gray-500 truncate">
                    {company.address}
                  </p>
                )}
                {company.activity && (
                  <p className="text-xs text-gray-400 mt-1">
                    {company.activity}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.length >= 2 && !isLoading && results.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-sm text-gray-500"
        >
          Aucune entreprise trouvée
        </div>
      )}
    </div>
  );
}
