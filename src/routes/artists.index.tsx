import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapPin, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CityFilter } from "@/components/CityFilter";
import { supabase } from "@/integrations/supabase/client";
import { formatNpr } from "@/lib/format";
import { ALL_CITIES } from "@/lib/cities";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/artists/")({
  head: () => ({
    meta: [
      { title: "Artist directory — GigLink" },
      {
        name: "description",
        content:
          "Browse bands and solo musicians available for hire in Kathmandu, Pokhara, Chitwan, Biratnagar and other major cities in Nepal, with genres, rates and live availability.",
      },
      { property: "og:title", content: "Artist directory — GigLink" },
      {
        property: "og:description",
        content: "Find bands and solo musicians for your venue or event anywhere in Nepal.",
      },
    ],
  }),
  component: ArtistsPage,
});

type Artist = {
  id: string;
  name: string;
  artist_type: string;
  genres: string[];
  bio: string | null;
  location: string;
  city: string;
  hourly_rate: number | null;
  members_count: number | null;
};

function ArtistsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "band" | "solo">("all");
  const [city, setCity] = useState<string>(ALL_CITIES);
  const [selected, setSelected] = useState<Artist | null>(null);

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ["artists-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, artist_type, genres, bio, location, city, hourly_rate, members_count")
        .eq("is_published", true)
        .eq("is_suspended", false)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Artist[];
    },
  });

  const cities = useMemo(
    () => Array.from(new Set(artists.map((a) => a.city).filter(Boolean))).sort(),
    [artists],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return artists.filter((a) => {
      if (type !== "all" && a.artist_type !== type) return false;
      if (city !== ALL_CITIES && a.city !== city) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.genres.some((g) => g.toLowerCase().includes(q))
      );
    });
  }, [artists, search, type, city]);

  const resetFilters = () => {
    setSearch("");
    setType("all");
    setCity(ALL_CITIES);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Artist directory</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Bands and solo musicians performing across Nepal — from Kathmandu and Pokhara to Chitwan,
        Butwal, Biratnagar and beyond.
      </p>

      <div className="surface-card mt-6 space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, genre or city"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search artists"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
            {(["all", "band", "solo"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
                  type === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "all" ? "All types" : t}
              </button>
            ))}
          </div>
        </div>

        <CityFilter cities={cities} value={city} onChange={setCity} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {isLoading
          ? "Loading artists…"
          : `${filtered.length} ${filtered.length === 1 ? "artist" : "artists"}${
              city === ALL_CITIES ? " across Nepal" : ` in ${city}`
            }`}
      </p>

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-card h-44 animate-pulse p-5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card mt-6 p-8 text-center">
          <p className="font-medium">No artists match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another city, or clear the filters to see everyone.
          </p>
          <Button variant="outline" className="mt-4" onClick={resetFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a)}
              className="surface-card p-5 text-left transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{a.name}</h2>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
                  {a.artist_type}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {a.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {g}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {a.city}
                </span>
                <span className="text-primary">{formatNpr(a.hourly_rate)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{selected.name}</DialogTitle>
                <DialogDescription className="capitalize">
                  {selected.artist_type} · {selected.genres.join(", ")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{selected.bio}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="City" value={selected.city} />
                  <Info label="Based in" value={selected.location} />
                  <Info label="Rate" value={formatNpr(selected.hourly_rate)} />
                  {selected.members_count && (
                    <Info
                      label="Members"
                      value={`${selected.members_count}`}
                      icon={<Users className="size-3.5" />}
                    />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button asChild>
                  <Link to="/artists/$artistId" params={{ artistId: selected.id }}>
                    View profile & availability
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 inline-flex items-center gap-1.5 font-medium">
        {icon}
        {value}
      </p>
    </div>
  );
}
