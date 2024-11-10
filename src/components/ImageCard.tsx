"use client";
import { Download } from "lucide-react";
import Image from "next/image";

export function ImageCard({ image }: { image: any }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = image.fileName || "image";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  return (
    <div
      key={image.id}
      className="group relative aspect-square bg-neutral-100 rounded-lg overflow-hidden"
    >
      <Image
        src={image.url}
        alt={image.fileName}
        className="w-full h-full object-cover"
        loading="lazy"
        width={100}
        height={100}
      />

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <button
          onClick={handleDownload}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 text-white"
          aria-label="Download image"
        >
          <Download className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
