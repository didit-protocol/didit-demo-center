/**
 * The product demos: one Didit product at a time, on one page template.
 *
 * Each demo is one `defineProductDemo` call (lib/product-demos/demos.ts). A
 * `live` demo creates a real session on the demo application with its
 * workflow and opens it in the web SDK modal; a `sample` demo shows a fixture
 * decision with the request and response behind it and sends nothing.
 *
 * Types and pure helpers only, with no `@/` imports: `npm test` loads it
 * straight from Node.
 */

export const FAMILIES = [
  { id: "identity", label: "Identity" },
  { id: "authentication", label: "Authentication" },
  { id: "business", label: "Business" },
  { id: "transactions", label: "Transactions and AML" },
] as const;

export type Family = (typeof FAMILIES)[number]["id"];

/**
 * The DS v4 category colour of a demo's glyph and dot: identity (blue),
 * identity data (teal blue), authentication (pink), business (amber) and
 * transactions (green). Colours reach glyphs, dots and lines only.
 */
export type Glyph = "identity" | "data" | "auth" | "business" | "txn";

export interface DemoStep {
  title: string;
  body: string;
}

interface Base {
  /** The route segment: /product-demos/<id>. */
  id: string;
  /** The id this demo had in the old catalogue (`/?demo=<legacyId>`). */
  legacyId: string;
  family: Family;
  /** The second half of the eyebrow: "Identity · Biometrics". */
  area: string;
  title: string;
  /** The one line on the hub card. */
  blurb: string;
  lede: string;
  /** /icons/modules/<icon>.svg */
  icon: string;
  glyph: Glyph;
  steps: [DemoStep, DemoStep, DemoStep];
  /** The products this demo uses, shown as tags. */
  tags: string[];
  /** A docs.didit.me path. */
  docsPath: string;
}

export interface VerificationPreview {
  /** The first screen of the verification modal for this workflow. */
  title: string;
  body: string;
  duration: string;
  items: { title: string; detail: string }[];
}

export interface LiveDemo extends Base {
  mode: "live";
  /**
   * The workflow for this environment, or null where it is not published
   * here yet: the page says so instead of failing on the session call.
   */
  workflow: string | null;
  /** "1 min" on the card, "About a minute" on the page. */
  time: { short: string; long: string };
  /** What the decision's main check is called in the feed: "Liveness". */
  check: string;
  preview: VerificationPreview;
  /** The session needs a reference portrait (`portrait_image`). */
  requiresPortrait?: boolean;
}

export type RuleState = "passed" | "hit" | "declined";
export type Verdict = "approved" | "review" | "declined";

export interface SampleFixture {
  /** "TX-81204": the fixture's own id, never a real record. */
  ref: string;
  headline: string;
  verdict: Verdict;
  /** "Risk score 38 / 100". */
  score?: { label: string; value: string };
  rules: { state: RuleState; title: string; detail: string }[];
  request: { method: "GET" | "POST"; path: string; body?: string };
  response: string;
}

export interface SampleDemo extends Base {
  mode: "sample";
  /** The industry demo that runs this product live, when one does. */
  industry: { name: string; route: string; note: string } | null;
  fixture: SampleFixture;
}

export type ProductDemo = LiveDemo | SampleDemo;

/** A product demo's config. */
export function defineProductDemo<T extends ProductDemo>(demo: T): T {
  return demo;
}

/**
 * What a demo can do on this environment: run live, wait for its workflow
 * (a live demo whose workflow is not published here, so Start stays off) or
 * show its sample. The hub card, the page's status and the Start button all
 * read this, so "Live" never sits next to a Start that cannot run.
 */
export type Availability = "live" | "soon" | "sample";

export function availability(
  demo: Pick<LiveDemo, "mode" | "workflow"> | Pick<SampleDemo, "mode">,
): Availability {
  if (demo.mode === "sample") return "sample";

  return demo.workflow ? "live" : "soon";
}

/** The status each availability shows: on the hub card and on the page. */
export const AVAILABILITY_LABEL: Record<
  Availability,
  { card: string; page: string; kind: "ok" | "neu" | "line" }
> = {
  live: { card: "Live", page: "Live demo", kind: "ok" },
  soon: { card: "Coming soon", page: "Coming soon", kind: "neu" },
  sample: { card: "Sample decision", page: "Sample decision", kind: "line" },
};

/**
 * Stands in for the reader's own workflow id in the snippets: shaped like a
 * real one, so the call reads as it will in their code.
 */
export const EXAMPLE_WORKFLOW_ID = "5c2e8f1a-7b3d-4e9a-a6c1-2f8d9b0e4a71";

/** The session call behind a live demo, as a curl command. */
export function sessionCurl(api: string): string[] {
  return [
    `curl -X POST ${api}/v3/session/ \\`,
    ' -H "x-api-key: $DIDIT_API_KEY" \\',
    ' -H "Content-Type: application/json" \\',
    ` -d '{ "workflow_id": "${EXAMPLE_WORKFLOW_ID}", "vendor_data": "demo-visitor" }'`,
  ];
}

export function familyLabel(family: Family): string {
  return FAMILIES.find((item) => item.id === family)?.label ?? family;
}

export function productDemoRoute(demo: Pick<ProductDemo, "id">): string {
  return `/product-demos/${demo.id}`;
}

/** The filter's counts: All plus one per family. */
export function familyCounts(
  demos: Pick<ProductDemo, "family">[],
): Record<Family | "all", number> {
  const counts = { all: demos.length } as Record<Family | "all", number>;

  for (const { id } of FAMILIES)
    counts[id] = demos.filter((demo) => demo.family === id).length;

  return counts;
}
