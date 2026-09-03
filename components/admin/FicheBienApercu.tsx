"use client";
import { useToast } from "@/components/Toast";
import type { Bien } from "@/lib/typesBien";

/**
 * Aperçu en lecture seule d'un bien, côté admin.
 *
 * Extrait de app/admin/contenu/biens/page.tsx le 3 septembre 2026 : la page
 * liste embarquait cet aperçu ET le formulaire d'édition, soit 2 227 lignes en
 * un seul fichier. Ce composant sert désormais à deux endroits — le panneau
 * dépliant de la liste, et la page /admin/contenu/biens/[id] qui donne à chaque
 * bien sa propre adresse.
 *
 * `onClose` n'est fourni que par la liste : sur la page dédiée, il n'y a rien
 * à refermer.
 */
export default function FicheBienApercu({
  bien,
  onClose,
}: {
  bien: Bien;
  onClose?: () => void;
}) {
  const toast = useToast();

const openDocument = (url: string) => {
    if (url.startsWith('data:')) {
      // Convertir Base64 en blob URL pour les documents encodés
      try {
        const [header, base64Data] = url.split(',');
        const mimeMatch = header.match(/data:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        
        // Ouvrir dans un nouvel onglet
        window.open(blobUrl, '_blank');
        
        // Nettoyer l'URL après un délai
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (error) {
        console.error('Erreur de conversion Base64:', error);
        toast('❌ Erreur lors de l\'ouverture du document');
      }
    } else {
      // URL externe - ouvrir directement
      window.open(url, '_blank');
    }
  };

  return (
    <div className="card p-6 mb-6" data-testid="view-property">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Fiche complète - {bien.title}</h2>
              <button
                onClick={() => onClose?.()}
                className="px-4 py-2 border rounded hover:bg-gray-50"
                data-testid="button-close-view"
              >
                Fermer
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Colonne gauche */}
              <div className="space-y-6">
                {/* Informations générales */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Informations générales</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type :</span>
                      <span className="font-medium">{bien.type === 'APPARTEMENT' ? 'Appartement' : 'Maison'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ville :</span>
                      <span className="font-medium">{bien.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Région :</span>
                      <span className="font-medium">{bien.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prix :</span>
                      <span className="font-medium text-[#B89C6D]">{bien.priceOnRequest ? 'Nous consulter' : `${bien.price.toLocaleString('fr-FR')} €`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Surface :</span>
                      <span className="font-medium">{bien.surface} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pièces :</span>
                      <span className="font-medium">{bien.rooms}</span>
                    </div>
                    {bien.landSize && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Terrain :</span>
                        <span className="font-medium">{bien.landSize} m²</span>
                      </div>
                    )}
                    {bien.annexSurface && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Surface hors Carrez :</span>
                        <span className="font-medium">{bien.annexSurface} m²</span>
                      </div>
                    )}
                    {bien.propertyTaxAmount ? (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxe foncière :</span>
                        <span className="font-medium">{bien.propertyTaxAmount.toLocaleString('fr-FR')} €/an</span>
                      </div>
                    ) : null}
                    {bien.coproChargesMonthly ? (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Charges copropriété :</span>
                        <span className="font-medium">{bien.coproChargesMonthly.toLocaleString('fr-FR')} €/mois</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Référence :</span>
                      <span className="font-medium">{bien.id}</span>
                    </div>
                    {bien.cadastralReference && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parcelle cadastrale :</span>
                        <span className="font-medium">{bien.cadastralReference}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Description</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{bien.description}</p>
                </div>

                {/* Prestations */}
                {bien.features && bien.features.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">Prestations</h3>
                    <div className="flex flex-wrap gap-2">
                      {bien.features.map((feature, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white border rounded-lg text-sm">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* DPE */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Diagnostic de Performance Énergétique</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Classe énergie :</span>
                      <span className="font-medium">{bien.dpe.classEnergy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Classe GES :</span>
                      <span className="font-medium">{bien.dpe.classGES}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Consommation :</span>
                      <span className="font-medium">{bien.dpe.consumptionKwh} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Émissions :</span>
                      <span className="font-medium">{bien.dpe.emissionsKg} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date :</span>
                      <span className="font-medium">{bien.dpe.date}</span>
                    </div>
                  </div>
                </div>

                {/* Configuration carte */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Configuration carte</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Précision :</span>
                      <span className="font-medium">{bien.map.precision === 'EXACT' ? 'Exacte' : 'Zone'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zoom :</span>
                      <span className="font-medium">{bien.map.zoom}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Requête :</span>
                      <p className="font-medium text-xs mt-1 break-words">{bien.map.query}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne droite */}
              <div className="space-y-6">
                {/* Images */}
                {bien.images && bien.images.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">Images ({bien.images.length})</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {bien.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img}
                            alt={`Image ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          {idx === 0 && (
                            <span className="absolute top-2 left-2 bg-[#B89C6D] text-white text-xs px-2 py-1 rounded">
                              Principale
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents administratifs */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Documents administratifs</h3>
                  {(() => {
                    const docs = [];
                
                    if (bien.titleDeed) docs.push({ name: "Titre de propriété", url: bien.titleDeed });
                    if (bien.dpeDocument) docs.push({ name: "Document DPE", url: bien.dpeDocument });
                    if (bien.propertyTax) docs.push({ name: "Taxe foncière", url: bien.propertyTax });
                    if (bien.mandate) docs.push({ name: "Mandat", url: bien.mandate });
                    if (bien.estimation) docs.push({ name: "Estimation", url: bien.estimation });
                    {
                      const vplans = (Array.isArray(bien.floorPlans) && bien.floorPlans.length)
                        ? bien.floorPlans
                        : (bien.floorPlan ? [bien.floorPlan] : []);
                      vplans.forEach((plan: string, idx: number) => {
                        docs.push({ name: vplans.length > 1 ? `Plan ${idx + 1}` : "Plan du bien", url: plan });
                      });
                    }

                    if (bien.type === 'APPARTEMENT') {
                      if (bien.propertyRules) docs.push({ name: "Règlement de propriété", url: bien.propertyRules });
                      if (bien.chargesStatement) docs.push({ name: "Relevé de charges", url: bien.chargesStatement });
                      if (Array.isArray(bien.agMinutes) && bien.agMinutes.length > 0) {
                        bien.agMinutes.forEach((doc: string, idx: number) => {
                          docs.push({ name: `PV d'AG ${idx + 1}`, url: doc });
                        });
                      }
                    }
                
                    if (docs.length === 0) {
                      return (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Aucun document disponible
                        </p>
                      );
                    }
                
                    return (
                      <div className="space-y-2">
                        {docs.map((doc, idx) => (
                          <div
                            key={idx}
                            className="p-3 border bg-white rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📄</span>
                                <span className="text-sm font-medium">{doc.name}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openDocument(doc.url)}
                                className="flex-1 px-3 py-2 text-sm border border-[#B89C6D] text-[#B89C6D] rounded hover:bg-[#B89C6D] hover:text-white transition text-center"
                                data-testid={`button-read-document-${idx}`}
                              >
                                👁️ Lire
                              </button>
                              <a
                                href={doc.url}
                                download
                                className="flex-1 px-3 py-2 text-sm bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D] transition text-center"
                                data-testid={`button-download-document-${idx}`}
                              >
                                ⬇️ Télécharger
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
  );
}
