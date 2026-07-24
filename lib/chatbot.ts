import { readJSON } from "@/lib/utils";

export const CHAT_MODEL = "claude-haiku-4-5-20251001";

export const SAVE_LEAD_TOOL = {
  name: "save_lead",
  description:
    "Enregistre la demande d'un visiteur dans le CRM de l'agence. À utiliser UNIQUEMENT lorsque le visiteur a explicitement accepté d'être recontacté et a fourni son nom ainsi qu'un email ou un téléphone. Ne jamais l'utiliser sans accord explicite du visiteur.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Nom du visiteur" },
      email: { type: "string", description: "Email du visiteur (si fourni)" },
      phone: { type: "string", description: "Téléphone du visiteur (si fourni)" },
      category: {
        type: "string",
        enum: ["immobilier", "patrimoine"],
        description: "Catégorie principale de la demande",
      },
      topic: {
        type: "string",
        enum: [
          "Achat immobilier",
          "Vente immobilier",
          "Estimation",
          "Patrimoine",
          "Programmes fiscaux",
          "Autre",
        ],
      },
      summary: {
        type: "string",
        description: "Résumé clair de la demande du visiteur, à destination du conseiller qui va le recontacter",
      },
    },
    required: ["name", "summary"],
  },
};

async function buildContextBlock() {
  const [properties, programs] = await Promise.all([
    readJSON("properties.json"),
    readJSON("programs.json"),
  ]);

  const activeProperties = Array.isArray(properties)
    ? properties.filter((p: any) => p.visible !== false && !p.sold && p.status !== "SOLD").slice(0, 25)
    : [];
  const visiblePrograms = Array.isArray(programs)
    ? programs.filter((p: any) => p.visible !== false).slice(0, 15)
    : [];

  const propertiesText = activeProperties.length
    ? activeProperties
        .map(
          (p: any) =>
            `- ${p.title} (${p.id}) — ${p.city}, ${String(p.region || "").replaceAll("_", " ")} — ${
              (p.type || "APPARTEMENT") === "APPARTEMENT" ? "Appartement" : "Maison"
            }, ${p.surface ?? "—"} m², ${p.rooms ?? "—"} pièces — ${p.price ? Number(p.price).toLocaleString("fr-FR") + " €" : "prix non communiqué"}`
        )
        .join("\n")
    : "Aucun bien actuellement en ligne dans la base.";

  const programsText = visiblePrograms.length
    ? visiblePrograms
        .map((p: any) => `- ${p.title} (${p.dispositif}) — ${p.city} : ${p.summary}`)
        .join("\n")
    : "Aucun programme actuellement en ligne.";

  return { propertiesText, programsText };
}

export async function buildSystemPrompt() {
  const { propertiesText, programsText } = await buildContextBlock();

  return `Tu es l'assistant virtuel du site de Lemeille Patrimoine, agence immobilière haut de gamme et cabinet de gestion de patrimoine (marque du groupe Novus Capital), basée à Rouen et Fréjus, intervenant à Paris, en Normandie et sur la Côte d'Azur.

Ton rôle : accueillir les visiteurs du site, répondre à leurs questions sur les biens immobiliers, la gestion de patrimoine et les dispositifs de défiscalisation (Malraux, Monument Historique, Déficit Foncier), et orienter les demandes sérieuses vers un conseiller humain.

Ton de voix : professionnel, chaleureux, concis. Pas de jargon inutile. Tu vouvoies toujours le visiteur. Tu réponds en français.

Règles strictes :
- Tu ne donnes JAMAIS de conseil fiscal, juridique ou financier personnalisé et définitif. Pour toute question précise sur la situation fiscale d'un visiteur, indique qu'un conseiller Lemeille Patrimoine doit étudier son dossier.
- Tu ne t'appuies que sur les informations fournies ci-dessous sur les biens et programmes actuels. Si un visiteur demande un bien qui n'est pas dans la liste, dis-le simplement et propose de le mettre en relation avec un conseiller ou de consulter la page /immobilier.
- N'invente jamais de prix, de caractéristiques de bien ou de disponibilité.
- Si le visiteur souhaite être recontacté ou approfondir sa demande, demande-lui poliment son nom et un moyen de contact (email ou téléphone), PUIS utilise l'outil save_lead UNIQUEMENT après qu'il ait clairement donné ces informations et son accord pour être recontacté. Ne l'utilise jamais sans accord explicite.
- Reste bref (quelques phrases), sauf si le visiteur demande explicitement plus de détails.

Biens actuellement en vente (liste non exhaustive) :
${propertiesText}

Programmes de défiscalisation en cours :
${programsText}

Pour toute question hors de ton périmètre, oriente vers /contact ou le numéro 06 87 15 72 59.`;
}
