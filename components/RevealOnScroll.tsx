"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Apparition des sections au défilement.
 *
 * Trois précautions, dans l'ordre d'importance :
 *
 * 1. SANS JAVASCRIPT, RIEN N'EST MASQUÉ. L'état caché est porté par la classe
 *    `.anim` posée sur <html> par un script en <head> (voir app/layout.tsx).
 *    Sans JS — donc pour un robot d'indexation qui n'exécute rien — la classe
 *    n'existe pas et toutes les sections sont visibles. Une page dont le
 *    contenu naît en opacity:0 est une page vide pour Google.
 *
 * 2. CE QUI EST DÉJÀ À L'ÉCRAN AU CHARGEMENT N'EST PAS ANIMÉ. Animer le haut de
 *    page retarderait le plus grand contenu affiché (LCP) et se verrait comme
 *    un clignotement. La première passe marque ces sections visibles avec les
 *    transitions coupées.
 *
 * 3. `prefers-reduced-motion` est respecté à deux niveaux : le script du <head>
 *    ne pose pas `.anim`, et la feuille de style neutralise l'effet si la
 *    préférence change après le chargement.
 *
 * Aucune page n'a besoin d'être modifiée : le sélecteur vise les sections de
 * premier niveau, en sautant la première de chaque page — c'est le Hero.
 */

const CIBLES = "main > section:nth-of-type(n+2), main > div > section";

export default function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    // Prévenir tout de suite le garde-fou du <head>, avant le moindre retour
    // anticipé : sinon il retire `.anim` au bout de 3 s et l'effet ne joue plus.
    document.body.dataset.revealPret = "1";

    const anime = document.documentElement.classList.contains("anim");

    // Volontairement SANS IntersectionObserver. Le mode de défaillance d'une
    // apparition au défilement, c'est une page blanche sous la ligne de
    // flottaison : il ne doit dépendre d'aucune API dont l'absence ou le
    // silence laisserait le contenu invisible. Une poignée d'éléments par page
    // (dix au maximum) : mesurer leur position à chaque trame utile ne coûte
    // rien, et se vérifie.
    const SEUIL = 0.92; // le haut de la section doit franchir 92 % de la fenêtre
    let restantes: HTMLElement[] = [];
    let planifie = false;

    function connues() {
      return new Set(restantes);
    }

    function verifier() {
      planifie = false;
      if (!restantes.length) return;
      const limite = window.innerHeight * SEUIL;
      const encore: HTMLElement[] = [];
      for (const el of restantes) {
        if (el.getBoundingClientRect().top < limite) el.classList.add("vu");
        else encore.push(el);
      }
      restantes = encore;
    }

    function planifier() {
      if (planifie) return;
      planifie = true;
      requestAnimationFrame(verifier);
    }

    function balayer() {
      const deja = connues();
      const nouvelles = Array.from(document.querySelectorAll<HTMLElement>(CIBLES))
        .filter((el) => !el.classList.contains("vu") && !deja.has(el));
      if (!nouvelles.length) return;

      if (!anime) {
        nouvelles.forEach((el) => el.classList.add("vu"));
        return;
      }

      // Ce qui est déjà à l'écran apparaît sans rejouer l'animation.
      const limite = window.innerHeight * SEUIL;
      const immediates: HTMLElement[] = [];
      for (const el of nouvelles) {
        if (el.getBoundingClientRect().top < limite) {
          el.classList.add("sans-transition", "vu");
          immediates.push(el);
        } else {
          restantes.push(el);
        }
      }
      if (immediates.length) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            immediates.forEach((el) => el.classList.remove("sans-transition"))
          )
        );
      }
    }

    balayer();

    // Le rendu est diffusé en flux et certaines routes ont une frontière
    // Suspense : <main> peut n'exister qu'après ce premier effet. On surveille
    // donc l'arrivée des sections plutôt que de supposer qu'elles sont là.
    const surveillant = new MutationObserver(() => {
      balayer();
      planifier();
    });
    surveillant.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", planifier);

    return () => {
      surveillant.disconnect();
      window.removeEventListener("scroll", planifier);
      window.removeEventListener("resize", planifier);
    };
  }, [pathname]);

  return null;
}
