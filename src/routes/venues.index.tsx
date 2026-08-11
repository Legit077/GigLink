import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/venues/")({
  head: () => ({
    meta: [
      { title: "Venues & Restaurants Hosting Live Music | GigLink" },
      {
        name: "description",
        content:
          "Browse restaurants and event venues on GigLink, with capacity and expected guest counts for every room.",
      },
      { property: "og:title", content: "Venues & Restaurants Hosting Live Music | GigLink" },
      {
        property: "og:description",
        content: "Restaurants and event spaces looking for live music, with capacity details.",
      },
    ],
  }),
  component: VenuesPage,
  errorComponent: ({ error }) => (
    <p role="alert" className="mx-auto max-w-6xl px-4 py-20 text-destructive">
      {error.message}
    </p>
  ),
});

function VenuesPage() {
  const { data } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-4xl md:text-5xl">Venues & restaurants</h1>
      <p className="mt-2 text-muted-foreground">
        Rooms looking for live music, with capacity and expected guest counts.
      </p>

      {data && data.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((v) => (
            <article key={v.id} className="rounded-xl p-5 card-surface">
              <h2 className="text-2xl">{v.name}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" /> {v.city || "Unknown city"}
              </p>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {v.description || "No description yet."}
              </p>
              <p className="mt-4 flex items-center gap-1 text-sm text-primary">
                <Users className="size-4" /> Capacity {v.capacity} · expecting {v.expected_guests}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-12 text-center text-muted-foreground">No venues listed yet.</p>
      )}
    </div>
  );
}