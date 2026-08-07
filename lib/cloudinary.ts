import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary non configuré (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET manquants)");
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  configured = true;
}

export async function uploadPropertyImage(dataUri: string): Promise<string> {
  ensureConfigured();
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "lemeille-patrimoine/properties",
    resource_type: "image",
  });
  return result.secure_url;
}

// Upload d'un document (PDF…). On utilise resource_type "raw" : contrairement
// au type "image"/"auto", les fichiers "raw" ne sont PAS soumis au réglage
// Cloudinary « Allow delivery of PDF and ZIP files » (désactivé par défaut, il
// renvoie 401). On conserve l'extension d'origine dans le public_id pour un
// Content-Type correct (application/pdf → consultable dans un onglet).
export async function uploadDocument(dataUri: string): Promise<string> {
  ensureConfigured();
  const mime = (dataUri.match(/^data:([^;]+)/) || [])[1] || "application/octet-stream";
  const ext = mime === "application/pdf" ? "pdf" : (mime.split("/")[1] || "bin").replace("jpeg", "jpg");
  const id = crypto.randomBytes(12).toString("hex");
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "lemeille-patrimoine/documents",
    resource_type: "raw",
    public_id: `${id}.${ext}`,
  });
  return result.secure_url;
}
