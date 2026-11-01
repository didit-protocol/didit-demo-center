/**
 * Northmarket's own shop content for the Demo Center screens: the photos,
 * the listings, the fictional people and the checkout of the 1,497 EUR order.
 *
 * None of it is Didit data. Every verification, decision, score and rule
 * result the screens show comes from the visitor's own Didit records.
 */
import type { Listing } from "./catalog.ts";

import { HIGH_VALUE_THRESHOLD } from "./catalog.ts";

const photo = (name: string) => `/demos/northmarket/nm-${name}.webp`;

export const PHOTOS = {
  camera: photo("camera"),
  lamp: photo("lamp"),
  bag: photo("bag"),
  turntable: photo("turntable"),
  watch: photo("watch"),
  headphones: photo("headphones"),
  jacket: photo("jacket"),
  sneakers: photo("sneakers"),
  seller: "/demos/northmarket/p-marta.webp",
} as const;

export const CATEGORIES = [
  "All",
  "Furniture",
  "Lighting",
  "Fashion",
  "Bags",
  "Cameras",
  "Audio",
  "Watches",
  "Sale",
] as const;

/** What the sign-up form suggests. The email is the visitor's own. */
export const SELLER = {
  name: "Marta Ruiz",
  shop: "Ruiz Vintage",
  secondShop: "Ruiz Vintage Outlet",
  email: "marta@ruizvintage.example",
} as const;

export interface ShopItem {
  title: string;
  price: number;
  photo: string;
  shop: string;
  tag?: string;
}

/** The first shop's listings in the seller hub. */
export const SHOP_LISTINGS: ShopItem[] = [
  {
    title: "Rangefinder camera, 1958",
    price: 1450,
    photo: PHOTOS.camera,
    shop: "Ruiz Vintage · Madrid",
    tag: "Rare",
  },
  {
    title: "Walnut record player",
    price: 380,
    photo: PHOTOS.turntable,
    shop: "Ruiz Vintage · Madrid",
  },
  {
    title: "Brass table lamp",
    price: 165,
    photo: PHOTOS.lamp,
    shop: "Ruiz Vintage · Madrid",
  },
];

/** The second shop's listings, on the paused shop's page. */
export const OUTLET_LISTINGS: ShopItem[] = [
  {
    title: "Hand-wound field watch",
    price: 520,
    photo: PHOTOS.watch,
    shop: "Tick & Co · Berlin",
    tag: "Serviced",
  },
  {
    title: "Cognac leather tote",
    price: 240,
    photo: PHOTOS.bag,
    shop: "Casa Piel · Sevilla",
  },
  {
    title: "Washed denim jacket",
    price: 95,
    photo: PHOTOS.jacket,
    shop: "Ruiz Vintage Outlet",
  },
];

export interface ShopOrder {
  id: string;
  title: string;
  buyer: string;
  amount: number;
  photo: string;
  status: "Paid" | "In transit";
}

export const RECENT_ORDERS: ShopOrder[] = [
  {
    id: "NM-20418",
    title: "Brass table lamp",
    buyer: "Anna Keller · Berlin · delivered",
    amount: 165,
    photo: PHOTOS.lamp,
    status: "Paid",
  },
  {
    id: "NM-20417",
    title: "Cognac leather tote",
    buyer: "Jonas Weber · Hamburg · shipped",
    amount: 240,
    photo: PHOTOS.bag,
    status: "In transit",
  },
  {
    id: "NM-20416",
    title: "Walnut record player",
    buyer: "Elise Martin · Lyon · delivered",
    amount: 380,
    photo: PHOTOS.turntable,
    status: "Paid",
  },
];

/** The shop's own figures in the seller hub. */
export const SHOP_STATS = {
  sales: 3940,
  orders: 18,
  payout: 1284,
  rating: 4.9,
  listings: 42,
  soldThisWeek: 6,
} as const;

/** The buyer and the order the Transact step places. */
export const CHECKOUT = {
  buyer: {
    name: "Tom Becker",
    initials: "TB",
    address: "Oderberger Str. 12, Berlin",
    card: "Mastercard ending 0388",
  },
  item: {
    id: "rangefinder-1958",
    title: "Rangefinder camera, 1958",
    detail: "Fully working, new light seals, original case.",
    price: 1450,
    photo: PHOTOS.camera,
  },
  shipping: 18,
  protection: 29,
} as const;

export const ORDER_TOTAL =
  CHECKOUT.item.price + CHECKOUT.shipping + CHECKOUT.protection;

/** The order as the payload builder takes it: the total is what is charged. */
export const ORDER_LISTING: Listing = {
  id: CHECKOUT.item.id,
  title: CHECKOUT.item.title,
  detail: CHECKOUT.item.detail,
  price: ORDER_TOTAL,
  icon: "camera",
};

export { HIGH_VALUE_THRESHOLD };

/** "1,497 EUR", "1,450.00 EUR": how Northmarket writes money. */
export function eur(amount: number, cents = false): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })} EUR`;
}

/** "Oct 29": two days from now, when a delivered order pays out. */
export function payoutDay(now: number): string {
  return new Date(now + 2 * 86_400_000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
