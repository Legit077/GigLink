/**
 * Single source of truth for GigLink's public contact details.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ REPLACE THESE WITH THE REAL ONES BEFORE LAUNCH.                 │
 * │ They are wired into a mailto: and a tel: link in the footer, so │
 * │ shipping them as-is sends people to an address nobody reads.    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Set either value to null to hide that link entirely — better an absent
 * link than a dead one.
 */

export const SITE_CONTACT = {
  /** Shown as the link text and used for the mailto: href. */
  email: "hello@giglink.com.np" as string | null,

  /**
   * `display` is what people read; `dial` is what the phone actually calls.
   * `dial` must be in E.164 (leading +, country code, no spaces or dashes)
   * or Android and iOS will mangle it.
   */
  phone: {
    display: "+977 1-4000000",
    dial: "+97714000000",
  } as { display: string; dial: string } | null,
} as const;
