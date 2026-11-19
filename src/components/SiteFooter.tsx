import { Link } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import { SITE_CONTACT } from "@/lib/site-config";

const FOOTER_LINKS = [
  { to: "/artists", label: "Artists" },
  { to: "/venues", label: "Venues" },
  { to: "/gigs", label: "Gig board" },
] as const;

export function SiteFooter() {
  const { email, phone } = SITE_CONTACT;

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 pad-safe-bottom sm:flex-row sm:justify-between">
        <div className="max-w-sm">
          <p className="font-display text-base font-semibold">GigLink</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Connecting bands and solo musicians with the restaurants, venues and organizers booking
            them across Nepal.
          </p>
        </div>

        <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
          <nav aria-label="Footer">
            <h2 className="text-sm font-medium text-foreground">Browse</h2>
            <ul className="mt-3 space-y-1">
              {FOOTER_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="inline-flex items-center py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {(email || phone) && (
            <div>
              <h2 className="text-sm font-medium text-foreground">Get in touch</h2>
              <ul className="mt-3 space-y-1">
                {email && (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Mail className="size-4 shrink-0" aria-hidden="true" />
                      {/* Long addresses shouldn't widen the footer on a narrow phone. */}
                      <span className="break-all">{email}</span>
                    </a>
                  </li>
                )}
                {phone && (
                  <li>
                    <a
                      href={`tel:${phone.dial}`}
                      className="inline-flex items-center gap-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Phone className="size-4 shrink-0" aria-hidden="true" />
                      {phone.display}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} GigLink
        </div>
      </div>
    </footer>
  );
}
