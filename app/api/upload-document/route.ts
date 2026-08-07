import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/adminGuard";
import { uploadDocument } from "@/lib/cloudinary";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_DATA_URI_LENGTH = 30 * 1024 * 1024; // ~22 Mo de fichier

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = rateLimit(`upload-document:${ip}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop d'envois, merci de patienter quelques minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const file = body.file || body.document || body.image;
    if (!file || typeof file !== "string" || !file.startsWith("data:")) {
      return NextResponse.json({ error: "Document invalide (data URI attendue)" }, { status: 400 });
    }
    if (file.length > MAX_DATA_URI_LENGTH) {
      return NextResponse.json({ error: "Document trop volumineux (20 Mo max)" }, { status: 400 });
    }
    const url = await uploadDocument(file);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Erreur upload document:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du document", details: error?.message },
      { status: 500 }
    );
  }
}
