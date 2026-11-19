import { useState } from "react";
import { ImageOff } from "lucide-react";

export function VenueGallery({ images, name }: { images: string[]; name: string }) {
  const [broken, setBroken] = useState<string[]>([]);
  const usable = images.filter((src) => !broken.includes(src));

  if (usable.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border bg-surface-2 text-xs text-muted-foreground">
        <ImageOff className="mr-2 size-4" /> No photos yet
      </div>
    );
  }

  const cover = usable[0] as string;
  const rest = usable.slice(1);

  return (
    <div className="space-y-2">
      <img
        src={cover}
        alt={`${name} event space`}
        loading="lazy"
        decoding="async"
        width={400}
        height={160}
        onError={() => setBroken((b) => [...b, cover])}
        className="h-40 w-full rounded-md border border-border object-cover"
      />
      {rest.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {rest.slice(0, 3).map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`${name} photo ${i + 2}`}
              loading="lazy"
              decoding="async"
              width={130}
              height={64}
              onError={() => setBroken((b) => [...b, src])}
              className="h-16 w-full rounded-md border border-border object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}
