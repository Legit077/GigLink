import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { ArtistCard, type ArtistSummary } from "@/components/artist-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { GENRES } from "@/lib/genres";

type ArtistSearch = { q: string; genre: string };

export const Route = createFileRoute("/artists/")({
  validateSearch: (search: Record<string, unknown>): ArtistSearch => ({
    q: typeof search.q === "string" ? search.q : "",
    genre: typeof search.genre === "string" ? search.genre : "",
  }),
  head: () => ({
    meta: [
      { title: "Browse Artists by Genre | GigLink" },
      {
        name: "description",
        content:
          "Search bands and solo artists on GigLink by genre, city or name and send a booking request for your venue or event.",
      },
      { property: "og:title", content: "Browse Artists by Genre | GigLink" },
      {
        property: "og:description",
        content: "Search bands and solo artists by genre and city, then book them for your event.",
      },
    ],
  }),
  component: ArtistsPage,
  errorComponent: ({ error }) => (
    <p role="alert" className="mx-auto max-w-6xl px-4 py-20 text-destructive">
      {error.message}
    </p>
  ),
});

function ArtistsPage() {
  const { q, genre } = Route.useSearch();
  const navigate = useNavigate({ from: "/artists" });

  const { data, isLoading } = useQuery({
    queryKey: ["artists", q, genre],
    queryFn: async () => {
      let query = supabase
        .from("artists")
        .select("id, stage_name, kind, genres, city, bio, image_url, hourly_rate, members")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (q) query = query.or(`stage_name.ilike.%${q}%,city.ilike.%${q}%`);
      if (genre) query = query.contains("genres", [genre]);
      const { data, error } = await query;
      if (error) throw error;
      return data as ArtistSummary[];
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-4xl md:text-5xl">Find your act</h1>
      <p className="mt-2 text-muted-foreground">
        Filter bands and solo artists by genre, city or name.
      </p>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          placeholder="Search by name or city…"
          className="pl-9"
          onChange={(e) =>
            navigate({ search: (prev: ArtistSearch) => ({ ...prev, q: e.target.value }), replace: true })
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <GenreChip active={genre === ""} onClick={() => navigate({ search: (p: ArtistSearch) => ({ ...p, genre: "" }) })}>
          All
        </GenreChip>
        {GENRES.map((g) => (
          <GenreChip
            key={g}
            active={genre === g}
            onClick={() => navigate({ search: (p: ArtistSearch) => ({ ...p, genre: g === genre ? "" : g }) })}
          >
            {g}
          </GenreChip>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-center text-muted-foreground">No artists match that search yet.</p>
      )}
    </div>
  );
}

function GenreChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-4 py-1.5 text-sm transition-colors " +
        (active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary")
      }
    >
      {children}
    </button>
  );
}