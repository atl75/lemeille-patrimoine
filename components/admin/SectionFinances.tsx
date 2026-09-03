"use client";
import { useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Bien } from "@/lib/typesBien";

/**
 * Prix, finances et génération du mandat.
 *
 * Extrait de FicheBienFormulaire — 396 lignes sur 1 481. C'est le bloc le plus
 * dense du formulaire : net vendeur, prix FAI, commission en pourcentage ou en
 * euros, et le basculement entre les deux modes de calcul.
 *
 * Deux états ne servaient QUE là et l'ont suivi : le mode de calcul et l'état
 * de génération du mandat. L'interface se réduit d'autant — cinq propriétés.
 *
 * Code déplacé à l'identique, comme les extractions précédentes : c'est ce qui
 * rend l'opération vérifiable là où aucun test ne couvre le rendu.
 *
 * Une tentative d'extraire AUSSI le bloc Propriétaires a été annulée le même
 * jour : la détection automatique des bornes coupait au milieu du JSX. Ce
 * découpage-ci a été validé par le typage du premier coup ; l'autre attendra
 * qu'on ait une raison d'ouvrir ce fichier.
 */
export default function SectionFinances({
  bien,
  setBien,
  updateField,
  priceError,
  netError,
}: {
  bien: Partial<Bien>;
  setBien: (maj: (p: Partial<Bien> | null) => Partial<Bien> | null) => void;
  updateField: (champ: string, valeur: any) => void;
  priceError: string;
  netError: string;
}) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [calculationMode, setCalculationMode] = useState<"FROM_NET" | "FROM_FAI">("FROM_NET");
  const [genMandate, setGenMandate] = useState(false);

  const errCls = "text-xs text-red-600 mt-1";
  const editing = bien;
  const setEditing = setBien;

  return (
    <>
      {dialog}
            {/* Prix — dans Informations générales */}
            <div className="mb-3">
              <h3 className="font-semibold text-base mb-2 pb-2 border-b">Prix</h3>
              <label className="flex items-center gap-2 text-sm mb-3">
                <input type="checkbox" checked={!!editing.priceOnRequest} onChange={e => updateField('priceOnRequest', e.target.checked || undefined)} data-testid="input-price-on-request" />
                <span>Prix sur demande — « Nous consulter » (prix à discrétion)</span>
              </label>
              {!editing.priceOnRequest && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="flex justify-between items-center mb-2 pb-2 border-b">
                  <h3 className="font-semibold text-base">Finances</h3>
      
                {/* Sélecteur du mode de calcul */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCalculationMode('FROM_NET')}
                    className={`px-4 py-2 border rounded text-sm font-medium ${calculationMode === 'FROM_NET' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    data-testid="button-calc-from-net"
                  >
                    Net Vendeur → FAI
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalculationMode('FROM_FAI')}
                    className={`px-4 py-2 border rounded text-sm font-medium ${calculationMode === 'FROM_FAI' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    data-testid="button-calc-from-fai"
                  >
                    FAI → Net Vendeur
                  </button>
                </div>
              </div>
    
              <div className="grid md:grid-cols-2 gap-4">
                {/* Premier champ: Net Vendeur OU Prix FAI selon le mode */}
                <div>
                  {calculationMode === 'FROM_NET' ? (
                    <>
                      <label className="block text-sm font-medium mb-1">Montant Net Vendeur (€)</label>
                      <MoneyInput
                        value={editing.netSellerAmount || ''}
                        onChange={(e) => {
                          const netAmount = e.target.value ? parseFloat(e.target.value) : undefined;
                          const updates: any = { netSellerAmount: netAmount };
                
                          // Recalculer la commission et le FAI
                          if (netAmount && netAmount > 0) {
                            if (editing.commissionPercentage && editing.commissionPercentage > 0) {
                              // Si commission en %, calculer le montant absolu et le FAI
                              const commissionAbs = netAmount * (editing.commissionPercentage / 100);
                              updates.commissionAmount = Math.round(commissionAbs);
                              updates.price = Math.round(netAmount + commissionAbs);
                            } else if (editing.commissionAmount && editing.commissionAmount > 0) {
                              // Si commission en €, calculer le % et le FAI
                              const commissionPct = (editing.commissionAmount / netAmount) * 100;
                              updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                              updates.price = Math.round(netAmount + editing.commissionAmount);
                            } else {
                              // Pas de commission, FAI = net vendeur
                              updates.price = Math.round(netAmount);
                              updates.commissionAmount = undefined;
                              updates.commissionPercentage = undefined;
                            }
                          } else {
                            // Nettoyer tout si pas de montant valide
                            updates.commissionAmount = undefined;
                            updates.commissionPercentage = undefined;
                            updates.price = 0;
                          }
                
                          setEditing({ ...editing, ...updates });
                        }}
                        className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                        data-testid="input-net-seller-amount"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium mb-1">Prix FAI (€)</label>
                      <MoneyInput
                        value={editing.price || ''}
                        onChange={(e) => {
                          const faiAmount = e.target.value ? parseFloat(e.target.value) : 0;
                          const updates: any = { price: faiAmount };
                
                          // Recalculer le net vendeur
                          if (faiAmount && faiAmount > 0) {
                            if (editing.commissionPercentage && editing.commissionPercentage > 0) {
                              // Si commission en %, calculer le montant absolu et le net vendeur
                              const commissionAbs = faiAmount * (editing.commissionPercentage / 100);
                              updates.commissionAmount = Math.round(commissionAbs);
                              updates.netSellerAmount = Math.round(faiAmount - commissionAbs);
                            } else if (editing.commissionAmount && editing.commissionAmount > 0) {
                              // Si commission en €, calculer le % et le net vendeur
                              const commissionPct = (editing.commissionAmount / faiAmount) * 100;
                              updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                              updates.netSellerAmount = Math.round(faiAmount - editing.commissionAmount);
                            } else {
                              // Pas de commission, net vendeur = FAI
                              updates.netSellerAmount = Math.round(faiAmount);
                              updates.commissionAmount = undefined;
                              updates.commissionPercentage = undefined;
                            }
                          } else {
                            // Nettoyer tout si pas de montant valide
                            updates.netSellerAmount = undefined;
                            updates.commissionAmount = undefined;
                            updates.commissionPercentage = undefined;
                          }
                
                          setEditing({ ...editing, ...updates });
                        }}
                        className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                        data-testid="input-fai-amount"
                      />
                    </>
                  )}
                  {priceError && <p className={errCls}>{priceError}</p>}
                  {netError && <p className={errCls}>{netError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Commission</label>
                  <div className="flex gap-2">
                    {/* Champ commission en % */}
                    {editing.commissionAmount === undefined && (
                      <input
                        type="number"
                        step="0.01"
                        value={editing.commissionPercentage || ''}
                        onChange={(e) => {
                          const commissionPct = e.target.value ? parseFloat(e.target.value) : undefined;
                          const updates: any = { 
                            commissionPercentage: commissionPct
                          };
                
                          if (calculationMode === 'FROM_NET') {
                            // Mode Net → FAI
                            if (commissionPct && commissionPct > 0 && editing.netSellerAmount && editing.netSellerAmount > 0) {
                              const commissionAbs = editing.netSellerAmount * (commissionPct / 100);
                              updates.commissionAmount = Math.round(commissionAbs);
                              updates.price = Math.round(editing.netSellerAmount + commissionAbs);
                            } else if (editing.netSellerAmount && editing.netSellerAmount > 0) {
                              updates.price = Math.round(editing.netSellerAmount);
                            } else {
                              updates.price = 0;
                            }
                          } else {
                            // Mode FAI → Net
                            if (commissionPct && commissionPct > 0 && editing.price && editing.price > 0) {
                              const commissionAbs = editing.price * (commissionPct / 100);
                              updates.commissionAmount = Math.round(commissionAbs);
                              updates.netSellerAmount = Math.round(editing.price - commissionAbs);
                            } else if (editing.price && editing.price > 0) {
                              updates.netSellerAmount = Math.round(editing.price);
                            } else {
                              updates.netSellerAmount = undefined;
                            }
                          }
                
                          setEditing({ ...editing, ...updates });
                        }}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                        data-testid="input-commission-percentage"
                      />
                    )}

                    {/* Champ commission en € */}
                    {editing.commissionAmount !== undefined && (
                      <MoneyInput
                        value={editing.commissionAmount || ''}
                        onChange={(e) => {
                          const commissionAbs = e.target.value ? parseInt(e.target.value) : 0;
                          const updates: any = { 
                            commissionAmount: commissionAbs
                          };
                
                          if (calculationMode === 'FROM_NET') {
                            // Mode Net → FAI
                            if (commissionAbs && commissionAbs > 0 && editing.netSellerAmount && editing.netSellerAmount > 0) {
                              const commissionPct = (commissionAbs / editing.netSellerAmount) * 100;
                              updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                              updates.price = Math.round(editing.netSellerAmount + commissionAbs);
                            } else if (editing.netSellerAmount && editing.netSellerAmount > 0) {
                              updates.commissionPercentage = undefined;
                              updates.price = Math.round(editing.netSellerAmount);
                            } else {
                              updates.commissionPercentage = undefined;
                              updates.price = 0;
                            }
                          } else {
                            // Mode FAI → Net
                            if (commissionAbs && commissionAbs > 0 && editing.price && editing.price > 0) {
                              const commissionPct = (commissionAbs / editing.price) * 100;
                              updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                              updates.netSellerAmount = Math.round(editing.price - commissionAbs);
                            } else if (editing.price && editing.price > 0) {
                              updates.commissionPercentage = undefined;
                              updates.netSellerAmount = Math.round(editing.price);
                            } else {
                              updates.commissionPercentage = undefined;
                              updates.netSellerAmount = undefined;
                            }
                          }
                
                          setEditing({ ...editing, ...updates });
                        }}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                        data-testid="input-commission-absolute"
                      />
                    )}

                    {/* Boutons de basculement */}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          // Basculer vers % - calculer le % depuis le montant absolu si disponible
                          const updates: any = { 
                            commissionAmount: undefined
                          };
                
                          // Si on a un montant absolu, calculer le % correspondant
                          if (editing.commissionAmount && editing.commissionAmount > 0) {
                            if (calculationMode === 'FROM_NET' && editing.netSellerAmount && editing.netSellerAmount > 0) {
                              const commissionPct = (editing.commissionAmount / editing.netSellerAmount) * 100;
                              updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                            } else if (calculationMode === 'FROM_FAI' && editing.price && editing.price > 0) {
                              const commissionPct = (editing.commissionAmount / editing.price) * 100;
                              updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                            }
                          } else {
                            updates.commissionPercentage = editing.commissionPercentage || undefined;
                          }
                
                          if (calculationMode === 'FROM_NET') {
                            // Recalculer FAI si on a les données nécessaires
                            if (editing.netSellerAmount && editing.netSellerAmount > 0 && updates.commissionPercentage && updates.commissionPercentage > 0) {
                              const commissionAbs = editing.netSellerAmount * (updates.commissionPercentage / 100);
                              updates.price = Math.round(editing.netSellerAmount + commissionAbs);
                            } else if (editing.netSellerAmount && editing.netSellerAmount > 0) {
                              updates.price = Math.round(editing.netSellerAmount);
                            }
                          } else {
                            // Recalculer Net si on a les données nécessaires
                            if (editing.price && editing.price > 0 && updates.commissionPercentage && updates.commissionPercentage > 0) {
                              const commissionAbs = editing.price * (updates.commissionPercentage / 100);
                              updates.netSellerAmount = Math.round(editing.price - commissionAbs);
                            } else if (editing.price && editing.price > 0) {
                              updates.netSellerAmount = Math.round(editing.price);
                            }
                          }
                
                          setEditing({ ...editing, ...updates });
                        }}
                        className={`px-3 py-2 border rounded text-sm font-medium ${editing.commissionAmount === undefined ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        data-testid="button-commission-percentage"
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Basculer vers € - calculer le montant € depuis le % si disponible
                          const updates: any = { 
                            commissionPercentage: undefined
                          };
                
                          // Si on a un %, calculer le montant absolu correspondant
                          if (editing.commissionPercentage && editing.commissionPercentage > 0) {
                            if (calculationMode === 'FROM_NET' && editing.netSellerAmount && editing.netSellerAmount > 0) {
                              const commissionAbs = editing.netSellerAmount * (editing.commissionPercentage / 100);
                              updates.commissionAmount = Math.round(commissionAbs);
                            } else if (calculationMode === 'FROM_FAI' && editing.price && editing.price > 0) {
                              const commissionAbs = editing.price * (editing.commissionPercentage / 100);
                              updates.commissionAmount = Math.round(commissionAbs);
                            }
                          } else {
                            updates.commissionAmount = editing.commissionAmount !== undefined ? editing.commissionAmount : 0;
                          }
                
                          if (calculationMode === 'FROM_NET') {
                            // Recalculer FAI si on a les données nécessaires
                            if (editing.netSellerAmount && editing.netSellerAmount > 0 && updates.commissionAmount && updates.commissionAmount > 0) {
                              updates.price = Math.round(editing.netSellerAmount + updates.commissionAmount);
                            } else if (editing.netSellerAmount && editing.netSellerAmount > 0) {
                              updates.price = Math.round(editing.netSellerAmount);
                            }
                          } else {
                            // Recalculer Net si on a les données nécessaires
                            if (editing.price && editing.price > 0 && updates.commissionAmount && updates.commissionAmount > 0) {
                              updates.netSellerAmount = Math.round(editing.price - updates.commissionAmount);
                            } else if (editing.price && editing.price > 0) {
                              updates.netSellerAmount = Math.round(editing.price);
                            }
                          }
                
                          setEditing({ ...editing, ...updates });
                        }}
                        className={`px-3 py-2 border rounded text-sm font-medium ${editing.commissionAmount !== undefined ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        data-testid="button-commission-absolute"
                      >
                        €
                      </button>
                    </div>
                  </div>
                </div>

                {/* Affichage du calcul */}
                {editing.netSellerAmount && editing.price && (editing.commissionAmount || editing.commissionPercentage) && (
                  <div className="md:col-span-2 p-4 bg-white border-2 border-blue-400 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Net Vendeur</p>
                        <p className="text-lg font-bold text-gray-900">
                          {editing.netSellerAmount?.toLocaleString('fr-FR')} €
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Commission</p>
                        <p className="text-lg font-bold text-blue-600">
                          {editing.commissionAmount?.toLocaleString('fr-FR')} €
                          {editing.commissionPercentage && (
                            <span className="text-sm ml-1">({editing.commissionPercentage}%)</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Prix FAI</p>
                        <p className="text-lg font-bold text-green-600">
                          {editing.price?.toLocaleString('fr-FR')} €
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Honoraires à la charge de</label>
                  <select
                    value={editing.mandateHonorairesCharge || 'ACQUEREUR'}
                    onChange={e => updateField('mandateHonorairesCharge', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    data-testid="input-honoraires-charge"
                  >
                    <option value="ACQUEREUR">Charge acquéreur</option>
                    <option value="VENDEUR">Charge vendeur</option>
                  </select>
                </div>
              </div>
              </div>
              )}
            </div>

            {/* Mandat — crée un mandat AUTONOME (snapshot du bien), édité dans le registre */}
            <div className="mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  disabled={genMandate}
                  onClick={async () => {
                    setGenMandate(true);
                    try {
                      const res = await fetch('/api/mandats', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          propertyId: editing.id,
                          title: editing.title, type: editing.type, rooms: editing.rooms,
                          city: editing.city, region: editing.region, map: editing.map, address: editing.map?.query,
                          surface: editing.surface, annexSurface: editing.annexSurface, landSize: editing.landSize,
                          description: editing.description,
                          price: editing.price, netSellerAmount: editing.netSellerAmount,
                          commissionAmount: editing.commissionAmount, commissionPercentage: editing.commissionPercentage,
                          occupancy: editing.occupancy, owners: editing.owners,
                          sellerNotary: editing.sellerNotary, buyerNotary: editing.buyerNotary,
                        }),
                      });
                      const d = await res.json();
                      if (res.ok) {
                        if (await confirm(`Le mandat ${d.mandateNumber} a été créé à partir de ce bien. Le compléter et le signer dans le registre des mandats ?`, { title: 'Mandat généré' })) {
                          window.location.href = '/admin/mandats';
                        }
                      } else { toast(d.error || 'Erreur lors de la génération du mandat.'); }
                    } catch { toast('Erreur réseau.'); }
                    setGenMandate(false);
                  }}
                  className="btn-luxe text-sm disabled:opacity-60"
                  data-testid="button-generate-mandate"
                >
                  {genMandate ? 'Génération…' : 'Générer un mandat'}
                </button>
                <span className="text-xs text-gray-500">
                  Crée un mandat <strong>autonome</strong> à partir des données de ce bien. Il se complète et se signe ensuite dans le <a href="/admin/mandats" className="underline">registre des mandats</a>.
                </span>
              </div>
            </div>

    </>
  );
}
