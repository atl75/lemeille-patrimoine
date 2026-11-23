import {TYPES_LOT,OCCUPATIONS_LOT,type LotImmeuble} from '@/lib/immeuble';
export default function CompositionImmeuble({lots}:{lots:LotImmeuble[]}) {
  if(!lots.length)return null;
  return <section className="card p-6 mt-4" data-testid="composition-immeuble"><h2 className="luxe text-2xl mb-3">Composition de l’immeuble</h2>
    <p className="mb-3 text-sm">Vente de l’immeuble en bloc. Les lots ci-dessous ne sont pas proposés séparément.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Lot','Nature','Surface','Occupation'].map(s=><th key={s} scope="col" className="p-2">{s}</th>)}</tr></thead>
      <tbody>{lots.map(l=><tr key={l.id} className="border-t"><td className="p-2">{l.label}</td><td className="p-2">{TYPES_LOT[l.type]}</td><td className="p-2">{l.surface == null ? 'Non renseignée' : `${l.surface.toLocaleString('fr-FR')} m²`}</td><td className="p-2">{OCCUPATIONS_LOT[l.occupancy]}</td></tr>)}</tbody></table></div>
  </section>;
}
