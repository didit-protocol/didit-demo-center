/**
 * Kestrel's market screen: the pairs, the BTC/EUR chart and the order book.
 *
 * Kestrel is a fictional exchange and its market is scenery: nothing here
 * reaches Didit, and no balance is ever computed from anything but Didit's
 * own decisions. The series are drawn from a seeded generator, so the server
 * and the browser render the same candles and nothing flickers on hydration.
 */

import type { Asset } from "./transactions";

export interface Market {
  symbol: string;
  name: string;
  /** EUR price, as the ticker shows it. */
  price: number;
  /** 24 h change, in percent. */
  change: number;
  /** Decimals the price is shown with. */
  decimals: number;
  color: string;
  glyph: string;
}

export const MARKETS: Market[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 61240.5,
    change: 2.14,
    decimals: 2,
    color: "#F7931A",
    glyph: "₿",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 2412.18,
    change: 1.02,
    decimals: 2,
    color: "#627EEA",
    glyph: "Ξ",
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 142.66,
    change: -0.84,
    decimals: 2,
    color: "#9945FF",
    glyph: "S",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    price: 0.9214,
    change: 0.01,
    decimals: 4,
    color: "#2775CA",
    glyph: "$",
  },
  {
    symbol: "ADA",
    name: "Cardano",
    price: 0.3381,
    change: 3.4,
    decimals: 4,
    color: "#2A54D6",
    glyph: "A",
  },
  {
    symbol: "DOT",
    name: "Polkadot",
    price: 4.118,
    change: -1.22,
    decimals: 3,
    color: "#E6007A",
    glyph: "D",
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    price: 11.42,
    change: 0.66,
    decimals: 2,
    color: "#2A5ADA",
    glyph: "L",
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    price: 22.18,
    change: -2.05,
    decimals: 2,
    color: "#E84142",
    glyph: "A",
  },
];

export const marketOf = (symbol: string): Market =>
  MARKETS.find((market) => market.symbol === symbol) ?? MARKETS[0];

/** EUR value of an amount of one of Kestrel's assets, at the ticker price. */
export function eurValue(asset: Asset | string, amount: number): number {
  return Math.round(amount * marketOf(asset).price * 100) / 100;
}

export function formatPrice(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatEur(value: number, decimals = 2): string {
  return `${formatPrice(value, decimals)} EUR`;
}

export function formatChange(change: number): string {
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

/** Crypto amounts: up to 8 decimals, trailing zeros trimmed, at least 2. */
export function formatAmount(amount: number, decimals = 8): string {
  const fixed = amount.toFixed(decimals).replace(/0+$/, "");
  const [whole, fraction = ""] = fixed.split(".");

  return `${Number(whole).toLocaleString("en-US")}.${fraction.padEnd(2, "0")}`;
}

/** Mulberry32: a tiny deterministic generator. */
function seeded(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seedOf = (text: string) =>
  Array.from(text).reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7);

/** A walk that ends `change` percent above where it starts. */
export function sparkline(symbol: string, change: number, points = 24) {
  const random = seeded(seedOf(symbol));
  const values: number[] = [];
  let value = 0;

  for (let index = 0; index < points; index++) {
    const drift = (change / points) * 1.4;

    value += drift + (random() - 0.5) * 2.2;
    values.push(value);
  }

  return values;
}

export interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/** The BTC/EUR hourly candles behind the chart. */
export function candles(count = 64, last = MARKETS[0].price): Candle[] {
  const random = seeded(20261027);
  const series: Candle[] = [];
  let price = last * 0.992;

  for (let index = 0; index < count; index++) {
    const wave = Math.sin(index / 7) * 0.0026 + Math.cos(index / 3.1) * 0.0012;
    const open = price;
    const close = open * (1 + wave + (random() - 0.5) * 0.006);
    const high = Math.max(open, close) * (1 + random() * 0.0022);
    const low = Math.min(open, close) * (1 - random() * 0.0022);

    series.push({ open, close, high, low, volume: 0.25 + random() * 0.75 });
    price = close;
  }

  return series;
}

export interface BookRow {
  price: number;
  amount: number;
  total: number;
  /** 0 to 1: the depth bar. */
  depth: number;
}

/** The BTC/EUR order book around the last price: asks above, bids below. */
export function orderBook(rows = 8, last = MARKETS[0].price) {
  const random = seeded(4711);
  const side = (direction: 1 | -1): BookRow[] => {
    let total = 0;

    return Array.from({ length: rows }, (_, index) => {
      const amount = Math.round((0.12 + random() * 0.9) * 10000) / 10000;
      const price =
        Math.round((last + direction * (6.5 * (index + 1) + random())) * 2) / 2;

      total += amount * price;

      return { price, amount, total, depth: 0 };
    });
  };
  const asks = side(1);
  const bids = side(-1);
  const deepest = Math.max(
    asks[asks.length - 1].total,
    bids[bids.length - 1].total,
  );

  for (const row of [...asks, ...bids]) row.depth = row.total / deepest;

  return { asks: asks.reverse(), bids };
}

/** "21.4k": the book's EUR totals. */
export function compact(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
}
