"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import CtaBand from "@/components/CtaBand";
import { WhatsAppButton } from "@/components/WhatsAppButton";
// Le chatbot est secondaire pour l’acquisition vendeur. Le charger après le
// shell initial évite d’ajouter son état, ses icônes et sa logique au premier
// paquet hydraté sur mobile ; le bouton reste disponible dès que le chunk est
// prêt. Les soumissions du formulaire n’en dépendent pas.
const ChatWidget = dynamic(() => import("@/components/ChatWidget"), { ssr: false, loading: () => null });
import { useAudiencePreferences } from '@/components/AnalyticsProvider';

// Affiche l'habillage du site (en-tête, pied, boutons flottants) sauf sur les
// pages « épurées » comme la signature de mandat, qui doivent ressembler à un
// document contractuel sans distraction.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { noticeVisible } = useAudiencePreferences();
  const bare = pathname.startsWith("/mandat/signer");
  const [formulaireVisible, setFormulaireVisible] = useState(false);
  useEffect(() => {
    setFormulaireVisible(false);
    const formulaires = document.querySelectorAll('main #estimation, main #form');
    if (!formulaires.length) return;
    const visibles = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibles.add(entry.target);
        else visibles.delete(entry.target);
      }
      setFormulaireVisible(visibles.size > 0);
    });
    formulaires.forEach(formulaire => observer.observe(formulaire));
    return () => observer.disconnect();
  }, [pathname]);

  if (bare) return <>{children}</>;

  // Bloc CTA de bas de page sur les pages publiques internes — pas sur
  // l'accueil (déjà des CTA), la page contact (redondant), ni l'admin.
  const noCta =
    pathname === "/" ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/debug-immobilier");

  return (
    <>
      <a href="#contenu-principal" className="skip-link">Aller au contenu</a>
      <Header />
      <div id="contenu-principal" tabIndex={-1}>{children}</div>
      {!noCta && <CtaBand />}
      <Footer />
      {/* Sur mobile, laisser toute la largeur aux champs et aux boutons du formulaire. */}
      <div role="region" aria-label="Contact rapide" className={noticeVisible ? "hidden" : formulaireVisible ? "hidden md:block" : undefined}>
        <WhatsAppButton />
        <ChatWidget />
      </div>
    </>
  );
}
