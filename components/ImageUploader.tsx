"use client";
import { useState, useRef, useEffect, DragEvent } from "react";
import { Upload, X, Image as ImageIcon, ChevronUp, ChevronDown, GripVertical } from "lucide-react";

type ImageUploaderProps = {
  images: string[];
  onChange: (images: string[]) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

export default function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<string[]>(images);

  // Keep ref in sync with latest images prop
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

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
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    
    if (imageFiles.length > 0) {
      processFiles(imageFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const readAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) resolve(dataUrl);
        else reject(new Error("Failed to read file"));
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const uploadToCloudinary = async (dataUrl: string): Promise<string> => {
    const res = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Échec de l'upload");
    }
    return data.url;
  };

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}" dépasse 10 Mo et a été ignorée.`);
        return false;
      }
      return true;
    });
    if (!validFiles.length) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: validFiles.length });

    const uploadedUrls: string[] = [];
    for (const file of validFiles) {
      try {
        const dataUrl = await readAsDataUrl(file);
        const url = await uploadToCloudinary(dataUrl);
        uploadedUrls.push(url);
      } catch (error) {
        console.error("Error uploading file:", error);
        alert(`Erreur lors de l'upload de "${file.name}" : ${error instanceof Error ? error.message : error}`);
      }
      setUploadProgress(prev => (prev ? { ...prev, done: prev.done + 1 } : prev));
    }

    if (uploadedUrls.length) {
      // Use ref to get latest images state to avoid race conditions
      onChange([...imagesRef.current, ...uploadedUrls]);
    }
    setUploading(false);
    setUploadProgress(null);
  };

  const handleUrlAdd = () => {
    const url = prompt("Entrez l'URL de l'image :");
    if (url && url.trim()) {
      onChange([...images, url.trim()]);
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    onChange(newImages);
  };

  const handleMoveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    onChange(newImages);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Zone de glisser-déposer */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? "border-[#B89C6D] bg-[#B89C6D]/10" 
            : "border-gray-300 hover:border-[#B89C6D]"
          }
        `}
        data-testid="dropzone-images"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-file-images"
        />
        
        <div className="flex flex-col items-center gap-3">
          <Upload className={`w-12 h-12 ${isDragging ? "text-[#B89C6D]" : "text-gray-400"}`} />
          {uploading ? (
            <p className="text-sm font-medium text-gray-600" data-testid="text-upload-progress">
              Envoi en cours{uploadProgress ? ` (${uploadProgress.done}/${uploadProgress.total})` : "..."}
            </p>
          ) : (
            <>
              <div>
                <p className="text-lg font-medium mb-1">
                  {isDragging ? "Déposez les images ici" : "Glissez-déposez vos images"}
                </p>
                <p className="text-sm text-gray-500 mb-3">
                  ou
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={handleBrowse}
                    disabled={uploading}
                    className="px-4 py-2 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D] transition disabled:opacity-50"
                    data-testid="button-browse-images"
                  >
                    Parcourir les fichiers
                  </button>
                  <button
                    type="button"
                    onClick={handleUrlAdd}
                    disabled={uploading}
                    className="px-4 py-2 border border-[#B89C6D] text-[#B89C6D] rounded hover:bg-[#B89C6D] hover:text-white transition disabled:opacity-50"
                    data-testid="button-add-url"
                  >
                    Ajouter par URL
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Formats supportés : JPG, PNG, WEBP • Sélection multiple possible • 10 Mo max par image
              </p>
            </>
          )}
        </div>
      </div>

      {/* Grille des images */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Images ajoutées ({images.length})</h4>
            <p className="text-xs text-gray-500">
              Utilisez les flèches pour changer l&apos;ordre
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div 
                key={idx} 
                className="group relative border rounded-lg overflow-hidden hover:border-[#B89C6D] transition bg-white"
              >
                {/* Image de prévisualisation */}
                <div className="aspect-video bg-gray-100 relative">
                  {img.startsWith("data:") || img.startsWith("http") || img.startsWith("/") ? (
                    <img
                      src={img}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Badge numéro et image principale */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    <span className="bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
                      #{idx + 1}
                    </span>
                    {idx === 0 && (
                      <span className="bg-[#B89C6D] text-white text-xs font-semibold px-2 py-1 rounded">
                        Principale
                      </span>
                    )}
                  </div>

                  {/* Contrôles (apparaissent au survol) */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {/* Réorganisation */}
                    <div className="flex gap-1 bg-white rounded shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-2 text-gray-700 hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Déplacer vers le haut"
                        data-testid={`button-move-up-${idx}`}
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>
                      <div className="w-px bg-gray-300"></div>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === images.length - 1}
                        className="p-2 text-gray-700 hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Déplacer vers le bas"
                        data-testid={`button-move-down-${idx}`}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Suppression */}
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-2 bg-red-500 text-white rounded shadow-lg hover:bg-red-600 transition"
                      title="Supprimer cette image"
                      data-testid={`button-remove-image-${idx}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Informations sous l'image */}
                <div className="p-2 bg-gray-50">
                  <p className="text-xs text-gray-600 truncate" title={img}>
                    {img.startsWith("data:") ? "Image encodée (Base64)" : img}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
