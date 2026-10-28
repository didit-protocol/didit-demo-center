import type {
  Check,
  ConsoleTab,
  LinkedRecord,
  PersonRow,
  RecordPage,
  Tag,
  TimelineItem,
} from "../didit/console.ts";
import type { LiveEvent } from "../didit/live.ts";
import type { KybSummary, TransactionSummary } from "./summaries.ts";

import { IN_PROGRESS, startedLabel } from "../didit/console.ts";

import { companyName, ruleName } from "./live-events.ts";
import { eur } from "./northmarket.ts";

/**
 * Northmarket's console view: the Business page (registry, key people and
 * linked shops) a marketplace's trust team would open in the Didit console,
 * plus the Transaction, Verification and Device pages, filled only with what
 * this visitor's own session produced. Where there is no record yet the tab
 * says so instead of showing a made-up one. Pure, for `npm test`.
 */

export interface ShopRecord {
  id: string;
  shop: string;
  company: string;
  kyb: KybSummary | null;
}

export interface NorthmarketConsoleInput {
  /** Oldest first: the first shop, then a second one on this device. */
  shops: ShopRecord[];
  transactions: TransactionSummary[];
  events: LiveEvent[];
  email: string | null;
  device: {
    persistentId: string;
    botScore: number;
    browser: string;
    os: string;
  } | null;
  /** "Passkey", "Email code"; null without Didit Authentication. */
  signIn: string | null;
  now: number;
}

const short = (id: string) =>
  id.length > 14 ? `${id.slice(0, 12)}…${id.slice(-4)}` : id;

const day = (value: string | null) => {
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
};

