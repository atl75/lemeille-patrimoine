import { NextRequest, NextResponse } from "next/server";
import { analyzePropertyDocument } from "@/lib/openai";

export async function POST(req: NextRequest) {
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
