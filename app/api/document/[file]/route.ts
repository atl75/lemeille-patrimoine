import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const CONTENT_TYPE: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Sert un document stocké sur le volume persistant, en « inline » (consultable
// dans un onglet). Le nom est strictement validé pour éviter tout path traversal.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-zA-Z0-9]+\.(pdf|jpe?g|png|webp)$/.test(file)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, file));
    const ext = file.split(".").pop()!.toLowerCase();
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPE[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${file}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
