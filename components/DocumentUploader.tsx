"use client";
import { useState, useRef, useEffect, DragEvent } from "react";
import { Upload, X, FileText } from "lucide-react";

type DocumentUploaderProps = {
  document?: string;
  onChange: (document?: string) => void;
  label: string;
  accept?: string;
};

export default function DocumentUploader({ document, onChange, label, accept = ".pdf" }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const docFile = files.find(file => file.type === "application/pdf" || file.name.endsWith('.pdf'));
    
    if (docFile) {
      processFile(docFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          onChange(dataUrl);
        }
      };
      reader.onerror = () => {
        alert(`Erreur lors de la lecture du fichier ${file.name}`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Erreur lors du chargement du document: ${error}`);
    }
  };

  const handleUrlAdd = () => {
    const url = prompt("Entrez l'URL du document :");
    if (url && url.trim()) {
      onChange(url.trim());
    }
  };

  const handleRemove = () => {
    onChange(undefined);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>
      
      {!document ? (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-3 text-center transition-colors
            ${isDragging 
              ? "border-[#B89C6D] bg-[#B89C6D]/10" 
              : "border-gray-300 hover:border-[#B89C6D]"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-1.5">
            <Upload className={`w-7 h-7 ${isDragging ? "text-[#B89C6D]" : "text-gray-400"}`} />
            <p className="text-xs font-medium">
              {isDragging ? "Déposez le document ici" : "Glissez-déposez votre document"}
            </p>
            <p className="text-xs text-gray-500 mb-1">ou</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBrowse}
                className="px-2.5 py-1 bg-[#B89C6D] text-white text-xs rounded hover:bg-[#A68B5D] transition"
              >
                Parcourir
              </button>
              <button
                type="button"
                onClick={handleUrlAdd}
                className="px-2.5 py-1 border border-[#B89C6D] text-[#B89C6D] text-xs rounded hover:bg-[#B89C6D] hover:text-white transition"
              >
                Ajouter par URL
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Format PDF
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-2.5 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#B89C6D]" />
            <div>
              <p className="text-xs font-medium">Document uploadé</p>
              <p className="text-xs text-gray-600 truncate max-w-xs" title={document}>
                {document.startsWith("data:") ? "Base64" : document}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
            title="Supprimer ce document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
