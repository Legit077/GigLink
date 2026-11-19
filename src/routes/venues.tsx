import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapPin, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CityFilter } from "@/components/CityFilter";
import { VenueGallery } from "@/components/VenueGallery";
import { supabase } from "@/integrations/supabase/client";
import { ALL_CITIES } from "@/lib/cities";

export const Route = createFileRoute("/venues")({
  head: () => ({
    meta: [
      { title: "Venues — GigLink" },
      {
        name: "description",
        content:
          "Restaurants, bars, cafés and event spaces hosting live music in Kathmandu, Pokhara, Chitwan, Dharan and other cities across Nepal, with verified capacities.",
      },
      { property: "og:title", content: "Venues — GigLink" },
      {
        property: "og:description",
        content: "Live music venues across Nepal and their verified guest capacities.",
      },
    ],
  }),
  component: VenuesPage,
});

function VenuesPage() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>(ALL_CITIES);

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const cities = useMemo(
    () => Array.from(new Set(venues.map((v) => v.city).filter(Boolean))).sort(),
    [venues],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return venues.filter((v) => {
      if (city !== ALL_CITIES && v.city !== city) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q) ||
        v.venue_type.toLowerCase().includes(q)
      );
    });
  }, [venues, search, city]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Venues</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Live music spaces across Nepal. Capacities listed here are used to validate expected
        attendance on every booking request.
      </p>

      <div className="surface-card mt-6 space-y-4 p-4">
        <div className="relative sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, type or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search venues"
          />
        </div>
        <CityFilter cities={cities} value={city} onChange={setCity} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {isLoading
          ? "Loading venues…"
          : `${filtered.length} ${filtered.length === 1 ? "venue" : "venues"}${
              city === ALL_CITIES ? " across Nepal" : ` in ${city}`
            }`}
      </p>

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-card h-40 animate-pulse p-5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card mt-6 p-8 text-center">
          <p className="font-medium">No venues match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different city or clear your search.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearch("");
              setCity(ALL_CITIES);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <article key={v.id} className="surface-card p-5">
              <VenueGallery images={v.images ?? []} name={v.name} />
              <div className="mt-4 flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{v.name}</h2>
                <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {v.venue_type.replace("_", " ")}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{v.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {v.address}
                </span>
                <span className="inline-flex items-center gap-1 text-primary">
                  <Users className="size-3.5" /> {v.max_capacity}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
