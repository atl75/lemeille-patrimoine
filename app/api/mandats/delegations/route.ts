import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminGuard";
import { readJSON, updateJSON, uid } from "@/lib/utils";

const FILE = "delegations-mandats.json";
const allowed = ["BROUILLON", "A_SIGNER", "ACTIVE", "EXPIREE", "REVOQUEE"] as const;
const clean = (x: unknown, max = 500) => typeof x === "string" ? x.trim().slice(0, max) : "";
const num = (v: unknown) => Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0;

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const all = await readJSON(FILE);
  return NextResponse.json(Array.isArray(all) ? all : []);
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
    partnerName: company, partnerSiren: clean(body.partnerSiren, 14),
    partnerCard: clean(body.partnerCard, 100), partnerAddress: clean(body.partnerAddress, 300),
    partnerEmail: clean(body.partnerEmail, 180), partnerPhone: clean(body.partnerPhone, 40),
    representative: clean(body.representative, 150),
    territory: clean(body.territory, 400), scope: clean(body.scope, 1200),
    startDate: clean(body.startDate, 10), endDate: clean(body.endDate, 10),
    feeSharePercent: Math.min(100, num(body.feeSharePercent)),
    feeNotes: clean(body.feeNotes, 800), status,
    history: [{ date: now, status, action: "Création" }],
  };
  await updateJSON(FILE, (data: any[]) => [...(Array.isArray(data) ? data : []), item]);
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !body.id || !allowed.includes(body.status)) return NextResponse.json({ error: "Identifiant ou statut invalide" }, { status: 400 });
  const all = await readJSON(FILE);
  const selected = (Array.isArray(all) ? all : []).find((x: any) => x.id === body.id);
  if (!selected) return NextResponse.json({ error: "Délégation introuvable" }, { status: 404 });
  if (body.status === "ACTIVE") {
    const mandats = await readJSON("mandats.json");
    const parent = (Array.isArray(mandats) ? mandats : []).find((x: any) => x.id === selected.mandatId);
    if (parent?.mandateSignStatus !== "SIGNED") return NextResponse.json({ error: "Mandat d'origine non signé" }, { status: 409 });
  }
  const now = new Date().toISOString();
  await updateJSON(FILE, (data: any[]) => (Array.isArray(data) ? data : []).map((x: any) => x.id === body.id
    ? { ...x, status: body.status, updatedAt: now, history: [...(x.history || []), { date: now, status: body.status, action: "Changement de statut" }] }
    : x));
  return NextResponse.json({ success: true });
}
