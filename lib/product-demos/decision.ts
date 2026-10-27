/**
 * A live product demo's decision, as the page shows it: the decision panel's
 * rows, the live feed's events and the console view's person page, all read
 * from the v3 decision Didit returned for the visitor's own session.
 *
 * Pure, with no `@/` imports, so `npm test` covers it.
 */

import type { LiveDemo } from "./define";
import type { RecordPage, Tag } from "../didit/console";
import type { LiveInput } from "../didit/live";

type Json = Record<string, unknown>;

export type DecisionStatus = "approved" | "review" | "declined" | "pending";

export interface DecisionView {
  status: DecisionStatus;
  statusLabel: string;
  /** "S-48219", or the start of the session id. */
  session: string;
  rows: [string, string][];
  /** A portrait the decision carries (selfie or ID), when there is one. */
  portrait: string | null;
  /** The person's name from the document, when there is one. */
  name: string | null;
  /** The main check's line for the feed: "Score 99.4 · passive". */
  summary: string;
  network: { label: string; country: string | null } | null;
}

const first = (decision: Json, key: string): Json | null => {
  const list = decision[key];

  return Array.isArray(list) && list[0] && typeof list[0] === "object"
    ? (list[0] as Json)
    : null;
};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const round = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

export function statusOf(value: unknown): DecisionStatus {
  const status = String(value ?? "").toLowerCase();

  if (status === "approved") return "approved";
  if (status === "declined") return "declined";
  if (status === "in review") return "review";

  return "pending";
}

export const STATUS_LABEL: Record<DecisionStatus, string> = {
  approved: "Approved",
  review: "In review",
  declined: "Declined",
  pending: "Not finished",
};

/** "Passed", "Declined" or "In review" for one check's own status. */
function outcome(value: unknown): string {
  const status = statusOf(value);

  return status === "approved"
    ? "Passed"
    : status === "pending"
      ? "Not finished"
      : STATUS_LABEL[status];
}

function method(value: unknown): string | null {
  const raw = text(value)?.toUpperCase();

  if (!raw) return null;

  return raw.startsWith("PASSIVE")
    ? "Passive"
    : raw.startsWith("ACTIVE")
      ? "Active"
      : raw.startsWith("FLASH")
        ? "Flashing"
        : raw.charAt(0) + raw.slice(1).toLowerCase();
}

function networkOf(ip: Json | null): DecisionView["network"] {
  if (!ip) return null;
  const parts = [
    ip.is_data_center === true ? "Data centre" : "Residential",
    ip.is_vpn_or_tor === true ? "VPN or Tor" : "no VPN",
  ];

  return { label: parts.join(" · "), country: text(ip.ip_country) };
}