const clock = (at: number, now: number) => {
  const date = new Date(at);
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return new Date(now).toDateString() === date.toDateString()
    ? `Today, ${time}`
    : `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
};

/**
 * A session or transaction status as a console tag. An open session (Didit's
 * "Not Started" or "In Progress") reads as in progress, never as not started.
 */
export function statusTag(status: string): Tag {
  const value = status.trim().toLowerCase().replace(/_/g, " ");
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

  if (value === "approved") return { label: "Approved", tone: "ok" };
  if (value === "declined") return { label: "Declined", tone: "no" };
  if (value === "not started" || value === "in progress") return IN_PROGRESS;
  if (["in review", "awaiting user"].includes(value))
    return { label, tone: "rev" };

  return { label: label || "Waiting", tone: "neu" };
}

/** True while the KYB session is open: Didit has not decided it yet. */
const kybOpen = (kyb: KybSummary | null | undefined) =>
  Boolean(kyb) && statusTag(kyb?.status ?? "") === IN_PROGRESS;

const isApproved = (status: string | null) =>
  (status ?? "").toLowerCase() === "approved";

const SHARED = (tx: TransactionSummary) =>
  tx.kind === "signup" && tx.status !== "APPROVED";

/** "ubo" and "shareholder" say what "35% owner" says; "CEO" stays as is. */
function roleLabel(role: string, owns: boolean): string | null {
  const value = role.trim();

  if (/^(ubo|shareholder|owner)$/i.test(value))
    return owns ? null : "Beneficial owner";
  if (value === value.toUpperCase()) return value;

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/** The key people: each owner and officer with their own ID check. */
export function keyPeople(kyb: KybSummary): PersonRow[] {
  return kyb.people.map((person) => ({
    name: person.name,
    role:
      [
        ...person.roles.map((role) =>
          roleLabel(role, person.ownership !== null),
        ),
        person.ownership !== null ? `${person.ownership}% owner` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Key person",
    status: person.skipped
      ? { label: "Skipped", tone: "neu" }
      : isApproved(person.kycStatus)
        ? { label: "ID verified", tone: "ok" }
        : statusTag(person.kycStatus ?? ""),
  }));
}

function timeline(events: LiveEvent[], now: number): TimelineItem[] {
  return events.slice(0, 6).map((event) => ({
    tone: event.tone,
    title: event.title,
    detail: event.detail,
    at: clock(event.at, now),
  }));
}

function linkedRecords(
  input: NorthmarketConsoleInput,
  shop: ShopRecord,
): LinkedRecord[] {
  const others = input.shops.filter((item) => item.id !== shop.id);
  const signups = input.transactions.filter(SHARED);
  const order = input.transactions.find((tx) => tx.kind === "purchase");

  return [
    ...others.map((other) => ({
      tone: "sig" as const,
      title: other.shop,
      detail: signups.length
        ? "Same device · payouts paused"
        : "Opened on the same device",
    })),
    ...(shop.kyb
      ? [
          {
            tone: "ver" as const,
            title: `KYB · ${short(shop.kyb.sessionId)}`,
            detail: [statusTag(shop.kyb.status).label, day(shop.kyb.createdAt)]
              .filter(Boolean)
              .join(" · "),
          },
        ]
      : []),
    ...(order
      ? [
          {
            tone: "txn" as const,
            title: `Order · ${eur(order.amount)}`,
            detail: statusTag(order.status).label,
          },
        ]
      : []),
  ];
}

function businessPage(input: NorthmarketConsoleInput): RecordPage | null {
  const shop = input.shops[0];

  if (!shop) return null;
  const kyb = shop.kyb;
  const company = companyName(kyb, shop.company);
  const people = kyb ? keyPeople(kyb) : [];
  const verified = people.filter((row) => row.status.tone === "ok").length;
  const others = input.shops.length - 1;
  const registry = kyb?.company;

  return {
    kind: "business",
    section: "Businesses",
    record: company,
    head: {
      title: company,
      tag: kyb ? statusTag(kyb.status) : { label: "Not verified", tone: "neu" },
      id: short(shop.id),
      meta: [
        registry?.country ?? null,
        `Shop: ${shop.shop}`,
        kybOpen(kyb)
          ? `KYB ${startedLabel(kyb?.createdAt).replace(/^Started/, "started")}`
          : kyb?.createdAt
            ? `Seller since ${day(kyb.createdAt)}`
            : null,
      ].filter((item): item is string => Boolean(item)),
    },
    kpis: [
      {
        label: "Key people",
        value: people.length ? `${verified} of ${people.length}` : "0",
        unit: "verified",
        color: people.length && verified === people.length ? "ok" : "rev",
      },
      {
        label: "Registry",
        value: statusTag(
          registry?.registryStatus ?? (kyb ? kyb.status : "Not run"),
        ).label,
        color: registry ? "ok" : undefined,
      },
      {
        label: "Documents",
        value: String(
          kyb?.documents.filter((doc) => isApproved(doc.status)).length ?? 0,
        ),
        unit: "approved",
      },
      {
        label: "Linked shops",
        value: String(others),
        unit: "same device",
        color: others > 0 ? "no" : undefined,
      },
    ],
    blocks: [
      ...(others > 0
        ? [
            {
              kind: "note" as const,
              tone: "stop" as const,
              text: `${input.shops
                .slice(1)
                .map((item) => item.shop)
                .join(
                  ", ",
                )} opened on the same device with another account.${input.transactions.some(SHARED) ? " Its payouts are paused for review." : ""}`,
            },
          ]
        : []),
      ...(registry
        ? [
            {
              kind: "pairs" as const,
              title: "Registry",
              link: "Company registry",
              pairs: [
                ["Legal name", registry.name ?? company],
                ["Company number", registry.number ?? "Not given"],
                [
                  "Status",
                  registry.registryStatus
                    ? statusTag(registry.registryStatus).label
                    : "Unknown",
                ],
                ["Legal form", registry.type ?? "Unknown"],
                ["Incorporated", day(registry.incorporated) ?? "Unknown"],
                ["Registered address", registry.address ?? "Unknown"],
              ] as [string, string][],
            },
          ]
        : [
            {
              kind: "note" as const,
              tone: "info" as const,
              text: kyb
                ? "The registry check has not answered yet. It appears here once the business verification reaches it."
                : "No business verification yet. Verify the business from the seller hub and the registry, owners and documents land here.",
            },
          ]),
      ...(people.length
        ? [
            {
              kind: "people" as const,
              title: "Key people",
              link: "25% ownership threshold",
              rows: people,
            },
          ]
        : []),
      {
        kind: "timeline" as const,
        title: "One timeline, every Didit product",
        items: timeline(input.events, input.now),
      },
    ],
    side: {
      title: "Details",
      pairs: [
        ...(input.email ? [["Contact", input.email] as [string, string]] : []),
        ...(input.signIn
          ? [["Sign-in", `${input.signIn} · 1 device`] as [string, string]]
          : []),
        ["Vendor data", short(shop.id)],
      ],
    },
    linked: linkedRecords(input, shop),
    nav: [
      { label: "All businesses", count: input.shops.length },
      {
        label: "Needs review",
        count: input.transactions.filter(SHARED).length,
      },
      { label: "Key people", count: people.length },
      { label: "Documents", count: kyb?.documents.length ?? 0 },
    ],
  };
}

function transactionPage(input: NorthmarketConsoleInput): RecordPage | null {
  const tx =
    input.transactions.find((item) => item.kind === "purchase") ??
    input.transactions[0];

  if (!tx) return null;

  return {
    kind: "transaction",
    section: "Transactions",
    record: tx.txnId || short(tx.uuid),
    head: {
      title: tx.kind === "signup" ? "Seller sign-up" : eur(tx.amount, true),
      aside: tx.kind === "purchase" ? "Inbound order" : undefined,
      tag: statusTag(tx.status),
      id: short(tx.uuid),
      meta: [tx.label ?? tx.kind, tx.subject ? short(tx.subject) : ""].filter(
        Boolean,
      ),
    },
    kpis: [
      {
        label: "Risk score",
        value: String(Math.round(tx.score)),
        unit: "of 100",
        color: tx.score >= 60 ? "no" : tx.score >= 30 ? "rev" : "ok",
      },
      { label: "Rules hit", value: String(tx.rules.length) },
    ],
    blocks: [
      ...(tx.verification
        ? [
            {
              kind: "note" as const,
              tone: "hold" as const,
              text: "Waiting for the buyer's age check. The order goes through once it is approved.",
            },
          ]
        : []),
      {
        kind: "rules",
        title: "Rules",
        rows: tx.rules.length
          ? tx.rules.map((rule) => ({
              state: "hit" as const,
              title: ruleName(rule.title),
              detail: rule.statusTarget
                ? `Moves it to ${statusTag(rule.statusTarget).label.toLowerCase()}`
                : undefined,
            }))
          : [{ state: "passed", title: "No rule matched" }],
      },
      {
        kind: "pairs",
        title: "Overview",
        pairs: [
          ["Transaction ID", tx.txnId],
          ["Didit ID", short(tx.uuid)],
          ["Direction", tx.direction || "Unknown"],
          ["Tags", tx.tags.join(", ") || "None"],
        ],
      },
    ],
    side: {
      title: "Review",
      tag: statusTag(tx.status),
      pairs: [
        ["Decided by", tx.rules.length ? "Rules" : "Automatic"],
        ["Score", `${Math.round(tx.score)} / 100`],
      ],
    },
    linked: [],
    nav: [
      { label: "All transactions", count: input.transactions.length },
      {
        label: "On hold",
        count: input.transactions.filter((t) => t.status === "AWAITING_USER")
          .length,
      },
      {
        label: "In review",
        count: input.transactions.filter((t) => t.status === "IN_REVIEW")
          .length,
      },
      { label: "Rules" },
    ],
  };
}

function verificationPage(input: NorthmarketConsoleInput): RecordPage | null {
  const shop = input.shops[0];
  const kyb = shop?.kyb;

  if (!shop || !kyb) return null;
  const STEP: Record<string, string> = {
    registry: "Company registry",
    people: "Key people and their ID checks",
    documents: "Company documents",
    aml: "AML screening",
  };
  const open = kybOpen(kyb);
  // While the session is open no step reads as passed or as not started.
  const checks: Check[] = kyb.steps.map((step) => {
    const declined = step.status.toLowerCase() === "declined";

    return {
      label: STEP[step.key],
      value:
        open && !declined ? IN_PROGRESS.label : statusTag(step.status).label,
      ok: declined ? false : !open && isApproved(step.status) ? true : null,
    };
  });

  return {
    kind: "verification",
    section: "Verifications",
    record: short(kyb.sessionId),
    head: {
      title: "Seller KYB",
      tag: statusTag(kyb.status),
      id: short(kyb.sessionId),
      meta: [
        companyName(kyb, shop.company),
        open ? startedLabel(kyb.createdAt) : "Registry, owners, documents",
      ],
    },
    kpis: [],
    blocks: [
      {
        kind: "checks",
        title: "Checks",
        checks: checks.length
          ? checks
          : [{ label: "Status", value: statusTag(kyb.status).label, ok: null }],
      },
    ],
    side: {
      title: "Details",
      tag: statusTag(kyb.status),
      pairs: [
        ["Workflow", "Seller KYB"],
        ...(open
          ? [
              [
                "Started",
                startedLabel(kyb.createdAt).replace(/^Started /, ""),
              ] as [string, string],
            ]
          : []),
        ["Vendor data", short(shop.id)],
      ],
    },
    linked: [],
    nav: [{ label: "All verifications", count: 1 }, { label: "Needs review" }],
  };
}

function devicePage(input: NorthmarketConsoleInput): RecordPage | null {
  const { device } = input;

  if (!device) return null;
  const shops = input.shops.length;

  return {
    kind: "device",
    section: "Devices",
    record: short(device.persistentId),
    head: {
      title: `${device.browser} on ${device.os}`,
      tag:
        shops > 1
          ? { label: `${shops} shops`, tone: "rev" }
          : { label: "One shop", tone: "ok" },
      id: short(device.persistentId),
      meta: ["Didit signals fingerprint"],
    },
    kpis: [
      {
        label: "Shops",
        value: String(shops),
        unit: "on this device",
        color: shops > 1 ? "no" : undefined,
      },
      {
        label: "Bot score",
        value: device.botScore.toFixed(2),
        color: device.botScore < 0.5 ? "ok" : "no",
      },
    ],
    blocks: input.shops.length
      ? [
          {
            kind: "people",
            title: "Shops on this device",
            rows: input.shops.map((shop, index) => ({
              name: shop.shop,
              role: short(shop.id),
              status:
                index === 0
                  ? { label: "First shop", tone: "info" }
                  : { label: "Same device", tone: "rev" },
            })),
          },
        ]
      : [],
    side: {
      title: "Details",
      pairs: [
        ["Browser", device.browser],
        ["System", device.os],
        ["Persistent id", short(device.persistentId)],
      ],
    },
    linked: [],
    nav: [{ label: "All devices", count: 1 }],
  };
}

export function northmarketConsole(
  input: NorthmarketConsoleInput,
): ConsoleTab[] {
  const first = input.shops[0];
  const company = first ? companyName(first.kyb, first.company) : null;

  return [
    {
      id: "business",
      label: "Business",
      tone: "auth",
      note: company
        ? `This is your Didit console. ${company}, its owners${input.shops.length > 1 ? " and the second shop" : ""} are all here, for your trust team.`
        : "This is your Didit console. Every shop that signs up appears here with its registry record and key people.",
      page: businessPage(input),
      empty:
        "Open a shop on Northmarket first: the business appears here as soon as Didit knows it.",
    },
    {
      id: "transaction",
      label: "Transaction",
      tone: "txn",
      note: "Every sign-up, order and payout goes through transaction monitoring. This is the one your team would open.",
      page: transactionPage(input),
      empty: "No transaction yet. Place the 1,497 EUR order at checkout.",
    },
    {
      id: "verification",
      label: "Verification",
      tone: "ver",
      note: "The business verification: registry, key people and documents, as your compliance team sees it.",
      page: verificationPage(input),
      empty:
        "No business verification yet. Verify the business from the seller hub.",
    },
    {
      id: "device",
      label: "Device",
      tone: "sig",
      note: "The device signals saw, and every shop opened on it.",
      page: devicePage(input),
      empty: "Signals has not read this device yet.",
    },
  ];
}
