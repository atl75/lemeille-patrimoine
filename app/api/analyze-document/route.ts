import { NextRequest, NextResponse } from "next/server";
import { analyzePropertyDocument } from "@/lib/documentAnalysis";
import { isAdmin } from "@/lib/adminGuard";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const RATE_LIMIT = 20; // analyses
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = rateLimit(`analyze-document:${ip}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop d'analyses lancées, merci de patienter quelques minutes avant de réessayer." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const { document } = await req.json();

    if (!document) {
      return NextResponse.json(
        { error: "Document manquant" },
        { status: 400 }
      );
    }

    // Vérifier que c'est bien un document Base64
    if (!document.startsWith('data:')) {
      return NextResponse.json(
        { error: "Le document doit être en format Base64" },
        { status: 400 }
      );
    }

    // Analyser avec l'IA
    const analysis = await analyzePropertyDocument(document);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Erreur lors de l'analyse:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de l'analyse du document",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
