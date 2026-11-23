"use client";
import { GROUPES_CARACTERISTIQUES, LIBELLES_CARACTERISTIQUES, OPTIONS_CARACTERISTIQUES,
  alertesCaracteristiques, blocagesCaracteristiques, cleRevueCaracteristiques,
  type CaracteristiquesEstimation as Caracteristiques } from '@/lib/caracteristiquesEstimation';
import type { TypeBien } from '@/lib/estimation';

export default function CaracteristiquesEstimation({ valeur, type, onChange }: {
  valeur: Caracteristiques | null; type: TypeBien; onChange: (value:Caracteristiques|null)=>void;
}) {
  if(!valeur)return <div className="rounded border p-3 text-sm">
    <p>Le mode historique regroupe encore luminosité, exposition et vue. Le mode détaillé remplace ses corrections d’étage/ascenseur, bruit et lumière, sans les cumuler. DPE et état sont conservés.</p>
    <button type="button" data-testid="activer-caracteristiques" className="btn mt-2 p-2" onClick={()=>onChange({version:1})}>Passer aux caractéristiques détaillées</button>
  </div>;
  const set=(patch:Partial<Caracteristiques>)=>onChange({...valeur,...patch,revueCumuls:'',revueCle:''});
  const alertes=alertesCaracteristiques(valeur,type), blocages=blocagesCaracteristiques(valeur,type);
  return <section className="space-y-3 rounded-xl border p-3" aria-label="Caractéristiques détaillées">
    <h3 className="font-semibold">Caractéristiques et effets sur la valeur</h3>
    <p className="text-sm">Pas de pourcentage automatique : renseignez l’écart par rapport aux références retenues. Positif = favorable ; négatif = défavorable ; 0 = aucun écart retenu. Une case vide reste non chiffrée. Exposition et luminosité sont distinctes ; le soleil peut aussi entraîner une surchauffe.</p>
    <label className="block text-sm">Date de l’observation / visite
      <input type="date" value={valeur.visiteLe || ''} onChange={e=>set({visiteLe:e.target.value})} className="input ml-2" />
    </label>
    {GROUPES_CARACTERISTIQUES.filter(g=>g!=='etage' || type==='Appartement').map(g=><fieldset key={g} className="rounded border p-3">
      <legend className="px-1 font-medium">{LIBELLES_CARACTERISTIQUES[g]}</legend>
      {g==='etage' ? <div className="flex flex-wrap gap-3">
        <label className="text-sm">Étage (0 = RDC)
          <input type="number" min="0" max="100" step="1" data-testid="detail-etage" value={valeur.etage ?? ''} onChange={e=>set({etage:e.target.value===''?null:Number(e.target.value)})} className="input ml-2 w-20" />
        </label>
        <label className="text-sm">Ascenseur
          <select data-testid="detail-ascenseur" value={valeur.ascenseur || ''} onChange={e=>set({ascenseur:e.target.value as Caracteristiques['ascenseur']})} className="input ml-2">
            <option value="">Non renseigné</option><option value="OUI">Dessert le logement</option><option value="NON">Absent</option><option value="PARTIEL">Marches / palier restant</option>
          </select>
        </label>
        <label className="text-sm"><input type="checkbox" checked={!!valeur.dernierEtage} onChange={e=>set({dernierEtage:e.target.checked})} /> Dernier étage</label>
        <p className="w-full text-xs">Une seule correction étage + accès. RDC : préciser intimité, accès et extérieur privatif éventuel. En étage élevé, tenir compte de la desserte réelle, sans ajouter une seconde décote ascenseur.</p>
      </div> : <label className="block text-sm">Constat
        <select data-testid={`detail-${g}`} className="input ml-2" value={valeur[g] || ''} onChange={e=>set({[g]:e.target.value})}>
          <option value="">Non renseigné</option>{Object.entries(OPTIONS_CARACTERISTIQUES[g]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </label>}
      <label className="mt-3 block text-sm">Effet retenu (%)
        <input type="number" step="0.1" min="-30" max="30" data-testid={`impact-${g}`} className="input ml-2 w-24" value={valeur.impacts?.[g] ?? ''}
          onChange={e=>set({impacts:{...valeur.impacts,[g]:e.target.value===''?null:Number(e.target.value)}})} placeholder="À chiffrer" />
      </label>
      <label className="mt-2 block text-sm">Observation et justification par les références
        <textarea maxLength={1500} data-testid={`note-${g}`} className="input mt-1 w-full" rows={2} value={valeur.notes?.[g] || ''}
          onChange={e=>set({notes:{...valeur.notes,[g]:e.target.value}})} placeholder={g==='bruit'?'Pièces concernées, fenêtre ouverte/fermée, horaires, origine du bruit, comparables…':g==='ensoleillement'?'Pièces, heure, météo, masques, profondeur du logement, comparables…':g==='visavis'?'Distance approximative, pièces concernées, intimité, comparables…':'Constat de visite, références comparables, écart retenu…'} />
      </label>
    </fieldset>)}
    {alertes.length>0 && <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
      {alertes.map(a=><p key={a}>{a}</p>)}
      <label className="mt-2 block">Justification des effets distincts après relecture
        <textarea data-testid="revue-cumuls" className="input mt-1 w-full" maxLength={3000} value={valeur.revueCumuls || ''}
          onChange={e=>onChange({...valeur,revueCumuls:e.target.value,revueCle:cleRevueCaracteristiques(valeur)})} />
      </label>
    </div>}
    {blocages.length>0 && <div className="text-sm text-amber-900" role="status"><p>Brouillon enregistrable ; avant de figer :</p><ul className="list-disc pl-5">{blocages.map(b=><li key={b}>{b}</li>)}</ul></div>}
    <p className="text-xs">Les bornes ±30 % et la fourchette du moteur sont des garde-fous techniques, pas une précision immobilière démontrée.</p>
    <button type="button" className="text-xs underline" onClick={()=>{if(confirm('Revenir aux anciens critères retire les caractéristiques détaillées du brouillon. Les avis figés ne changent pas.'))onChange(null);}}>Revenir au mode historique</button>
  </section>;
}
