"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import ChatWidget from "@/components/ChatWidget";

// Affiche l'habillage du site (en-tête, pied, boutons flottants) sauf sur les
// pages « épurées » comme la signature de mandat, qui doivent ressembler à un
// document contractuel sans distraction.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname?.startsWith("/mandat/signer");

  if (bare) return <>{children}</>;

  return (
    <>
      <Header />
      {children}
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
    </>
  );
}
