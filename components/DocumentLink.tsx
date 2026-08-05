"use client";
import { FileText, Eye, Download } from "lucide-react";

// Convertit une data URL (data:application/pdf;base64,...) en Blob afin de
// pouvoir l'ouvrir dans un nouvel onglet : les navigateurs bloquent la
// navigation directe vers une URL `data:`, mais autorisent les URL `blob:`.
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = (head.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(b64 || "");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export default function DocumentLink({ name, subtitle, url }: { name: string; subtitle?: string; url: string }) {
  const isData = typeof url === "string" && url.startsWith("data:");

  // Ouvre le document dans un nouvel onglet pour le consulter.
  const view = () => {
    let href = url;
    if (isData) {
      const blobUrl = URL.createObjectURL(dataUrlToBlob(url));
      href = blobUrl;
      // On révoque après un délai laissant le temps à l'onglet de charger.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  // Force le téléchargement du document.
  const download = async () => {
    let href = url;
    let revoke = false;
    try {
      if (isData) {
        href = URL.createObjectURL(dataUrlToBlob(url));
        revoke = true;
      } else {
        const res = await fetch(url);
        const blob = await res.blob();
        href = URL.createObjectURL(blob);
        revoke = true;
      }
    } catch {
      /* repli : lien direct */
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = (name || "document").replace(/[^\w\-. ]+/g, "_") + (isData ? ".pdf" : "");
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) setTimeout(() => URL.revokeObjectURL(href), 5000);
  };

  return (
    <div className="card p-4 flex items-center gap-3">
      <FileText className="w-5 h-5 text-gold shrink-0" />
      <button onClick={view} className="flex-1 min-w-0 text-left" title="Consulter dans un nouvel onglet">
        <div className="font-medium text-luxe truncate group-hover:underline">{name || "Document"}</div>
        {subtitle && <div className="text-xs text-luxe/55 truncate">{subtitle}</div>}
      </button>
      <button onClick={view} className="inline-flex items-center gap-1 text-sm font-medium text-[#B89C6D] hover:underline whitespace-nowrap">
        <Eye className="w-4 h-4" /> Consulter
      </button>
      <button onClick={download} title="Télécharger" aria-label="Télécharger" className="text-luxe/40 hover:text-luxe">
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}
