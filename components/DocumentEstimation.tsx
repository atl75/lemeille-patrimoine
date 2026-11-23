"use client";
import type { ComponentProps } from 'react';
import DocumentEstimationV1 from './DocumentEstimationV1';
import DocumentEstimationV2 from './DocumentEstimationV2';
import DocumentEstimationV3 from './DocumentEstimationV3';
import DocumentEstimationV4 from './DocumentEstimationV4';

/** Conserver le rendu d'origine de chaque avis. */
export default function DocumentEstimation({ rendererVersion = 1, ...props }: ComponentProps<typeof DocumentEstimationV1> & { rendererVersion?: number }) {
  if (rendererVersion === 4) return <DocumentEstimationV4 {...props} />;
  if (rendererVersion === 3) return <DocumentEstimationV3 {...props} />;
  if (rendererVersion === 2) return <DocumentEstimationV2 {...props} />;
  if (rendererVersion !== 1) return <p role="alert">Cette version d’avis nécessite son rendu d’origine.</p>;
  return <DocumentEstimationV1 {...props} />;
}
