import Anthropic from "@anthropic-ai/sdk";

const ANALYSIS_MODEL = "claude-sonnet-5";

const PROMPT = `Analyse ce document immobilier (mandat, estimation, DPE, titre de propriété, etc.) et extrais toutes les informations pertinentes pour créer une fiche de bien immobilier.

Retourne un objet JSON avec UNIQUEMENT les champs que tu peux identifier avec certitude. Ne remplis PAS les champs si l'information n'est pas clairement visible dans le document.

Format attendu:
{
  "title": "Titre du bien (ex: Appartement 3 pièces centre-ville, Maison de charme avec jardin)",
  "type": "APPARTEMENT ou MAISON",
  "city": "Ville exacte",
  "region": "PARIS, NORMANDIE ou COTE_D_AZUR (déduis selon la ville)",
  "price": nombre (prix en euros, sans centimes),
  "surface": nombre (surface habitable en m²),
  "rooms": nombre (nombre de pièces principales),
  "landSize": nombre optionnel (superficie du terrain en m² pour les maisons uniquement),
  "description": "Description détaillée et attractive du bien en français",
  "features": ["Liste des équipements et prestations: parking, terrasse, ascenseur, cave, etc."],
  "dpe": {
    "classEnergy": "Lettre de A à G",
    "classGES": "Lettre de A à G",
    "consumptionKwh": nombre (consommation en kWh/m²/an),
    "emissionsKg": nombre (émissions en kg CO2/m²/an),
    "date": "YYYY-MM-DD (date du DPE)"
  }
}

IMPORTANT:
- Si le document est un mandat ou une estimation, concentre-toi sur les infos du bien
- Si le document est un DPE, extrais toutes les données énergétiques
- Si des informations manquent, omets simplement ces champs du JSON
- Pour la région: Paris et Île-de-France = PARIS, Normandie = NORMANDIE, Côte d'Azur/PACA/Var = COTE_D_AZUR

Ne retourne QUE le JSON, sans texte supplémentaire, sans bloc de code markdown.`;

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function analyzePropertyDocument(documentBase64: string): Promise<any> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY non défini");
  }

  const match = documentBase64.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!match) {
    throw new Error("Format de document invalide (data URI attendue)");
  }
  const [, mimeType, base64Data] = match;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const isPdf = mimeType === "application/pdf";
  if (!isPdf && !SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    throw new Error(`Type de document non supporté pour l'analyse : ${mimeType}`);
  }

  const documentBlock: Anthropic.Messages.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64Data },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: mimeType as any, data: base64Data },
      };

  try {
    const response = await client.messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: PROMPT }, documentBlock],
        },
      ],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    if (!textBlock) {
      throw new Error("Aucune réponse de l'IA");
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Réponse de l'IA non exploitable");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Erreur d'analyse IA:", error);
    throw error;
  }
}
