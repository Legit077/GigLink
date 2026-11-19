import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { detectPlatform, isValidUrl, normalizeUrl, type ArtistLink } from "@/lib/links";

export function ArtistLinksEditor({
  artistId,
  links,
  onSaved,
}: {
  artistId: string;
  links: ArtistLink[];
  onSaved: () => void;
}) {
  const [items, setItems] = useState<ArtistLink[]>(links);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function persist(next: ArtistLink[]) {
    setSaving(true);
    const { error } = await supabase.from("artists").update({ links: next }).eq("id", artistId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setItems(next);
    onSaved();
    return true;
  }

  async function addLink() {
    if (!isValidUrl(url)) {
      toast.error("Enter a valid link, for example spotify.com/artist/…");
      return;
    }
    const clean = normalizeUrl(url);
    if (items.some((i) => i.url === clean)) {
      toast.error("That link is already on your profile.");
      return;
    }
    const ok = await persist([
      ...items,
      { url: clean, label: label.trim() || detectPlatform(clean) },
    ]);
    if (ok) {
      setUrl("");
      setLabel("");
      toast.success("Link added to your profile.");
    }
  }

  async function removeLink(target: string) {
    const ok = await persist(items.filter((i) => i.url !== target));
    if (ok) toast.success("Link removed.");
  }

  return (
    <div className="surface-card p-5">
      <p className="text-sm text-muted-foreground">
        Add the places where organizers can hear and see you perform — Spotify, TikTok, YouTube,
        Instagram, SoundCloud or your own site.
      </p>

      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((link) => (
            <li
              key={link.url}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{link.label}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block truncate text-xs text-muted-foreground hover:text-primary"
                >
                  {link.url}
                </a>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${link.label}`}
                disabled={saving}
                onClick={() => removeLink(link.url)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="link-url">Link</Label>
          <Input
            id="link-url"
            value={url}
            placeholder="https://open.spotify.com/artist/…"
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link-label">Label (optional)</Label>
          <Input
            id="link-label"
            value={label}
            placeholder={url ? detectPlatform(url) : "Spotify"}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <Button onClick={addLink} disabled={saving}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </div>
  );
}
