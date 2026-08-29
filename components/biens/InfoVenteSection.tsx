import CollapsibleSection from "@/components/CollapsibleSection";
import NotaryAutocomplete from "@/components/NotaryAutocomplete";

// Section « Information de vente » : regroupe l'acquéreur, les notaires (avec un
// clerc propre à chacun), les conditions financières négociées et le mobilier.
type Props = {
  editing: any;
  updateField: (field: string, value: any) => void;
};

const inCls = "w-full px-2 py-1 text-xs border rounded";
const inGreen = "w-full px-2 py-1 text-xs border border-green-300 rounded";

export default function InfoVenteSection({ editing, updateField }: Props) {
  // Sélection d'un office : réinjecte les infos mémorisées (nom, tél, email, clerc propre).
  const applyNotary = async (which: 'sellerNotary' | 'buyerNotary', n: any) => {
    const cur = editing[which] || {};
    const base = { ...cur, officeName: n.name, address: n.address || cur.address, city: n.city || cur.city, postalCode: n.postalCode || cur.postalCode };
    updateField(which, base);
    try {
      const r = await fetch(`/api/notary-contacts?office=${encodeURIComponent(n.name || '')}`);
      const c = (await r.json())?.contact;
      if (c) updateField(which, {
        ...base,
        notaryName: c.notaryName || base.notaryName, address: c.address || base.address, city: c.city || base.city,
        postalCode: c.postalCode || base.postalCode, phone: c.phone || base.phone, email: c.email || base.email,
        clerkName: c.clerkName || base.clerkName, clerkEmail: c.clerkEmail || base.clerkEmail,
      });
    } catch { /* pas de contact mémorisé */ }
  };

  const setN = (which: 'sellerNotary' | 'buyerNotary', patch: any) => updateField(which, { ...editing[which], ...patch });

  // Mobilier
  const furniture: { label?: string; value?: number }[] = editing.furniture || [];
  const setFurniture = (arr: any[]) => updateField('furniture', arr);
  const furnitureTotal = furniture.reduce((s, f) => s + (Number(f.value) || 0), 0);

  // « Vente au prix » : reprend prix et commission de la fiche.
  const venteAuPrix = () => {
    updateField('finalSalePrice', editing.price);
    updateField('negotiatedCommission', editing.commissionAmount ?? (((editing.price || 0) - (editing.netSellerAmount || 0)) || undefined));
  };

  const NotaryFields = ({ which, title, duplicate }: { which: 'sellerNotary' | 'buyerNotary'; title: string; duplicate?: boolean }) => (
    <div className="p-2 bg-white border rounded text-xs">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium text-xs">{title}</h4>
        {duplicate && <button type="button" onClick={() => updateField('buyerNotary', editing.sellerNotary)} className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" data-testid="button-duplicate-notary">Dupliquer</button>}
      </div>
      <div className="space-y-1">
        <NotaryAutocomplete value={editing[which]?.officeName || ''} onSelect={(n) => applyNotary(which, n)} onTextChange={(t) => setN(which, { officeName: t })} placeholder="Office notarial" className={inCls} />
        <input type="text" value={editing[which]?.notaryName || ''} onChange={(e) => setN(which, { notaryName: e.target.value })} className={inCls} placeholder="Nom du notaire" data-testid={`input-${which}-name`} />
        <div className="grid grid-cols-2 gap-1">
          <input type="text" value={editing[which]?.phone || ''} onChange={(e) => setN(which, { phone: e.target.value })} className={inCls} placeholder="Tél" data-testid={`input-${which}-phone`} />
          <input type="email" value={editing[which]?.email || ''} onChange={(e) => setN(which, { email: e.target.value })} className={inCls} placeholder="Email" data-testid={`input-${which}-email`} />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <input type="text" value={editing[which]?.clerkName || ''} onChange={(e) => setN(which, { clerkName: e.target.value })} className={inCls} placeholder="Clerc — nom" data-testid={`input-${which}-clerk-name`} />
          <input type="email" value={editing[which]?.clerkEmail || ''} onChange={(e) => setN(which, { clerkEmail: e.target.value })} className={inCls} placeholder="Clerc — email (mis en copie)" data-testid={`input-${which}-clerk-email`} />
        </div>
      </div>
    </div>
  );

  return (
    <CollapsibleSection title="Information de vente" subtitle="Acquéreur, notaires, conditions financières et mobilier">
      {/* Acquéreur */}
      <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
        <h3 className="font-semibold text-sm mb-2">Acquéreur</h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><label className="block mb-1">Prénom</label><input type="text" value={editing.buyerFirstName || ''} onChange={(e) => updateField('buyerFirstName', e.target.value)} className={inGreen} placeholder="Jean" data-testid="input-buyer-firstname" /></div>
          <div><label className="block mb-1">Nom</label><input type="text" value={editing.buyerLastName || ''} onChange={(e) => updateField('buyerLastName', e.target.value)} className={inGreen} placeholder="Dupont" data-testid="input-buyer-lastname" /></div>
          <div><label className="block mb-1">Tel</label><input type="tel" value={editing.buyerPhone || ''} onChange={(e) => updateField('buyerPhone', e.target.value)} className={inGreen} placeholder="06 12 34 56 78" data-testid="input-buyer-phone" /></div>
          <div className="col-span-2"><label className="block mb-1">Email</label><input type="email" value={editing.buyerEmail || ''} onChange={(e) => updateField('buyerEmail', e.target.value)} className={inGreen} placeholder="email@exemple.fr" data-testid="input-buyer-email" /></div>
          <div className="col-span-3"><label className="block mb-1">Adresse</label><input type="text" value={editing.buyerAddress || ''} onChange={(e) => updateField('buyerAddress', e.target.value)} className={inGreen} placeholder="123 rue..." data-testid="input-buyer-address" /></div>
        </div>
      </div>

      {/* Conditions financières négociées */}
      <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Conditions financières</h3>
          <button type="button" onClick={venteAuPrix} className="px-2 py-1 text-xs bg-[#1F3B2C] text-white rounded hover:opacity-90" data-testid="button-vente-au-prix" title="Reprend le prix et la commission de la fiche">Si vente au prix</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><label className="block mb-1">Prix vente FAI (€)</label><input type="number" value={editing.finalSalePrice ?? ''} onChange={(e) => updateField('finalSalePrice', e.target.value ? parseFloat(e.target.value) : undefined)} className={inGreen} data-testid="input-final-sale-price" /></div>
          <div><label className="block mb-1">Commission négociée (€)</label><input type="number" value={editing.negotiatedCommission ?? ''} onChange={(e) => updateField('negotiatedCommission', e.target.value ? parseFloat(e.target.value) : undefined)} className={inGreen} data-testid="input-negotiated-commission" /></div>
          <div><label className="block mb-1">Séquestre (€)</label><input type="number" value={editing.sequestreAmount ?? ''} onChange={(e) => updateField('sequestreAmount', e.target.value ? parseFloat(e.target.value) : undefined)} className={inGreen} placeholder="ex : 10000" data-testid="input-sequestre" /></div>
        </div>
        {editing.finalSalePrice && editing.negotiatedCommission ? (
          <div className="mt-2 text-xs text-gray-700">Net vendeur final : <strong>{(editing.finalSalePrice - editing.negotiatedCommission).toLocaleString('fr-FR')} €</strong></div>
        ) : null}
      </div>

      {/* Notaires */}
      <div className="p-2 bg-gray-50 rounded mb-3">
        <h3 className="font-semibold text-sm mb-2 pb-2 border-b">Notaires</h3>
        <div className="space-y-2">
          <NotaryFields which="sellerNotary" title="Vendeur" />
          <NotaryFields which="buyerNotary" title="Acquéreur" duplicate />
        </div>
      </div>

      {/* Mobilier */}
      <div className="p-2 bg-gray-50 rounded">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Mobilier vendu</h3>
          <button type="button" onClick={() => setFurniture([...furniture, { label: '', value: undefined }])} className="text-xs text-[#B89C6D] hover:underline" data-testid="button-add-furniture">+ Ajouter un élément</button>
        </div>
        {furniture.length ? (
          <table className="w-full text-xs">
            <thead><tr className="text-left opacity-75"><th className="py-1">Élément</th><th className="py-1 w-28">Valeur (€)</th><th className="w-8"></th></tr></thead>
            <tbody>
              {furniture.map((f, i) => (
                <tr key={i}>
                  <td className="py-0.5 pr-1"><input type="text" value={f.label || ''} onChange={(e) => setFurniture(furniture.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} className={inCls} placeholder="Cuisine équipée, lave-vaisselle…" data-testid={`input-furniture-label-${i}`} /></td>
                  <td className="py-0.5 pr-1"><input type="number" value={f.value ?? ''} onChange={(e) => setFurniture(furniture.map((x, idx) => idx === i ? { ...x, value: e.target.value ? parseFloat(e.target.value) : undefined } : x))} className={inCls} data-testid={`input-furniture-value-${i}`} /></td>
                  <td className="py-0.5"><button type="button" onClick={() => setFurniture(furniture.filter((_, idx) => idx !== i))} className="text-red-500 hover:underline" data-testid={`button-remove-furniture-${i}`}>✕</button></td>
                </tr>
              ))}
              <tr className="border-t font-semibold"><td className="py-1 text-right pr-2">Total</td><td className="py-1">{furnitureTotal.toLocaleString('fr-FR')} €</td><td></td></tr>
            </tbody>
          </table>
        ) : <div className="text-xs opacity-75">Aucun élément. Ajoutez le mobilier vendu avec le bien.</div>}
      </div>
    </CollapsibleSection>
  );
}
