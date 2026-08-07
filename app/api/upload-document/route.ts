import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/adminGuard";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Les documents (PDF…) sont stockés sur le volume persistant `data/uploads`
// et servis par /api/document/[file]. Indépendant de Cloudinary (dont la
// diffusion des PDF est bloquée par défaut) et sans base64 dans la donnée.
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_BYTES = 22 * 1024 * 1024;
const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = rateLimit(`upload-document:${ip}`, 60, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop d'envois, merci de patienter quelques minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const file = body.file || body.document || body.image;
    const m = typeof file === "string" && file.match(/^data:([^;]+);base64,(.*)$/s);
    if (!m) return NextResponse.json({ error: "Document invalide (data URI base64 attendue)" }, { status: 400 });
    const mime = m[1];
    const ext = EXT[mime];
    if (!ext) return NextResponse.json({ error: "Type non supporté (PDF ou image)" }, { status: 400 });
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > MAX_BYTES) return NextResponse.json({ error: "Document trop volumineux (20 Mo max)" }, { status: 400 });

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const id = crypto.randomBytes(12).toString("hex");
    await fs.writeFile(path.join(UPLOAD_DIR, `${id}.${ext}`), buf);
    return NextResponse.json({ url: `/api/document/${id}.${ext}` });
  } catch (error: any) {
    console.error("Erreur upload document:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi du document", details: error?.message }, { status: 500 });
  }
}
