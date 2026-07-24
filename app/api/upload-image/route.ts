import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/adminGuard";
import { uploadPropertyImage } from "@/lib/cloudinary";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const RATE_LIMIT = 60; // uploads
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_DATA_URI_LENGTH = 15 * 1024 * 1024; // ~10-11 Mo de fichier une fois décodé du base64

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = rateLimit(`upload-image:${ip}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop d'uploads, merci de patienter quelques minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const { image } = await req.json();

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Image invalide (data URI attendue)" }, { status: 400 });
    }
    if (image.length > MAX_DATA_URI_LENGTH) {
      return NextResponse.json({ error: "Image trop volumineuse (10 Mo max)" }, { status: 400 });
    }

    const url = await uploadPropertyImage(image);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Erreur upload image:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload de l'image", details: error.message },
      { status: 500 }
    );
  }
}
