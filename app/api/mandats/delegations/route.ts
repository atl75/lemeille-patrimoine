import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminGuard";
import { readJSON, updateJSON, uid } from "@/lib/utils";

const FILE = "delegations-mandats.json";
const allowed = ["BROUILLON", "A_SIGNER", "ACTIVE", "EXPIREE", "REVOQUEE"] as const;
const clean = (x: unknown, max = 500) => typeof x === "string" ? x.trim().slice(0, max) : "";
const num = (v: unknown) => Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0;

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const all = await readJSON(FILE, { fresh: true });
  if (!Array.isArray(all)) return NextResponse.json({ error: 'Collection de délégations invalide' }, { status: 503 });
  return NextResponse.json(all, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const mandatId = clean(body.mandatId, 100);
  const company = clean(body.partnerName, 160);
  if (!mandatId || !company) return NextResponse.json({ error: "Mandat et raison sociale obligatoires" }, { status: 400 });
  const mandats = await readJSON("mandats.json");
  const parent = (Array.isArray(mandats) ? mandats : []).find((x: any) => x.id === mandatId);
  if (!parent) return NextResponse.json({ error: "Mandat d'origine introuvable" }, { status: 404 });
  const status = allowed.includes(body.status) ? body.status : "BROUILLON";
  if (status === "ACTIVE" && parent.mandateSignStatus !== "SIGNED")
    return NextResponse.json({ error: "Une délégation ne peut devenir active qu'après signature du mandat d'origine." }, { status: 409 });
  if (body.partnerSiren && !/^\d{9}$/.test(clean(body.partnerSiren).replace(/\s/g, "")))
    return NextResponse.json({ error: "SIREN : 9 chiffres attendus" }, { status: 400 });
  if (body.startDate && body.endDate && body.endDate < body.startDate)
    return NextResponse.json({ error: "La date de fin précède le début" }, { status: 400 });
  const now = new Date().toISOString();
  const item = {
    id: uid("delegation-"), mandatId, mandateNumber: parent.mandateNumber || "",
    propertyTitle: parent.title || parent.designation || "", createdAt: now, updatedAt: now,
    partnerName: company, partnerTradeName: clean(body.partnerTradeName, 160), partnerSiren: clean(body.partnerSiren, 14),
    partnerCard: clean(body.partnerCard, 100), partnerAddress: clean(body.partnerAddress, 300),
    partnerEmail: clean(body.partnerEmail, 180), partnerPhone: clean(body.partnerPhone, 40),
    representative: clean(body.representative, 150),
    territory: clean(body.territory, 400), scope: clean(body.scope, 1200),
    startDate: clean(body.startDate, 10), endDate: clean(body.endDate, 10),
    feeSharePercent: Math.min(100, num(body.feeSharePercent)),
    feeNotes: clean(body.feeNotes, 800), status,
    history: [{ date: now, status, action: "Création" }],
  };
  await updateJSON(FILE, (data: any[]) => {
    if (!Array.isArray(data)) throw new Error('Collection de délégations invalide');
    return [...data, item];
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !body.id || !allowed.includes(body.status)) return NextResponse.json({ error: "Identifiant ou statut invalide" }, { status: 400 });
  const all = await readJSON(FILE, { fresh: true });
  const selected = (Array.isArray(all) ? all : []).find((x: any) => x.id === body.id);
  if (!selected) return NextResponse.json({ error: "Délégation introuvable" }, { status: 404 });
  if (body.status === "ACTIVE") {
    const mandats = await readJSON("mandats.json");
    const parent = (Array.isArray(mandats) ? mandats : []).find((x: any) => x.id === selected.mandatId);
    if (parent?.mandateSignStatus !== "SIGNED") return NextResponse.json({ error: "Mandat d'origine non signé" }, { status: 409 });
  }
  const limits: Record<string,number> = { partnerName:160, partnerTradeName:160, partnerSiren:14, partnerCard:100, partnerAddress:300, partnerEmail:180, partnerPhone:40, representative:150, territory:400, scope:1200, startDate:10, endDate:10, feeNotes:800 };
  const editing = Object.keys(limits).some(k=>Object.hasOwn(body,k)) || Object.hasOwn(body,'feeSharePercent');
  if(body.mandatId!==undefined && body.mandatId!==selected.mandatId)
    return NextResponse.json({error:"Le mandat d'origine ne peut pas être remplacé."},{status:400});
  if(editing && typeof body.expectedUpdatedAt!=='string')
    return NextResponse.json({error:'Rechargez la délégation avant de la modifier.'},{status:409});
  let updated:any;
  try {
    await updateJSON(FILE,(data:any[])=>{
      const fail=(message:string,status:number):never=>{throw Object.assign(new Error(message),{status});};
      if(!Array.isArray(data))fail('Collection de délégations invalide',503);
      const current=data.find(x=>x.id===body.id);
      if(!current)fail('Délégation introuvable',404);
      if(typeof body.expectedUpdatedAt==='string' && body.expectedUpdatedAt!==(current.updatedAt||''))
        fail('Cette délégation a été modifiée ailleurs. Vos saisies sont conservées ; rechargez la page pour retrouver la dernière version.',409);
      const patch:Record<string,unknown>={status:body.status};
      for(const [key,max] of Object.entries(limits))if(Object.hasOwn(body,key)){
        if(typeof body[key]!=='string')fail('Champ texte invalide',400);
        patch[key]=clean(body[key],max);
      }
      if(Object.hasOwn(body,'feeSharePercent')){
        if(typeof body.feeSharePercent!=='number'||!Number.isFinite(body.feeSharePercent)||body.feeSharePercent<0||body.feeSharePercent>100)fail('Part des honoraires : nombre de 0 à 100 attendu',400);
        patch.feeSharePercent=body.feeSharePercent;
      }
      const next={...current,...patch};
      if(!next.partnerName)fail('Raison sociale obligatoire',400);
      if(next.partnerSiren&&!/^\d{9}$/.test(next.partnerSiren.replace(/\s/g,'')))fail('SIREN : 9 chiffres attendus',400);
      if(next.startDate&&next.endDate&&next.endDate<next.startDate)fail('La date de fin précède le début',400);
      const now=new Date(Math.max(Date.now(),(Date.parse(current.updatedAt)||0)+1)).toISOString();
      updated={...next,updatedAt:now,history:[...(current.history||[]),{date:now,status:next.status,action:editing?'Modification des informations':'Changement de statut'}]};
      return data.map(x=>x.id===body.id?updated:x);
    });
    return NextResponse.json({success:true,item:updated},{headers:{'Cache-Control':'private, no-store'}});
  }catch(e:any){return NextResponse.json({error:e.status?e.message:'Enregistrement momentanément indisponible'},{status:e.status||503});}
}
