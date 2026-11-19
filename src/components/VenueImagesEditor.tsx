import { useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, formatBytes } from "@/lib/compress-image";

const BUCKET = "venue-images";
/** Ceiling on what we'll upload, checked *after* compression. */
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
/** Ceiling on what we'll even try to decode, so a 200MB file can't lock the tab up. */
const MAX_SOURCE_BYTES = 30 * 1024 * 1024; // 30MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Path -> public URL, and public URL -> storage path (for delete). */
function publicUrlFor(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
function storagePathFrom(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  return i === -1 ? null : publicUrl.slice(i + marker.length);
}

export function VenueImagesEditor({
  ownerId,
  venueId,
  venueName,
  images,
  onSaved,
}: {
  ownerId: string;
  venueId: string;
  venueName: string;
  images: string[];
  onSaved: () => void;
}) {
  const [items, setItems] = useState<string[]>(images);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<"idle" | "compressing" | "uploading">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function persist(next: string[]) {
    setSaving(true);
    const { error } = await supabase.from("venues").update({ images: next }).eq("id", venueId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setItems(next);
    onSaved();
    return true;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const chosen = Array.from(files);
    const uploaded: string[] = [];
    let bytesSaved = 0;

    setUploading(true);
    for (const original of chosen) {
      if (!ACCEPTED_TYPES.includes(original.type)) {
        toast.error(`${original.name} isn't a supported image type.`);
        continue;
      }
      if (original.size > MAX_SOURCE_BYTES) {
        toast.error(`${original.name} is too large to process. Keep photos under 30MB.`);
        continue;
      }

      // Resize and re-encode in the browser. A typical phone photo drops from
      // several MB to a couple hundred KB, so this also decides whether the
      // file clears MAX_FILE_BYTES below.
      setStage("compressing");
      const { file, originalBytes, compressedBytes } = await compressImage(original);

      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${original.name} is still larger than 5MB after compression.`);
        continue;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${ownerId}/${venueId}/${crypto.randomUUID()}.${ext}`;

      setStage("uploading");
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        // Immutable: the filename is a fresh UUID, so a given URL never changes.
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });

      if (error) {
        toast.error(`Upload failed for ${original.name}: ${error.message}`);
        continue;
      }

      // Tallied here, not at compression time, so a file that was skipped or
      // failed to upload can't inflate the reported saving.
      bytesSaved += originalBytes - compressedBytes;
      uploaded.push(publicUrlFor(path));
    }
    setUploading(false);
    setStage("idle");

    if (uploaded.length === 0) return;

    if (await persist([...items, ...uploaded])) {
      const label =
        uploaded.length === 1 ? "Photo uploaded." : `${uploaded.length} photos uploaded.`;
      toast.success(
        bytesSaved > 50 * 1024 ? `${label} Compressed to save ${formatBytes(bytesSaved)}.` : label,
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function removeImage(src: string) {
    const next = items.filter((s) => s !== src);
    if (!(await persist(next))) return;

    // Best-effort cleanup of the underlying file; the column update above is
    // the source of truth, so a failure here doesn't get surfaced to the user.
    const path = storagePathFrom(src);
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
  }

  return (
    <div className="surface-card p-5">
      <p className="font-medium">{venueName}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Add photos of your event space so organizers know what they are booking.
      </p>

      {items.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((src, i) => (
            <div key={src} className="group relative">
              <img
                src={src}
                alt={`${venueName} photo ${i + 1}`}
                loading="lazy"
                decoding="async"
                width={320}
                height={96}
                className="h-24 w-full rounded-md border border-border object-cover"
              />
              <Button
                size="icon"
                variant="outline"
                aria-label="Remove photo"
                disabled={saving}
                className="absolute right-1 top-1 size-7"
                onClick={() => removeImage(src)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Button
          variant="outline"
          disabled={saving || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {stage === "compressing"
            ? "Compressing…"
            : stage === "uploading"
              ? "Uploading…"
              : "Upload photos"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          JPEG, PNG, WEBP or GIF. Large photos are resized and compressed automatically.
        </p>
      </div>
    </div>
  );
}
