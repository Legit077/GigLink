import { Link } from "@tanstack/react-router";
import { MapPin, Star, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import artistPlaceholder from "@/assets/artist-placeholder.jpg";

export type ArtistSummary = {
  id: string;
  stage_name: string;
  kind: "band" | "solo";
  genres: string[];
  city: string | null;
  bio: string | null;
  image_url: string | null;
  hourly_rate: number | null;
  members: number;
  rating?: number | null;
  reviewCount?: number;
};

export function ArtistCard({ artist }: { artist: ArtistSummary }) {
  return (
    <Link
      to="/artists/$artistId"
      params={{ artistId: artist.id }}
      className="group flex flex-col overflow-hidden rounded-xl card-surface transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={artist.image_url || artistPlaceholder}
          alt={`${artist.stage_name} performing`}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge className="absolute left-3 top-3 bg-stage text-primary-foreground capitalize">
          {artist.kind}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-2xl leading-none">{artist.stage_name}</h3>
          {artist.rating ? (
            <span className="flex items-center gap-1 text-sm text-primary">
              <Star className="size-4 fill-current" /> {artist.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{artist.bio || "No bio yet."}</p>
        <div className="flex flex-wrap gap-1">
          {artist.genres.slice(0, 3).map((g) => (
            <Badge key={g} variant="secondary" className="text-xs">
              {g}
            </Badge>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {artist.city || "Anywhere"}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" /> {artist.members} {artist.members === 1 ? "member" : "members"}
          </span>
          {artist.hourly_rate ? (
            <span className="ml-auto font-semibold text-primary">${artist.hourly_rate}/hr</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}