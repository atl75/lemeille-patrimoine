import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Politique de confidentialité | Lemeille Patrimoine",
  description: "Politique de confidentialité de Lemeille Patrimoine concernant le traitement et la protection de vos données personnelles.",
  alternates: {
    canonical: '/politique-de-confidentialite'
  }
};

export default function Page(){
  return (
    <main className="container py-12">
      <h1 className="luxe text-4xl mb-4">Politique de confidentialité</h1>
      <p className="opacity-80">Nous ne collectons que les informations nécessaires au traitement de votre demande. Vous pouvez exercer vos droits à tout moment via la page Contact.</p>
    </main>
  );
}
