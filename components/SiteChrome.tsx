"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import CtaBand from "@/components/CtaBand";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import ChatWidget from "@/components/ChatWidget";

// Affiche l'habillage du site (en-tête, pied, boutons flottants) sauf sur les
// pages « épurées » comme la signature de mandat, qui doivent ressembler à un
// document contractuel sans distraction.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const bare = pathname.startsWith("/mandat/signer");

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
      <Header />
      {children}
      {!noCta && <CtaBand />}
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
    </>
  );
}
