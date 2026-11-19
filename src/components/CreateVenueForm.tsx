import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export function CreateVenueForm({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    venueType: "",
    capacity: "",
    description: "",
  });

  async function submit() {
    const capacity = Number(form.capacity);
    if (form.name.trim().length < 2) {
      toast.error("Please enter the venue name.");
      return;
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      toast.error("Please enter a capacity of at least 1.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("venues").insert({
      owner_id: userId,
      name: form.name.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      ...(form.venueType.trim() ? { venue_type: form.venueType.trim() } : {}),
      max_capacity: Math.floor(capacity),
      description: form.description.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Venue added.");
    setForm({ name: "", city: "", address: "", venueType: "", capacity: "", description: "" });
    void queryClient.invalidateQueries({ queryKey: ["organizer-dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["venues"] });
  }

  return (
    <div className="surface-card max-w-xl space-y-4 p-6">
      <div>
        <h3 className="font-display text-lg font-semibold">Add a venue</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Venues you add can be used when posting gigs and booking artists.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="venue-name">Venue name</Label>
        <Input
          id="venue-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="venue-city">City</Label>
          <Input
            id="venue-city"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-capacity">Max capacity</Label>
          <Input
            id="venue-capacity"
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="venue-address">Address</Label>
          <Input
            id="venue-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue-type">Venue type</Label>
          <Input
            id="venue-type"
            placeholder="Bar, café, hall…"
            value={form.venueType}
            onChange={(e) => setForm({ ...form, venueType: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="venue-desc">Description</Label>
        <Textarea
          id="venue-desc"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <Button onClick={submit} disabled={saving}>
        {saving ? "Adding…" : "Add venue"}
      </Button>
    </div>
  );
}
