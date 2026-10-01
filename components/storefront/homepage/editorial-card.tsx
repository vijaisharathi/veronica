import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import { EditorialStory } from "@/types/homepage";

export interface EditorialCardProps {
  story: EditorialStory;
  priority?: boolean;
}

export function EditorialCard({ story, priority = false }: EditorialCardProps) {
  return (
    <article className="group flex flex-col rounded-xl overflow-hidden bg-surface border border-border/70 transition-all duration-300 hover:shadow-subtle">
      {/* Editorial Image Frame */}
      <Link
        href={story.href}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={story.image}
          alt={story.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 rounded bg-neutral-950/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-mono tracking-wider text-amber-300 uppercase">
            {story.eyebrow}
          </span>
        </div>
      </Link>

      {/* Editorial Content */}
      <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{story.readTime}</span>
            {story.author && (
              <>
                <span>•</span>
                <span>{story.author}</span>
              </>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-serif font-normal text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors leading-snug">
            <Link href={story.href} className="focus-visible:outline-none focus-visible:underline">
              {story.title}
            </Link>
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 font-light">
            {story.description}
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={story.href}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-foreground hover:text-neutral-500 transition-colors group/link"
          >
            <span>Read Story</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}