/** Reads a v3 decision into the rows and lines the page shows. */
export function readDecision(decision: Json): DecisionView {
  const status = statusOf(decision.status);
  const liveness = first(decision, "liveness_checks");
  const id = first(decision, "id_verifications");
  const face = first(decision, "face_matches");
  const poa = first(decision, "poa_verifications");
  const phone = first(decision, "phone_verifications");
  const questionnaire = first(decision, "questionnaire_responses");
  const aml = first(decision, "aml_screenings");
  const ip = first(decision, "ip_analyses");
  const rows: [string, string][] = [];
  const summary: string[] = [];

  if (id) {
    const document = [text(id.document_type), text(id.issuing_state_name)]
      .filter(Boolean)
      .join(" · ");

    rows.push([
      "Document",
      [outcome(id.status), document].filter(Boolean).join(" · "),
    ]);
    if (num(id.age) !== null) rows.push(["Age", String(id.age)]);
  }
  if (liveness) {
    const score = num(liveness.score);
    const how = method(liveness.method);

    rows.push([
      "Liveness",
      [outcome(liveness.status), score === null ? null : round(score)]
        .filter(Boolean)
        .join(" · "),
    ]);
    if (how) rows.push(["Method", how]);
    if (score !== null) summary.push(`Score ${round(score)}`);
    if (how) summary.push(how.toLowerCase());
    const age = num(liveness.age_estimation);

    if (age !== null) {
      rows.push(["Estimated age", round(age)]);
      summary.push(`age ${round(age)}`);
    }
  }
  if (face) {
    const score = num(face.score);

    rows.push([
      "Face match",
      [outcome(face.status), score === null ? null : round(score)]
        .filter(Boolean)
        .join(" · "),
    ]);
    if (!liveness && score !== null) summary.push(`Match ${round(score)}`);
  }
  if (poa) {
    rows.push([
      "Address",
      [outcome(poa.status), text(poa.document_type) ?? text(poa.issuer)]
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  if (phone) {
    rows.push([
      "Phone",
      [outcome(phone.status), text(phone.full_number) ? "code confirmed" : null]
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  if (questionnaire) {
    const answers = Array.isArray(questionnaire.answers)
      ? questionnaire.answers.length
      : null;

    rows.push([
      "Questionnaire",
      [
        outcome(questionnaire.status),
        answers === null ? null : `${answers} answers`,
      ]
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  if (aml) {
    const hits = num(aml.total_hits);

    rows.push([
      "AML screening",
      hits === null
        ? outcome(aml.status)
        : hits === 0
          ? "No matches"
          : `${hits} ${hits === 1 ? "match" : "matches"} to review`,
    ]);
  }
  const network = networkOf(ip);

  if (network) rows.push(["Network", network.label]);

  const number = num(decision.session_number);
  const sessionId = text(decision.session_id) ?? "";
  const session = number !== null ? `S-${number}` : sessionId.slice(0, 8);

  rows.push(["Session", session]);

  const portrait =
    text(liveness?.reference_image) ??
    text(face?.source_image) ??
    text(id?.portrait_image);
  const name =
    text(id?.full_name) ??
    ([text(id?.first_name), text(id?.last_name)].filter(Boolean).join(" ") ||
      null);

  return {
    status,
    statusLabel: STATUS_LABEL[status],
    session,
    rows,
    portrait,
    name,
    summary: summary.join(" · ") || rows[0]?.[1] || "",
    network,
  };
}

/** The feed's first event: the session the visitor just started. */
export function sessionEvent(demo: LiveDemo, sessionId: string): LiveInput {
  return {
    key: `session-${sessionId}`,
    tone: "ver",
    product: "verification",
    title: "Session created",
    detail: `${demo.title} workflow · sandbox`,
    code: "POST /v3/session/",
  };
}

/** The events a finished decision adds to the feed, oldest first. */
export function decisionEvents(
  demo: LiveDemo,
  sessionId: string,
  view: DecisionView,
): LiveInput[] {
  const events: LiveInput[] = [];

  if (view.network)
    events.push({
      key: `ip-${sessionId}`,
      tone: "sig",
      product: "signals",
      title: "IP analysis",
      detail: [
        view.network.label.replace(" · ", " network · "),
        view.network.country,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  const verb =
    view.status === "approved"
      ? "passed"
      : view.status === "declined"
        ? "declined"
        : view.status === "review"
          ? "in review"
          : "not finished";

  events.push({
    key: `decision-${sessionId}`,
    tone:
      view.status === "declined"
        ? "stop"
        : view.status === "review"
          ? "hold"
          : "ver",
    product: "verification",
    title: `${demo.check} ${verb}`,
    detail: view.summary,
    code: "GET /v3/session/{id}/decision/",
  });

  return events;
}

const TAG: Record<DecisionStatus, Tag> = {
  approved: { label: "Approved", tone: "ok" },
  review: { label: "In review", tone: "rev" },
  declined: { label: "Declined", tone: "no" },
  pending: { label: "Not finished", tone: "neu" },
};

/**
 * The console view's person page for this session: the same records the
 * Didit console shows for the visitor, drawn from their own decision.
 */
export function consolePage(
  demo: LiveDemo,
  view: DecisionView,
  input: {
    vendorData: string;
    device: string | null;
    timeline: {
      title: string;
      detail?: string;
      at: string;
      tone: "ver" | "sig" | "hold" | "stop";
    }[];
  },
): RecordPage {
  const tag = TAG[view.status];
  const main = view.rows[0];

  return {
    kind: "person",
    section: "People",
    record: view.session,
    head: {
      title: view.name ?? "Demo visitor",
      tag,
      id: input.vendorData,
      meta: [
        view.network?.country,
        "Product demo",
        demo.title,
        "Last active just now",
      ].filter((item): item is string => Boolean(item)),
      initial: (view.name ?? "D").charAt(0).toUpperCase(),
    },
    kpis: [
      { label: "Sessions", value: "1", unit: "today" },
      ...(main && main[0] !== "Session"
        ? [
            {
              label: main[0],
              value: main[1].split(" · ").pop() ?? main[1],
              unit: main[1].includes(" · ")
                ? main[1].split(" · ")[0].toLowerCase()
                : undefined,
              color:
                view.status === "approved"
                  ? ("ok" as const)
                  : view.status === "declined"
                    ? ("no" as const)
                    : ("rev" as const),
            },
          ]
        : []),
      ...(view.network
        ? [
            {
              label: "Network",
              value: view.network.label.split(" · ")[0],
              unit: view.network.label.split(" · ")[1],
            },
          ]
        : []),
    ],
    blocks: [
      {
        kind: "timeline",
        title: "One timeline, every Didit product",
        link: "All events",
        items: input.timeline,
      },
      {
        kind: "pairs",
        title: "Decision",
        pairs: view.rows.filter(([label]) => label !== "Session"),
      },
    ],
    side: {
      title: "Details",
      pairs: [
        ["Vendor data", input.vendorData],
        ["Workflow", demo.title],
        ["Session", view.session],
        ...(input.device
          ? ([["Device", input.device]] as [string, string][])
          : []),
        ["Environment", "Sandbox"],
      ],
    },
    linked: [
      {
        tone: "ver",
        title: `${view.session} · ${demo.title}`,
        detail: `${tag.label} · just now`,
      },
    ],
    nav: [
      { label: "All people" },
      { label: "Verified" },
      { label: "Needs review" },
      { label: "Linked accounts" },
    ],
  };
}
