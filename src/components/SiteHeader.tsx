import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Music4, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const PUBLIC_LINKS = [
  { to: "/artists", label: "Artists" },
  { to: "/venues", label: "Venues" },
  { to: "/gigs", label: "Gig board" },
] as const;

export function SiteHeader() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close on navigation. Each link already closes itself, but this also covers
  // back/forward and any programmatic navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes the panel, matching every other dismissible surface here.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const dashboardTo =
    role === "admin" ? "/admin" : role === "organizer" ? "/organizer" : "/dashboard";

  const links = [
    ...PUBLIC_LINKS,
    ...(user ? [{ to: dashboardTo, label: "Dashboard" } as const] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Music4 className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">GigLink</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                await navigate({ to: "/" });
              }}
            >
              Sign out
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
              Sign in
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="tap-target inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className={cn("border-t border-border bg-background md:hidden", open ? "block" : "hidden")}
      >
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 pad-safe-bottom"
        >
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={async () => {
                setOpen(false);
                await signOut();
                await navigate({ to: "/" });
              }}
            >
              Sign out
            </Button>
          ) : (
            <Button
              size="sm"
              className="mt-2"
              onClick={() => {
                setOpen(false);
                void navigate({ to: "/auth" });
              }}
            >
              Sign in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
