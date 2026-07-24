'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function Header(){
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-black/5 bg-white/60 backdrop-blur sticky top-0 z-40">
      <div className="container py-3 flex items-center justify-between">
        <Link href="/" className="logo-group" data-testid="link-home">
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
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link href="/immobilier" data-testid="link-immobilier">Immobilier</Link>
          <Link href="/patrimoine" data-testid="link-patrimoine">Gestion de patrimoine</Link>
          <Link href="/programmes" data-testid="link-programmes">Programmes</Link>
          <Link href="/actualites" data-testid="link-actualites">Actualités</Link>
          <Link href="/avis" data-testid="link-avis">Avis</Link>
          <Link href="/contact" data-testid="link-contact">Contact</Link>
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
            <Link
              href="/immobilier"
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-immobilier"
            >
              Immobilier
            </Link>
            <Link
              href="/patrimoine"
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-patrimoine"
            >
              Gestion de patrimoine
            </Link>
            <Link
              href="/programmes"
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-programmes"
            >
              Programmes
            </Link>
            <Link
              href="/actualites"
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-actualites"
            >
              Actualités
            </Link>
            <Link
              href="/avis"
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-avis"
            >
              Avis
            </Link>
            <Link
              href="/contact"
              className="py-2 text-base"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-contact"
            >
              Contact
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
