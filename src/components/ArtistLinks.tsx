import { ExternalLink } from "lucide-react";
import type { ArtistLink } from "@/lib/links";

export function ArtistLinks({ links }: { links: ArtistLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {link.label}
          <ExternalLink className="size-3" />
        </a>
      ))}
    </div>
  );
}
