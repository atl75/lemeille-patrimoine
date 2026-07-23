import OpenAI from "openai";

export async function analyzePropertyDocument(documentBase64: string): Promise<any> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY non défini");
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Extraire le type MIME et les données
    const base64Data = documentBase64.includes(',')
      ? documentBase64.split(',')[1]
      : documentBase64;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Supporte la vision pour analyser les images de documents
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyse ce document immobilier (mandat, estimation, DPE, titre de propriété, etc.) et extrais toutes les informations pertinentes pour créer une fiche de bien immobilier.

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

Ne retourne QUE le JSON, sans texte supplémentaire.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Aucune réponse de l'IA");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Erreur d'analyse IA:", error);
    throw error;
  }
}
