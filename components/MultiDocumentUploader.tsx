"use client";
import { useState, useRef, DragEvent } from "react";
import { Upload, X, FileText } from "lucide-react";

type MultiDocumentUploaderProps = {
  documents: string[];
  onChange: (documents: string[]) => void;
  label: string;
  maxDocuments?: number;
  accept?: string;
};

export default function MultiDocumentUploader({ 
  documents, 
  onChange, 
  label, 
  maxDocuments = 3,
  accept = ".pdf" 
}: MultiDocumentUploaderProps) {
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
    const docFiles = files.filter(file => file.type === "application/pdf" || file.name.endsWith('.pdf'));
    
    if (docFiles.length > 0) {
      processFiles(docFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    const availableSlots = maxDocuments - documents.length;
    const filesToProcess = files.slice(0, availableSlots);

    const promises = filesToProcess.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            resolve(dataUrl);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      });
    });

    try {
      const newUrls = await Promise.all(promises);
      onChange([...documents, ...newUrls]);
    } catch (error) {
      console.error('Error processing files:', error);
      alert(`Erreur lors du chargement de certains documents: ${error}`);
    }
  };

  const handleUrlAdd = () => {
    if (documents.length >= maxDocuments) {
      alert(`Vous ne pouvez ajouter que ${maxDocuments} documents maximum.`);
      return;
    }
    const url = prompt("Entrez l'URL du document :");
    if (url && url.trim()) {
      onChange([...documents, url.trim()]);
    }
  };

  const handleRemove = (index: number) => {
    const newDocuments = documents.filter((_, i) => i !== index);
    onChange(newDocuments);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = documents.length < maxDocuments;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        {label} ({documents.length}/{maxDocuments})
      </label>
      
      {canAddMore && (
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
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-1.5">
            <Upload className={`w-7 h-7 ${isDragging ? "text-[#B89C6D]" : "text-gray-400"}`} />
            <p className="text-xs font-medium">
              {isDragging ? "Déposez les documents ici" : "Glissez-déposez vos documents"}
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
              PDF • Max {maxDocuments}
            </p>
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map((doc, idx) => (
            <div 
              key={idx} 
              className="border rounded-lg p-2 bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-[#B89C6D] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">Document {idx + 1}</p>
                  <p className="text-xs text-gray-600 truncate" title={doc}>
                    {doc.startsWith("data:") ? "Base64" : doc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition flex-shrink-0 ml-2"
                title="Supprimer ce document"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
