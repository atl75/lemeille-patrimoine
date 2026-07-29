"use client";
import { usePathname } from "next/navigation";

const PHONE_INTL = "33687157259";
const DEFAULT_MESSAGE = "Bonjour, je souhaite obtenir des informations sur vos biens / prestations.";

export function WhatsAppButton() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const href = `https://wa.me/${PHONE_INTL}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label="Discuter sur WhatsApp"
      data-testid="button-whatsapp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F3B2C]"
    >
      <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden="true">
        <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.7 4.61 1.905 6.478L4 29l7.723-1.86A11.94 11.94 0 0 0 16.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3Zm0 21.818a9.77 9.77 0 0 1-4.981-1.362l-.357-.212-4.583 1.103 1.126-4.464-.233-.367A9.744 9.744 0 0 1 5.273 15c0-5.917 4.812-10.727 10.728-10.727 5.917 0 10.727 4.81 10.727 10.727 0 5.917-4.81 10.818-10.727 10.818Zm5.892-8.038c-.322-.161-1.906-.94-2.202-1.048-.295-.108-.51-.161-.725.161-.214.322-.833 1.048-1.021 1.263-.188.214-.376.241-.698.08-.322-.161-1.36-.501-2.591-1.598-.958-.854-1.605-1.909-1.793-2.231-.188-.322-.02-.497.141-.657.145-.144.322-.376.483-.564.161-.188.214-.322.322-.537.107-.214.053-.402-.027-.564-.08-.161-.725-1.747-.993-2.393-.262-.63-.528-.545-.725-.555-.188-.009-.402-.011-.617-.011-.214 0-.564.08-.859.402-.295.322-1.126 1.1-1.126 2.683 0 1.582 1.153 3.11 1.314 3.324.161.214 2.268 3.464 5.494 4.858.768.332 1.367.53 1.834.678.77.245 1.47.21 2.024.128.617-.092 1.906-.779 2.174-1.531.268-.752.268-1.396.188-1.531-.08-.134-.295-.214-.617-.375Z" />
      </svg>
    </a>
  );
}
