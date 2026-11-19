import { MapPin } from "lucide-react";
import { ALL_CITIES } from "@/lib/cities";
import { cn } from "@/lib/utils";

type Props = {
  cities: string[];
  value: string;
  onChange: (city: string) => void;
  className?: string;
};

/** Horizontal, tappable city picker used on the browse pages. */
export function CityFilter({ cities, value, onChange, className }: Props) {
  const options = [ALL_CITIES, ...cities];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <MapPin className="size-3.5" /> City
      </span>
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {options.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => onChange(city)}
            aria-pressed={value === city}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              value === city
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface-2 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}
