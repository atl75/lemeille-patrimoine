'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function Header(){
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const fermer = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileMenuOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener('keydown', fermer);
    return () => document.removeEventListener('keydown', fermer);
  }, [mobileMenuOpen]);

  return (
    <header className="border-b border-black/5 bg-white/60 backdrop-blur sticky top-0 z-40">
      <div className="container py-3 flex items-center justify-between gap-2">
        <Link href="/" className="logo-group" data-testid="link-home" onClick={() => setMobileMenuOpen(false)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="280" height="64" viewBox="0 0 280 64" role="img" aria-label="Lemeille Patrimoine" className="h-auto w-[140px] sm:w-[175px]">
            <defs>
              <style>{`.serif { font-family: Georgia, "Times New Roman", Times, serif; }`}</style>
            </defs>
            <circle cx="32" cy="32" r="26" fill="none" stroke="#B89C6D" strokeWidth="2"/>
            <text x="32" y="39" className="serif" fontSize="22" textAnchor="middle" fill="#B89C6D">LP</text>
            <text x="72" y="40" className="serif logo-text" fontSize="22" fill="#1F3B2C" letterSpacing=".4">
              Lemeille Patrimoine
            </text>
          </svg>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Navigation principale" className="hidden lg:flex items-center gap-4 text-sm">
          <Link href="/vendre" data-testid="link-vendre">Vendre</Link>
          <Link href="/immobilier" data-testid="link-immobilier">Nos Biens</Link>
          <Link href="/financement" data-testid="link-financement">Financement</Link>
          <Link href="/programmes" data-testid="link-programmes">Défiscalisation</Link>
          <Link href="/actualites" data-testid="link-actualites">Actualités</Link>
          <Link href="/contact" data-testid="link-contact">Contact</Link>
        </nav>

        <Link href="/immobilier/estimation#estimation" className="btn btn-gold min-h-[44px] !px-3 !py-2 text-sm whitespace-nowrap ml-auto lg:ml-0" data-testid="link-header-estimation" onClick={() => setMobileMenuOpen(false)}>
          <span className="sm:hidden">Estimer</span>
          <span className="hidden sm:inline">Estimer mon bien</span>
        </Link>

        {/* Mobile Menu Button */}
        <button 
          type="button"
          ref={menuButton}
          onClick={() => setMobileMenuOpen(open => !open)}
          className="lg:hidden p-2 min-h-[44px] min-w-[44px]"
          aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
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
        <div id="mobile-navigation" hidden={!mobileMenuOpen} className="lg:hidden border-t border-black/5 bg-white">
          <nav aria-label="Navigation mobile" className="container py-4 flex flex-col gap-4">
            <Link
              href="/vendre"
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-vendre"
            >
              Vendre
            </Link>
            <Link
              href="/immobilier"
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-immobilier"
            >
              Nos Biens
            </Link>
            <Link
              href="/financement"
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-financement"
            >
              Financement
            </Link>
            <Link
              href="/programmes"
              className="py-2 text-base border-b border-black/5"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-programmes"
            >
              Défiscalisation
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
              href="/contact"
              className="py-2 text-base"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="link-mobile-contact"
            >
              Contact
            </Link>
          </nav>
        </div>
    </header>
  );
}
