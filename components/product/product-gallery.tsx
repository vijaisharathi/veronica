"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductGalleryProps {
  images: string[];
  title: string;
  className?: string;
}

/**
 * VÉRONA — Luxury Product Media Gallery
 *
 * Implements high-performance LCP image loading with Next.js Image,
 * thumbnail switching, keyboard arrow navigation, zoom toggle, and mobile carousel indicators.
 */
export function ProductGallery({ images, title, className }: ProductGalleryProps) {
  const safeImages = images.length > 0 ? images : ["/images/placeholder.svg"];
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isZoomed, setIsZoomed] = React.useState(false);
  const galleryRef = React.useRef<HTMLDivElement>(null);

  // Keep index in bounds if image count changes (e.g. when switching color variant)
  React.useEffect(() => {
    if (selectedIndex >= safeImages.length) {
      setSelectedIndex(0);
    }
  }, [safeImages, selectedIndex]);

  const selectedImage = safeImages[selectedIndex] || safeImages[0] || "/images/placeholder.svg";

  const handlePrev = React.useCallback(() => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : safeImages.length - 1));
  }, [safeImages.length]);

  const handleNext = React.useCallback(() => {
    setSelectedIndex((prev) => (prev < safeImages.length - 1 ? prev + 1 : 0));
  }, [safeImages.length]);

  // Keyboard navigation for arrow keys and escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture if gallery is focused or inside the gallery area
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape" && isZoomed) {
        setIsZoomed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, isZoomed]);

  return (
    <div
      ref={galleryRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} Media Gallery`}
      className={cn("flex flex-col-reverse lg:flex-row gap-4 select-none", className)}
    >
      {/* Thumbnail Strip */}
      {safeImages.length > 1 && (
        <div
          role="tablist"
          aria-label="Thumbnail views"
          className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto hide-scrollbar shrink-0 py-1"
        >
          {safeImages.map((img, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`View ${title} silhouette angle ${idx + 1}`}
                onClick={() => {
                  setSelectedIndex(idx);
                  setIsZoomed(false);
                }}
                className={cn(
                  "relative h-20 w-16 sm:h-24 sm:w-20 shrink-0 overflow-hidden rounded border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
                  isSelected
                    ? "border-neutral-950 ring-1 ring-neutral-950 opacity-100 dark:border-white dark:ring-white"
                    : "border-border/80 opacity-70 hover:opacity-100"
                )}
              >
                <Image
                  src={img}
                  alt={`${title} — Thumbnail view ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Main Feature Image Container */}
      <div className="relative flex-1 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-border/60 aspect-[3/4]">
        <div
          className={cn(
            "relative w-full h-full transition-transform duration-300",
            isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
          )}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <Image
            src={selectedImage}
            alt={`${title} — Atelier fashion view ${selectedIndex + 1}`}
            fill
            priority={selectedIndex === 0}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 650px"
            className="object-cover object-center"
          />
        </div>

        {/* Previous & Next Navigation Buttons */}
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-800 shadow-sm backdrop-blur-sm hover:bg-white transition-all dark:bg-neutral-900/90 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              aria-label="Previous view"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-800 shadow-sm backdrop-blur-sm hover:bg-white transition-all dark:bg-neutral-900/90 dark:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              aria-label="Next view"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Bottom Controls: Zoom and Counter Badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Image Counter Badge */}
          {safeImages.length > 1 ? (
            <span className="rounded-full bg-neutral-950/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono text-white tracking-widest pointer-events-auto">
              {selectedIndex + 1} / {safeImages.length}
            </span>
          ) : (
            <div />
          )}

          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }}
            className="rounded-full bg-white/90 p-2 text-neutral-800 shadow-sm backdrop-blur-sm hover:bg-white transition-colors dark:bg-neutral-900/90 dark:text-neutral-100 pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            aria-label={isZoomed ? "Reset zoom" : "Zoom into image"}
            title={isZoomed ? "Reset zoom" : "Zoom into image"}
          >
            {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
