"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import Section from "@/components/Section";
import HomeSeoJsonLd from "@/components/HomeSeoJsonLd";

const GoogleReviews = dynamic(() => import("@/components/GoogleReviews"), { 
  ssr: false,
  loading: () => <div className="text-center py-8 opacity-50">Chargement des avis...</div>
});

type TabType = 'immobilier' | 'patrimoine';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('immobilier');

  return (
    <main>
      {/* HERO vert */}
      <section className="bg-luxe text-white">
        <div className="container py-8 md:py-12 min-h-[360px] md:min-h-[380px] flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl luxe text-cream">Lemeille Patrimoine</h1>
          <p className="mt-3 max-w-2xl text-cream/90">
            Agence immobilière haut de gamme — transaction dans l&apos;ancien (Paris, Normandie, Côte d&apos;Azur)
            et gestion de patrimoine sur mesure. Défiscalisation : Malraux, Monument Historique, Déficit Foncier.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button 
              onClick={() => setActiveTab('immobilier')}
              className={`btn ${activeTab === 'immobilier' ? 'btn-gold' : 'btn-ghost'}`}
              data-testid="button-immobilier"
            >
              Immobilier
            </button>
            <button 
              onClick={() => setActiveTab('patrimoine')}
              className={`btn ${activeTab === 'patrimoine' ? 'btn-gold' : 'btn-ghost'}`}
              data-testid="button-patrimoine"
            >
              Gestion de patrimoine
            </button>
          </div>
        </div>
      </section>

      {/* Contenu Immobilier */}
      {activeTab === 'immobilier' && (
        <>
          {/* Engagements Immobilier */}
          <Section title="Nos engagements immobiliers" subtitle="Sélection rigoureuse, accompagnement sur-mesure, confidentialité.">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                ["Sélection de qualité","Biens vérifiés, diagnostics et potentiel de valorisation."],
                ["Conseil indépendant","Alignement d'intérêts, honoraires transparents."],
                ["Discrétion","Mandats off-market, confidentialité totale."],
                ["Réseau d'experts","Notaires, banques privées, architectes, entrepreneurs."],
                ["Réactivité","Retour sous 48h, suivi jusqu'à la signature."],
                ["Expertise locale","Connaissance approfondie de Paris, Normandie et Côte d'Azur."]
              ].map(([t, s], i)=>(
                <div key={i} className="card p-6">
                  <div className="luxe text-xl mb-2">{t}</div>
                  <p className="opacity-80">{s}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Démarche d'achat */}
          <Section title="Notre démarche d'acquisition">
            <ol className="grid md:grid-cols-4 gap-6 list-decimal pl-6">
              {[
                ["Brief & critères","Budget, localisation, surface, objectifs d'investissement."],
                ["Sélection & visites","Présentation de biens ciblés, visites accompagnées."],
                ["Négociation","Défense de vos intérêts, analyse juridique et technique."],
                ["Signature & suivi","Accompagnement notarial, financement, travaux."]
              ].map(([t,s],i)=>(
                <li key={i} className="card p-6">
                  <div className="luxe text-xl mb-2">{t}</div>
                  <p className="opacity-80 break-words">{s}</p>
                </li>
              ))}
            </ol>
          </Section>

          {/* Secteurs */}
          <Section title="Secteurs d'intervention">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                ["Paris","Rive gauche, Ouest, Centre historique • Immeubles haussmanniens, hôtels particuliers, appartements familiaux.","/immobilier"],
                ["Normandie","Rouen, Mont-Saint-Aignan, Bois-Guillaume • Résidentiel recherché, maisons et appartements de caractère.","/immobilier"],
                ["Côte d'Azur","Saint-Aygulf, Fréjus, Sainte-Maxime, Estérel • Villas de standing, vue mer, environnement préservé.","/immobilier"]
              ].map(([t,s,href],i)=>(
                <Link key={i} href={href} className="card p-6 block hover:border-[#B89C6D] transition" data-testid={`link-sector-${i}`}>
                  <div className="luxe text-xl mb-2">{t}</div>
                  <p className="opacity-80 text-sm">{s}</p>
                </Link>
              ))}
            </div>

            {/* Bouton vers la page des biens */}
            <div className="mt-8 text-center">
              <Link
                href="/immobilier"
                className="btn btn-gold inline-flex items-center gap-2"
                data-testid="button-voir-biens"
              >
                Découvrir tous nos biens
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </Section>
        </>
      )}

      {/* Contenu Gestion de Patrimoine */}
      {activeTab === 'patrimoine' && (
        <>
          {/* Services patrimoniaux */}
          <Section title="Nos services patrimoniaux" subtitle="Optimisation fiscale, transmission et valorisation de votre patrimoine.">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                ["Défiscalisation immobilière","Malraux, Monument Historique, Déficit Foncier."],
                ["Optimisation fiscale","Réduction d'impôt, IFI, plus-values immobilières."],
                ["Transmission patrimoniale","Donation, démembrement, SCI familiale."],
                ["Investissement locatif","LMNP, Pinel, optimisation des rendements."],
                ["Conseil en placement","Diversification, allocation d'actifs, stratégie long terme."],
                ["Accompagnement global","Bilan patrimonial, projections, mise en œuvre."]
              ].map(([t, s], i)=>(
                <div key={i} className="card p-6">
                  <div className="luxe text-xl mb-2">{t}</div>
                  <p className="opacity-80">{s}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Démarche patrimoniale */}
          <Section title="Notre démarche patrimoniale">
            <ol className="grid md:grid-cols-4 gap-6 list-decimal pl-6">
              {[
                ["Audit patrimonial","Bilan complet : actifs, fiscalité, objectifs, famille."],
                ["Stratégie sur-mesure","Scénarios d'optimisation, simulations fiscales."],
                ["Mise en œuvre","Sélection de solutions, montages juridiques et fiscaux."],
                ["Suivi & ajustement","Veille réglementaire, adaptation aux évolutions."]
              ].map(([t,s],i)=>(
                <li key={i} className="card p-6">
                  <div className="luxe text-xl mb-2">{t}</div>
                  <p className="opacity-80 break-words">{s}</p>
                </li>
              ))}
            </ol>
          </Section>

          {/* Programmes de défiscalisation */}
          <Section title="Programmes de défiscalisation">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                ["Loi Malraux","Réduction d'impôt jusqu'à 30% sur travaux de restauration en secteur sauvegardé."],
                ["Monument Historique","Déduction fiscale intégrale des travaux, sans plafonnement de ressources."],
                ["Déficit Foncier","Imputation sur le revenu global jusqu'à 10 700€/an, report possible."]
              ].map(([t, s], i)=>(
                <div key={i} className="card p-6">
                  <div className="luxe text-xl mb-2">{t}</div>
                  <p className="opacity-80 text-sm">{s}</p>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Avis Google */}
      <Section title="Ils nous font confiance">
        <GoogleReviews />
      </Section>

      {/* À propos - Arthur Lemeille */}
      <Section title="Qui suis-je ?">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Photo */}
          <div className="order-2 md:order-1">
            <Image 
              src="/images/arthur-lemeille.jpg" 
              alt="Arthur Lemeille - Fondateur de Lemeille Patrimoine" 
              width={665}
              height={998}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="w-full h-auto rounded-lg shadow-lg"
              priority
              quality={85}
              data-testid="img-arthur-lemeille"
            />
          </div>
          
          {/* Texte */}
          <div className="order-1 md:order-2">
            <h3 className="luxe text-2xl md:text-3xl mb-4 text-luxe">Arthur Lemeille</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Arthur Lemeille</strong> est le fondateur de Lemeille Patrimoine. Il débute sa carrière par 3 ans de conseil en Supply Chain/Logistique, où il apprend la précision des processus et la culture du résultat. Il poursuit 3 ans en développement commercial au sein d&apos;une start-up, expérience qui forge son goût du terrain, de la négociation et de la création de valeur. Il se spécialise ensuite 5 ans dans l&apos;immobilier, avant d&apos;élargir sa expertise pendant 3 ans en conseil en gestion de patrimoine.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Ce double regard, <em>transaction & stratégie patrimoniale</em>, lui permet d&apos;accompagner ses clients avec une approche globale : analyse, action, suivi. Son engagement tient en trois mots : <strong>proactif, actif, réactif</strong>.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Passionné d&apos;entrepreneuriat, Arthur mobilise un réseau de partenaires (notaires, banquiers, fiscalistes, artisans) pour sécuriser chaque étape, de l&apos;estimation à l&apos;arbitrage, et transforme les objectifs en décisions efficaces—au service d&apos;un patrimoine pensé sur le long terme.
            </p>
          </div>
        </div>
      </Section>

      {/* SEO JSON-LD */}
      <HomeSeoJsonLd />
    </main>
  );
}
