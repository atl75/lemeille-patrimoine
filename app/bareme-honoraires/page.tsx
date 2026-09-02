import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import type { Metadata } from 'next';
import BandeauReassurance from "@/components/BandeauReassurance";

export const metadata: Metadata = { 
  title: "Barème d'honoraires immobiliers | Lemeille Patrimoine",
  description: "Découvrez notre barème d'honoraires transparent pour l'achat et la vente de biens immobiliers de prestige. Tarification claire et simple.",
  alternates: {
    canonical: '/bareme-honoraires'
  }
};

export default function Page(){
  return (
    <main>
      <Hero 
        title="Barème d&apos;honoraires immobiliers" 
        subtitle="Une tarification claire et transparente pour vous accompagner dans vos projets immobiliers." 
      />
      <BandeauReassurance />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Barème d&apos;honoraires"}]} />
      </section>

      <section className="container pb-14">
        <div className="prose max-w-none">
        <h2 className="luxe text-2xl">Notre engagement tarifaire</h2>
        <p>
          Chez Lemeille Patrimoine, nous croyons en la transparence. Notre barème d&apos;honoraires pour les 
          <strong> transactions immobilières</strong> (achat et vente de biens) est simple, clair et conçu 
          pour vous offrir le meilleur service au juste prix.
        </p>

        <h2 className="luxe text-2xl mt-8">Barème d&apos;honoraires immobiliers</h2>
        <div className="not-prose bg-[#F4F1EB] border border-[#B89C6D]/20 rounded-lg p-6 my-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border-2 border-[#B89C6D]">
              <div className="text-[#B89C6D] font-semibold mb-2">Prix de vente jusqu&apos;à 150 000€</div>
              <div className="text-3xl font-bold text-[#1F3B2C] luxe">7 500€</div>
              <div className="text-sm text-gray-600 mt-2">Honoraires fixes</div>
            </div>
            <div className="bg-white p-6 rounded-lg border-2 border-[#B89C6D]">
              <div className="text-[#B89C6D] font-semibold mb-2">Prix de vente au-delà de 150 000€</div>
              <div className="text-3xl font-bold text-[#1F3B2C] luxe">5%</div>
              <div className="text-sm text-gray-600 mt-2">Du prix de vente</div>
            </div>
          </div>
        </div>

        <h2 className="luxe text-2xl mt-8">Honoraires à charge acquéreur</h2>
        <p>
          Nos honoraires sont <strong>à charge acquéreur</strong>. Ce choix stratégique vous permet de 
          réaliser une <strong>économie substantielle sur les frais de notaire</strong>.
        </p>

        <div className="not-prose bg-blue-50 border-l-4 border-blue-500 p-4 my-6">
          <div className="flex gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <div className="font-semibold text-blue-900 mb-1">Avantage fiscal pour l&apos;acquéreur</div>
              <p className="text-sm text-blue-800">
                Les frais de notaire sont calculés sur le prix net vendeur (hors honoraires d&apos;agence). 
                Cette approche permet à l&apos;acquéreur de réduire significativement le montant des droits 
                d&apos;enregistrement et des émoluments du notaire.
              </p>
            </div>
          </div>
        </div>

        <h2 className="luxe text-2xl mt-8">Exemple de calcul et gain acquéreur</h2>

        <div className="not-prose my-6 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="font-semibold text-[#1F3B2C] mb-3">Bien à 500 000€</div>
            <div className="grid gap-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Prix net vendeur</span>
                <span className="font-semibold">500 000€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Honoraires agence (5%)</span>
                <span className="font-semibold">25 000€</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Prix FAI (acquéreur)</span>
                <span className="font-bold text-[#B89C6D]">525 000€</span>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
              <div className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <span>💰</span> Gain pour l&apos;acquéreur
              </div>
              <div className="text-xs text-green-800 space-y-1">
                <div className="flex justify-between">
                  <span>Frais de notaire (8% sur 525 000€)</span>
                  <span className="line-through">42 000€</span>
                </div>
                <div className="flex justify-between">
                  <span>Frais de notaire (8% sur 500 000€)</span>
                  <span className="font-semibold">40 000€</span>
                </div>
                <div className="flex justify-between border-t border-green-300 pt-1 mt-1">
                  <span className="font-bold">Économie réalisée</span>
                  <span className="font-bold text-green-700">2 000€</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h2 className="luxe text-2xl mt-8">Services inclus</h2>
        <p className="text-gray-600">Tous nos services sont compris dans nos honoraires, sans frais additionnels.</p>
        <div className="not-prose grid sm:grid-cols-2 gap-3 my-6">
          {[
            "Estimation précise de votre bien",
            "Photographies professionnelles, plan et vidéo",
            "Diffusion sur les principales plateformes immobilières",
            "Organisation et accompagnement des visites",
            "Négociation avec les acquéreurs",
            "Accompagnement jusqu'à la signature chez le notaire",
            "Conseils en optimisation fiscale et patrimoniale",
          ].map((service) => (
            <div key={service} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-4">
              <span className="shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-[#1F3B2C] text-white text-sm" aria-hidden="true">✓</span>
              <span className="text-sm text-gray-800">{service}</span>
            </div>
          ))}
        </div>

        <h2 className="luxe text-2xl mt-8">Questions fréquentes</h2>
        
        <div className="not-prose space-y-4 my-6">
          <details className="bg-white border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer text-[#1F3B2C]">
              Pourquoi les honoraires sont-ils à charge acquéreur ?
            </summary>
            <p className="mt-3 text-sm text-gray-700">
              Cette structure permet à l&apos;acquéreur de réduire les frais de notaire, car ces derniers 
              sont calculés sur le prix net vendeur. C&apos;est un avantage fiscal direct pour l&apos;acheteur, 
              qui peut économiser plusieurs milliers d&apos;euros sur les droits d&apos;enregistrement.
            </p>
          </details>

          <details className="bg-white border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer text-[#1F3B2C]">
              Le barème est-il négociable ?
            </summary>
            <p className="mt-3 text-sm text-gray-700">
              Notre barème est fixe et transparent. Cependant, pour des projets spécifiques ou des 
              portefeuilles immobiliers importants, nous pouvons étudier ensemble une solution adaptée. 
              N&apos;hésitez pas à nous contacter pour en discuter.
            </p>
          </details>

          <details className="bg-white border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold cursor-pointer text-[#1F3B2C]">
              Y a-t-il des frais supplémentaires ?
            </summary>
            <p className="mt-3 text-sm text-gray-700">
              Non, tous nos services sont inclus dans nos honoraires. Pas de frais cachés, pas de 
              suppléments pour les photographies, les annonces ou l&apos;accompagnement. Le prix affiché 
              est le prix final.
            </p>
          </details>
        </div>

        <div className="not-prose bg-[#1F3B2C] text-white rounded-lg p-8 my-8 text-center">
          <h3 className="text-2xl luxe text-cream mb-3">Besoin d&apos;une estimation ?</h3>
          <p className="mb-6 opacity-90">
            Obtenez une évaluation professionnelle de votre bien immobilier gratuitement et sans engagement.
          </p>
          <a 
            href="/immobilier/estimation" 
            className="inline-block bg-[#B89C6D] text-white px-8 py-3 rounded hover:bg-[#A08B5D] transition-colors font-semibold"
            data-testid="link-estimation"
          >
            Estimer mon bien
          </a>
        </div>

        <h2 className="luxe text-2xl mt-8">Contact</h2>
        <p>
          Pour toute question sur notre barème d&apos;honoraires ou pour discuter de votre projet immobilier, 
          n&apos;hésitez pas à nous contacter :
        </p>
        <ul className="not-prose list-none pl-0">
          <li className="mb-2">
            📞 <a href="tel:+33687157259" className="text-[#B89C6D] hover:underline">+33 6 87 15 72 59</a>
          </li>
          <li className="mb-2">
            ✉️ <a href="mailto:arthur.lemeille@lemeillepatrimoine.com" className="text-[#B89C6D] hover:underline">arthur.lemeille@lemeillepatrimoine.com</a>
          </li>
          <li>
            <Link href="/contact" className="text-[#B89C6D] hover:underline">Formulaire de contact</Link>
          </li>
        </ul>
        </div>
      </section>
    </main>
  );
}
