/**
 * Northmarket, the fictional resale marketplace this demo runs.
 *
 * Everything here is the shop's own content - its listings and the countries
 * it onboards sellers from. None of it is Didit data: every verification,
 * decision, score and rule result on the page comes from the live API.
 */
export const BRAND = {
  name: "Northmarket",
  tagline: "Pre-owned design, watches and gear, from verified shops.",
} as const;

/** Every amount in the demo is EUR, the currency the rules are written in. */
export const CURRENCY = "EUR";

/**
 * Orders at or above this amount are held by the step-up rule until the buyer
 * passes an age check (see lib/marketplace/setup.ts).
 */
export const HIGH_VALUE_THRESHOLD = 1000;

export interface Listing {
  id: string;
  title: string;
  detail: string;
  price: number;
  /** A lucide icon name rendered by the storefront. */
  icon: "camera" | "watch" | "bike" | "headphones" | "armchair" | "lamp";
}

export const LISTINGS: Listing[] = [
  {
    id: "film-camera",
    title: "Rangefinder film camera",
    detail: "1970s body, serviced, 50 mm lens",
    price: 180,
    icon: "camera",
  },
  {
    id: "headphones",
    title: "Studio headphones",
    detail: "Open-back, boxed, two pads",
    price: 240,
    icon: "headphones",
  },
  {
    id: "lounge-chair",
    title: "Mid-century lounge chair",
    detail: "Walnut and leather, restored",
    price: 1450,
    icon: "armchair",
  },
  {
    id: "dive-watch",
    title: "Automatic dive watch",
    detail: "Box and papers, 2019",
    price: 2900,
    icon: "watch",
  },
  {
    id: "desk-lamp",
    title: "Designer desk lamp",
    detail: "Original 1980s edition, rewired",
    price: 320,
    icon: "lamp",
  },
  {
    id: "gravel-bike",
    title: "Carbon gravel bike",
    detail: "Size M, 1,200 km",
    price: 640,
    icon: "bike",
  },
];

export function getListing(id: string): Listing | undefined {
  return LISTINGS.find((listing) => listing.id === id);
}

/**
 * Registry countries the seller KYB workflow searches, all at the UBO tier
 * (https://docs.didit.me/getting-started/kyb-registry-pricing).
 */
export const SELLER_COUNTRIES: { code: string; name: string }[] = [
  { code: "ES", name: "Spain" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "IT", name: "Italy" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
];

export function isSellerCountry(code: string): boolean {
  return SELLER_COUNTRIES.some((country) => country.code === code);
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
