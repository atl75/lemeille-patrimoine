"use client";
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    google?: typeof google;
  }
}

export default function GoogleMapsScript() {
  const [loaded, setLoaded] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      console.warn('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY non définie');
      return;
    }

    if (window.google?.maps) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=fr`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup si nécessaire
    };
  }, [apiKey]);

  return null;
}
