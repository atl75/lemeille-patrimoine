'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Header(){
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-black/5 bg-white/60 backdrop-blur sticky top-0 z-40">
      <div className="container py-3 flex items-center justify-between">
        <a href="/" className="logo-group" data-testid="link-home">
          <svg xmlns="http://www.w3.org/2000/svg" width="280" height="64" viewBox="0 0 280 64" role="img" aria-label="Lemeille Patrimoine" className="h-10 w-auto">
            <defs>
              <style>{`.serif { font-family: Georgia, "Times New Roman", Times, serif; } .logo-text { display: none; } @media (min-width: 768px) { .logo-text { display: block; } }`}</style>
            </defs>
            <circle cx="32" cy="32" r="26" fill="none" stroke="#8A6D3F" strokeWidth="2"/>
            <text x="32" y="39" className="serif" fontSize="22" textAnchor="middle" fill="#8A6D3F">LP</text>
            <text x="72" y="40" className="serif logo-text" fontSize="22" fill="#1F3B2C" letterSpacing=".4">
              Lemeille Patrimoine
            </text>
          </svg>
        </a>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <a href="/immobilier" data-testid="link-immobilier">Immobilier</a>
          <a href="/patrimoine" data-testid="link-patrimoine">Gestion de patrimoine</a>
          <a href="/programmes" data-testid="link-programmes">Programmes</a>
          <a href="/contact" data-testid="link-contact">Contact</a>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2"
          aria-label="Toggle menu"
          data-testid="button-mobile-menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-[#1F3B2C]" />
          ) : (
            <Menu className="h-6 w-6 text-[#1F3B2C]" />
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-black/5 bg-white">
          <nav className="container py-4 flex flex-col gap-4">
            <a 
              href="/immobilier" 
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-immobilier"
            >
              Immobilier
            </a>
            <a 
              href="/patrimoine" 
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-patrimoine"
            >
              Gestion de patrimoine
            </a>
            <a 
              href="/programmes" 
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-programmes"
            >
              Programmes
            </a>
            <a 
              href="/contact" 
              className="py-2 text-base"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-contact"
            >
              Contact
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
