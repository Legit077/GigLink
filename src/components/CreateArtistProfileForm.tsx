import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export function CreateArtistProfileForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    artistType: "band" as "band" | "solo",
    city: "",
    genres: "",
    hourlyRate: "",
    bio: "",
  });

  async function submit() {
    if (form.name.trim().length < 2) {
      toast.error("Please enter your artist or band name.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("artists").insert({
      user_id: userId,
      name: form.name.trim(),
      artist_type: form.artistType,
      city: form.city.trim(),
      location: form.city.trim(),
      genres: form.genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      hourly_rate: form.hourlyRate === "" ? null : Number(form.hourlyRate),
      bio: form.bio.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "You already have an artist profile." : error.message);
      void queryClient.invalidateQueries({ queryKey: ["artist-dashboard"] });
      return;
    }
    toast.success("Artist profile created.");
    void queryClient.invalidateQueries({ queryKey: ["artist-dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["artists"] });
  }

  return (
    <div className="surface-card mx-auto max-w-xl space-y-4 p-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Create your artist profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what organizers see when they find you on GigLink.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="artist-name">Artist / band name</Label>
        <Input
          id="artist-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="artist-type">Type</Label>
          <select
            id="artist-type"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.artistType}
            onChange={(e) => setForm({ ...form, artistType: e.target.value as "band" | "solo" })}
          >
            <option value="band">Band</option>
            <option value="solo">Solo</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="artist-city">City</Label>
          <Input
            id="artist-city"
            placeholder="Kathmandu"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="artist-genres">Genres (comma separated)</Label>
          <Input
            id="artist-genres"
            placeholder="Rock, Folk"
            value={form.genres}
            onChange={(e) => setForm({ ...form, genres: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="artist-rate">Hourly rate (NPR)</Label>
          <Input
            id="artist-rate"
            type="number"
            min={0}
            value={form.hourlyRate}
            onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="artist-bio">Bio</Label>
        <Textarea
          id="artist-bio"
          rows={3}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
      </div>
      <Button onClick={submit} disabled={saving}>
        {saving ? "Creating…" : "Create profile"}
      </Button>
    </div>
  );
}
