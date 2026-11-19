import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * An empty section should tell someone what belongs there and give them a way
 * to put it there. A bare "No bookings yet." does neither.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Usually a Button. Omit for sections the person can't act on directly. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col items-center px-6 py-10 text-center",
        "border-dashed bg-transparent",
        className,
      )}
    >
      {Icon && (
        <span
          className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
      )}
      <p className={cn("font-medium text-foreground", Icon && "mt-4")}>{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
