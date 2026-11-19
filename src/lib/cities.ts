/** Major cities covered by GigLink across Nepal. */
export const CITIES = [
  "Kathmandu",
  "Lalitpur",
  "Bhaktapur",
  "Pokhara",
  "Chitwan",
  "Butwal",
  "Biratnagar",
  "Dharan",
  "Birgunj",
  "Nepalgunj",
  "Hetauda",
  "Itahari",
] as const;

export type City = (typeof CITIES)[number];

export const ALL_CITIES = "All cities";

/** Best-effort city label from a free-text address such as "Thamel, Kathmandu". */
export function cityFromAddress(address: string | null | undefined): string {
  if (!address) return "";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? "";
}
