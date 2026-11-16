/**
 * Single source of truth for site-wide constants.
 * Locale list, default locale, social handles, brand strings.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://didit.me";

export const LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "ar",
  "zh",
  "ja",
  "hi",
  "id",
  "ko",
  "pt-BR",
  "pt-PT",
  "sw",
  "ru",
  "ca"
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const HREFLANG_MAP: Record<Locale, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  ar: "ar",
  zh: "zh",
  ja: "ja",
  hi: "hi",
  id: "id",
  ko: "ko",
  "pt-BR": "pt-BR",
  "pt-PT": "pt-PT",
  sw: "sw",
  ru: "ru",
  ca: "ca"
};

/**
 * Language-only Portuguese catch-all (Google's guidance for pt + pt-PT
 * clusters): every hreflang cluster that carries a pt-BR variant also
 * annotates `hreflang="pt"` pointing at the SAME pt-BR URL. x-default
 * stays EN.
 */
export const HREFLANG_PT = "pt";
/** The locale whose URL answers the language-only `pt` alternate. */
export const PT_CATCHALL_LOCALE: Locale = "pt-BR";

export const SOCIAL = {
  twitter: "@Diditprotocol",
  linkedin: "https://www.linkedin.com/company/91001155",
  youtube: "https://www.youtube.com/@getdidit",
  github: "https://github.com/didit-protocol"
};

export const ORG = {
  legalName: "Didit Protocol",
  founders: ["Alberto Rosas", "Alejandro Rosas"],
  founded: "2023",
  email: "hello@didit.me",
  address: {
    country: "ES",
    region: "Madrid"
  }
};

/** Locked brand strings — do not paraphrase. */
export const BRAND_LOCKED = {
  category: "Infrastructure for identity and fraud",
  tagline: "One API for identity and fraud.",
  homeH1Lines: ["Verify every user.", "Verify every business.", "Screen every transaction."]
};
