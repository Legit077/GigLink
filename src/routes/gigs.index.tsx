import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import gigBoardImage from "@/assets/gig-board.jpg";
import { GigBoard } from "@/components/gig-board";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/gigs/")({
  head: () => ({
    meta: [
      { title: "Open Gigs for Bands & Solo Artists | GigLink" },
      {
        name: "description",
        content:
          "Browse open gigs by genre, city, date and payment. See venue capacity, expected attendance and apply with your own offer.",
      },
      { property: "og:title", content: "Open Gigs for Bands & Solo Artists | GigLink" },
      { property: "og:description", content: "Find paid gigs near you and send an offer to the organizer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GigsPage,
});

function GigsPage() {
  const { userId } = useAuth();

  const { data: artist } = useQuery({
    queryKey: ["my-artist", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("artists").select("id").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="relative overflow-hidden rounded-2xl">
        <img
          src={gigBoardImage}
          alt="Empty restaurant stage lit before a live music night"
          width={1600}
          height={912}
          className="h-56 w-full object-cover md:h-72"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute bottom-0 left-0 p-6 md:p-8">
          <h1 className="text-4xl md:text-5xl">Gig board</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Every open night posted by venues and organizers — filter by genre, city, date and pay, then send your offer.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <GigBoard artistId={artist?.id ?? null} />
      </div>
    </div>
  );
}