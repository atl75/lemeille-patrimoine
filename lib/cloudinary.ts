import { v2 as cloudinary } from "cloudinary";

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

// Upload d'un document (PDF…) — resource_type "auto" pour conserver le bon
// Content-Type (application/pdf), consultable dans un onglet.
export async function uploadDocument(dataUri: string): Promise<string> {
  ensureConfigured();
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "lemeille-patrimoine/documents",
    resource_type: "auto",
  });
  return result.secure_url;
}
