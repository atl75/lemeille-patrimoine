import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Mentions légales | Lemeille Patrimoine",
  description: "Mentions légales de Lemeille Patrimoine : éditeur, hébergement, responsabilité et propriété intellectuelle.",
  alternates: {
    canonical: '/mentions-legales'
  }
};

export default function Page(){
  return (
    <main>
      <Hero title="Mentions légales" subtitle="Informations relatives à l'éditeur et à l'hébergement du site." />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Mentions légales"}]} />
      </section>
      <section className="container pb-14">
        <div className="prose max-w-none">
        <h2 className="luxe text-2xl">Éditeur</h2>
        <p><strong>Lemeille Patrimoine</strong>, marque du groupe <strong>Novus Capital</strong> (SAS, SIREN 937 847 937).<br/>
        Siège social : 50 rue de la Garenne, 76130 Mont-Saint-Aignan.<br/>
        Bureaux : 35 rue Ganterie, 76000 Rouen.<br/>
        Représentant légal : Arthur Lemeille.</p>

        <h2 className="luxe text-2xl mt-8">Carte professionnelle (transaction immobilière)</h2>
        <p>Activité de <strong>transactions sur immeubles et fonds de commerce</strong> (loi n° 70-9 du 2 janvier 1970), exercée par Novus Capital, titulaire de la carte professionnelle :</p>
        <ul>
          <li>Carte professionnelle n° <strong>CPI 7606 2024 000 000 038</strong></li>
          <li>Délivrée par la <strong>CCI de Rouen Métropole</strong>, valable jusqu&apos;au <strong>12/12/2027</strong></li>
          <li><strong>Garantie financière</strong> : non-détention de fonds — l&apos;agence ne reçoit ni ne détient de fonds pour le compte de ses clients (absence de garantie financière requise à ce titre).</li>
          <li><strong>Assurance de responsabilité civile professionnelle</strong> : Zurich Insurance Europe AG, 112 avenue de Wagram, 75017 Paris.</li>
        </ul>

        <h2 className="luxe text-2xl mt-8">Conseil en investissements financiers (CIF)</h2>
        <p><strong>Arthur Lemeille</strong> est immatriculé au registre unique des intermédiaires en assurance, banque et finance (<strong>ORIAS</strong>) en qualité de <strong>Conseiller en investissements financiers (CIF)</strong> :</p>
        <ul>
          <li>N° d&apos;immatriculation ORIAS : <strong>23&nbsp;003&nbsp;614</strong></li>
          <li>Inscrit en tant que CIF depuis le 28/06/2024.</li>
          <li>Membre de l&apos;<strong>ANACOFI-CIF</strong> (Association Nationale des Conseils Financiers), association professionnelle agréée par l&apos;Autorité des marchés financiers (AMF).</li>
          <li>Immatriculation vérifiable sur <a href="https://www.orias.fr" target="_blank" rel="noopener noreferrer" className="underline">www.orias.fr</a> — <a href="https://www.orias.fr/home/showIntermediaire/890230337" target="_blank" rel="noopener noreferrer" className="underline">consulter la fiche</a>.</li>
        </ul>
        <p>L&apos;activité de conseil en investissements financiers est soumise au contrôle de l&apos;Autorité des marchés financiers (AMF).</p>

        <h2 className="luxe text-2xl mt-8">Hébergement</h2>
        <p>Application hébergée sur Google Cloud Platform (Google Cloud Run, région europe-west1). Le nom de domaine est géré par Squarespace Domains II LLC.</p>

        <h2 className="luxe text-2xl mt-8">Responsabilité</h2>
        <p>Les informations publiées sont fournies à titre indicatif et ne sauraient se substituer à un conseil personnalisé.</p>

        <h2 className="luxe text-2xl mt-8">Propriété intellectuelle</h2>
        <p>Contenus et éléments graphiques © Lemeille Patrimoine. Toute reproduction non autorisée est interdite.</p>

        <h2 className="luxe text-2xl mt-8">Contact</h2>
        <p>Pour toute question, utilisez le formulaire de <Link href="/contact" className="underline">contact</Link>.</p>
        </div>
      </section>
    </main>
  );
}
