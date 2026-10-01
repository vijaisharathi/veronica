"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PrimaryNavItem } from "@/config/navigation";

export interface MegaMenuProps {
  item: PrimaryNavItem;
  onClose: () => void;
}

export function MegaMenu({ item, onClose }: MegaMenuProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { megaMenu } = item;

  // Handle Escape key to close menu
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`${item.name} navigation menu`}
      className="absolute left-0 right-0 top-full z-40 bg-surface/98 backdrop-blur-md border-b border-border shadow-floating animate-fade-in dark:bg-neutral-950/98"
      onMouseLeave={onClose}
    >
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Category Columns */}
          <div className={`${megaMenu.featured ? "col-span-8" : "col-span-12"} grid grid-cols-3 gap-6`}>
            {megaMenu.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground border-b border-border/60 pb-2">
                  {section.title}
                </h4>
                <ul className="space-y-2">
                  {section.items.map((subItem, itemIdx) => (
                    <li key={itemIdx}>
                      <Link
                        href={subItem.href}
                        onClick={onClose}
                        className="group flex items-center justify-between text-xs text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors py-0.5 focus:outline-none focus:text-foreground"
                      >
                        <span className="group-hover:translate-x-1 transition-transform">
                          {subItem.label}
                        </span>
                        {subItem.isNew && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-medium ml-2">
                            New
                          </span>
                        )}
                        {subItem.isSale && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300 font-medium ml-2">
                            Sale
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Featured Editorial Drop */}
          {megaMenu.featured && (
            <div className="col-span-4 border-l border-border/80 pl-8">
              <Link
                href={megaMenu.featured.href}
                onClick={onClose}
                className="group block overflow-hidden rounded-lg relative aspect-[3/4] bg-neutral-100 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <Image
                  src={megaMenu.featured.src}
                  alt={megaMenu.featured.caption}
                  fill
                  sizes="(max-width: 1024px) 100vw, 350px"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300 mb-1">
                    {megaMenu.featured.tag}
                  </span>
                  <p className="text-sm font-serif font-light leading-snug">
                    {megaMenu.featured.caption}
                  </p>
                  <span className="mt-2 inline-flex items-center text-xs font-mono tracking-wider text-neutral-300 group-hover:text-white">
                    Explore Drop <ArrowRight className="ml-1.5 h-3 w-3" />
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
