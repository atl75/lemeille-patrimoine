"use client";
import dynamic from "next/dynamic";

const EstimationForm = dynamic(() => import("@/components/EstimationForm"), { ssr: false });

export default function EstimationFormLoader() {
  return <EstimationForm />;
}
