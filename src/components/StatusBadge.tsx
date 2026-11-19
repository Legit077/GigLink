import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "primary";

const TONE_BY_STATUS: Record<string, Tone> = {
  confirmed: "success",
  accepted: "success",
  open: "warning",
  pending: "warning",
  filled: "primary",
  completed: "primary",
  declined: "danger",
  rejected: "danger",
  cancelled: "danger",
  blocked: "danger",
  closed: "neutral",
  withdrawn: "neutral",
};

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  primary: "bg-primary/15 text-primary border-primary/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  className,
  label,
}: {
  status: string;
  className?: string;
  label?: string;
}) {
  const tone = TONE_BY_STATUS[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        TONE_CLASS[tone],
        className,
      )}
    >
      {label ?? status}
    </span>
  );
}
