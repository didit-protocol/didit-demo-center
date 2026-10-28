import type { PaymentKind } from "./alder";
import type {
  Check,
  ConsoleTab,
  LinkedRecord,
  RecordPage,
  Tag,
  TimelineItem,
} from "../didit/console";
import type { LiveEvent } from "../didit/live";
import type { SessionSummary, TransactionRecord } from "../igaming/records";

import { IN_PROGRESS, isOpenSession, startedLabel } from "../didit/console.ts";

import { BANK, STEP_UP_AMOUNT, formatMoney, ruleName } from "./alder.ts";

/**
 * Alder's console view: the Transaction, Person, Verification and Device
 * pages a bank's team would open in the Didit console, filled only with what
 * this visitor's own session produced. Where there is no record yet the tab
 * says so instead of showing a made-up one. Pure, for `npm test`.
 */

export interface ConsoleItem {
  key: string;
  kind: PaymentKind;
  amount: number;
  counterparty: string;
  account?: string;
  newPayee?: boolean;
  at: number;
  /** When a held transfer was released, from this page's own reads. */
  releasedAt?: number | null;
  record: TransactionRecord | null;
}

export interface AlderConsoleInput {
  customer: {
    customerId: string;
    name: string;
    email: string;
    createdAt: number;
  } | null;
  onboarding: SessionSummary | null;
  /**
   * The onboarding session once Alder created it, before Didit has a decision
   * to read: the tabs show it as in progress instead of no verification.
   */
  onboardingSession?: { sessionId: string; startedAt: number | null } | null;
  stepUp: SessionSummary | null;
  /** How Didit Authentication confirmed the step-up before the selfie. */
  stepUpPasskey?: string | null;
  activity: ConsoleItem[];
  events: LiveEvent[];
  device: {
    persistentId: string;
    botScore: number;
    browser: string;
    os: string;
    firstVisit: boolean;
  } | null;
  /** "Passkey", "Email code"; null without Didit Authentication. */
  signIn: string | null;
  /** The account-takeover attempt, once it ran. */
  takeover: { at: number; status: string | null } | null;
  now: number;
}

const clock = (at: number) =>
  new Date(at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

const time = (at: number, now: number) => {
  const today = new Date(now).toDateString() === new Date(at).toDateString();

  return today
    ? `Today ${clock(at)}`
    : `${new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${clock(at)}`;
};

const day = (at: number) =>
  new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const short = (id: string) =>
  id.length > 14 ? `${id.slice(0, 12)}…${id.slice(-4)}` : id;

const percent = (value: number | null) =>
  value === null
    ? null
    : `${value > 1 ? value.toFixed(1) : (value * 100).toFixed(1)}%`;

export function statusTag(status: string): Tag {
  if (isOpenSession(status)) return IN_PROGRESS;
  const s = status.toUpperCase().replace(/ /g, "_");

  if (s === "APPROVED") return { label: "Approved", tone: "ok" };
  if (s === "DECLINED") return { label: "Declined", tone: "no" };
  if (s === "AWAITING_USER") return { label: "On hold", tone: "rev" };
  if (s === "IN_REVIEW") return { label: "In review", tone: "rev" };

  return {
    label: status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " "),
    tone: "neu",
  };
}

/** The transaction the team would open: the step-up transfer, else the newest. */
export function focusTransaction(activity: ConsoleItem[]): ConsoleItem | null {
  return (
    activity.find(
      (item) =>
        item.record &&
        (item.record.action !== null ||
          item.record.ruleHits.some((hit) => hit.statusTarget)),
    ) ??
    activity.find(
      (item) =>
        item.record && ["IN_REVIEW", "DECLINED"].includes(item.record.status),
    ) ??
    activity.find((item) => item.record && item.kind === "transfer") ??
    activity.find((item) => item.record) ??
    null
  );
}

/** The onboarding as far as Didit has it: decided, open, or not created yet. */
function onboardingOf(input: AlderConsoleInput): SessionSummary | null {
  if (input.onboarding) return input.onboarding;
  const created = input.onboardingSession;

  if (!created) return null;

  return {
    sessionId: created.sessionId,
    workflowId: null,
    status: "Not Started",
    estimatedAge: null,
    documentAge: null,
    ip: null,
    fullName: null,
    documentType: null,
    documentCountry: null,
    faceMatch: null,
    liveness: null,
    amlHits: null,
  };
}

/** "Started 28 Oct, 16:48" for the open onboarding. */
function onboardingStarted(input: AlderConsoleInput): string {
  return startedLabel(
    input.onboardingSession?.startedAt ?? input.customer?.createdAt ?? null,
  );
}

function nameOf(input: AlderConsoleInput): string {
  return (
    input.onboarding?.fullName ??
    (input.customer?.name || input.customer?.email || "This customer")
  );
}

function identityChecks(session: SessionSummary): Check[] {
  const checks: Check[] = [];
  // An open session's partial results are not a verdict yet.
  const open = isOpenSession(session.status);
  const ok =
    session.status === "Approved"
      ? true
      : session.status === "Declined"
        ? false
        : null;
  const face = percent(session.faceMatch);
  const live = percent(session.liveness);

  if (session.documentType)
    checks.push({
      label: "Document",
      value: [session.documentType, session.documentCountry]
        .filter(Boolean)
        .join(" · "),
      ok,
    });
  if (face)
    checks.push({ label: "Face match", value: `${face} · selfie vs ID`, ok });
  if (live)
    checks.push({
      label: "Liveness",
      value: open ? live : `Passed · ${live}`,
      ok,
    });
  if (session.amlHits !== null)
    checks.push({
      label: "AML screening",
      value:
        session.amlHits === 0
          ? "No matches"
          : `${session.amlHits} possible matches`,
      ok: open ? null : session.amlHits === 0,
    });

  return checks;
}

function linkedRecords(input: AlderConsoleInput): LinkedRecord[] {
  const linked: LinkedRecord[] = [];
  const name = nameOf(input);
  const onboarding = onboardingOf(input);

  if (input.stepUp)
    linked.push({
      tone: "ver",
      title: input.stepUpPasskey
        ? "Passkey + selfie step-up"
        : "Selfie step-up",
      detail: `${statusTag(input.stepUp.status).label} · ${short(input.stepUp.sessionId)}`,
    });
  if (onboarding)
    linked.push({
      tone: "ver",
      title: `${name} · KYC`,
      detail: statusTag(onboarding.status).label,
    });
  if (input.device)
    linked.push({
      tone: "sig",
      title: `Device ${short(input.device.persistentId)}`,
      detail: `${input.device.browser} on ${input.device.os} · 1 account`,
    });

  return linked;
}

function transactionPage(input: AlderConsoleInput): RecordPage | null {
  const focus = focusTransaction(input.activity);
  const record = focus?.record ?? null;

  if (!focus || !record || !input.customer) return null;
  const name = nameOf(input);
  const held = record.status === "AWAITING_USER";
  const stepUp = record.action !== null || focus.newPayee === true;
  const released =
    record.status === "APPROVED" && stepUp && input.stepUp !== null;
  const passkey = input.stepUpPasskey === "passkey";
  const score = Math.round(record.score);
  const at = record.createdAt ? Date.parse(record.createdAt) : focus.at;
  const when = Number.isFinite(at) ? at : focus.at;
  const outbound = record.direction === "out";
  const counterparty = focus.counterparty;
  const hits = record.ruleHits;
  const heldFor =
    released && focus.releasedAt
      ? Math.max(1, Math.round((focus.releasedAt - when) / 1000))
      : null;

  return {
    kind: "transaction",
    section: "Transactions",
    record: record.txnId,
    head: {
      title: formatMoney(record.amount || focus.amount),
      aside: outbound ? "Outbound" : "Inbound",
      tag: statusTag(record.status),
      meta: [
        outbound ? `${name} → ${counterparty}` : `${counterparty} → ${name}`,
        focus.kind === "transfer"
          ? "SEPA Instant"
          : focus.kind.replace(/_/g, " "),
        time(when, input.now),
      ],
    },
    kpis: [
      {
        label: "Risk score",
        value: `${score} / 100`,
        color: score >= 60 ? "no" : score >= 30 ? "rev" : "ok",
      },
      { label: "Amount", value: formatMoney(record.amount || focus.amount) },
      { label: "Rules triggered", value: String(hits.length) },
      stepUp
        ? {
            label: "Step-up",
            value: passkey ? "Passkey + selfie" : "Selfie",
            unit: released
              ? "confirmed"
              : held
                ? "waiting"
                : (input.stepUp?.status.toLowerCase() ?? "requested"),
            color: released ? "ok" : "rev",
          }
        : { label: "Step-up", value: "None", unit: "needed" },
    ],
    blocks: [
      ...(held
        ? [
            {
              kind: "note" as const,
              tone: "hold" as const,
              text: `Held at ${clock(when)} because it is a transfer of ${STEP_UP_AMOUNT.toLocaleString("en-US")} EUR or more to a new payee. ${BANK} asked ${name} to confirm it is them in the same screen; it is released as soon as Didit approves the step-up.`,
            },
          ]
        : released
          ? [
              {
                kind: "note" as const,
                tone: "info" as const,
                text: `Held at ${clock(when)} because it is a transfer of ${STEP_UP_AMOUNT.toLocaleString("en-US")} EUR or more to a new payee. ${name} confirmed it with ${passkey ? "the passkey and a selfie" : "a selfie"}${focus.releasedAt ? ` at ${clock(focus.releasedAt)}` : ""}, so Didit released it automatically. Nobody on your team had to look at it.`,
              },
            ]
          : record.status === "IN_REVIEW" || record.status === "DECLINED"
            ? [
                {
                  kind: "note" as const,
                  tone: "stop" as const,
                  text: `Didit ${record.status === "DECLINED" ? "declined" : "held"} this transaction: ${record.reason ?? `risk ${score} of 100`}.`,
                },
              ]
            : []),
      {
        kind: "rules",
        title: "Rules",
        link: "Fintech ruleset",
        rows: hits.length
          ? hits.map((hit) => ({
              state:
                hit.statusTarget === "DECLINED"
                  ? ("declined" as const)
                  : ("hit" as const),
              title: ruleName(hit.title),
              detail: hit.statusTarget
                ? hit.statusTarget === "AWAITING_USER"
                  ? "action: step-up with a selfie"
                  : `action: ${hit.statusTarget.toLowerCase().replace(/_/g, " ")}`
                : `+${hit.scoreDelta} risk`,
            }))
          : [
              {
                state: "passed" as const,
                title: "No rule matched",
                detail: "approved on its own",
              },
            ],
      },
      {
        kind: "pairs",
        title: "Overview",
        pairs: [
          ["Transaction ID", record.txnId],
          ["Didit ID", short(record.id)],
          [
            "Type",
            focus.kind === "transfer"
              ? "Bank transfer"
              : focus.kind.replace(/_/g, " "),
          ],
          [
            outbound ? "Payee" : "From",
            `${focus.account ?? counterparty}${focus.newPayee ? " · new" : ""}`,
          ],
          [
            "Device",
            record.device.fingerprint
              ? short(record.device.fingerprint)
              : "Attached by the SDK",
          ],
          ["IP country", record.device.ipCountry ?? "Unknown"],
        ],
      },
    ],
    side: {
      title: "Review",
      tag: statusTag(record.status),
      pairs: [
        [
          "Decided by",
          released
            ? passkey
              ? "Rule + passkey + selfie"
              : "Rule + selfie"
            : hits.length
              ? "Rules"
              : "Automatic",
        ],
        [
          "Queue",
          record.status === "IN_REVIEW" ? "Manual review" : "None needed",
        ],
        ...(heldFor !== null
          ? ([
              ["Time held", `${heldFor} second${heldFor === 1 ? "" : "s"}`],
            ] as [string, string][])
          : []),
      ],
    },
    linked: linkedRecords(input),
    nav: [
      {
        label: "All transactions",
        count: input.activity.filter((item) => item.record).length,
      },
      {
        label: "On hold",
        count: input.activity.filter(
          (item) => item.record?.status === "AWAITING_USER",
        ).length,
      },
      {
        label: "Declined",
        count: input.activity.filter(
          (item) => item.record?.status === "DECLINED",
        ).length,
      },
      { label: "Rules" },
    ],
  };
}

function timeline(events: LiveEvent[], now: number): TimelineItem[] {
  return events.slice(0, 12).map((event) => ({
    tone: event.tone,
    title: event.title,
    detail: event.detail,
    at: time(event.at, now),
  }));
}

function personPage(input: AlderConsoleInput): RecordPage | null {
  const { customer } = input;

  if (!customer) return null;
  const name = nameOf(input);
  const onboarding = onboardingOf(input);
  const approved = onboarding?.status === "Approved";
  const open = onboarding !== null && isOpenSession(onboarding.status);
  const moved = input.activity.filter(
    (item) => item.record?.status === "APPROVED",
  ).length;
  const checks = onboarding ? identityChecks(onboarding) : [];

  return {
    kind: "person",
    section: "People",
    record: name,
    head: {
      title: name,
      tag: approved
        ? { label: "Verified", tone: "ok" }
        : open
          ? IN_PROGRESS
          : { label: "Not verified", tone: "neu" },
      id: short(customer.customerId),
      initial: name.charAt(0).toUpperCase(),
      meta: [
        onboarding?.ip?.country ?? null,
        `Joined ${day(customer.createdAt)}`,
        open ? onboardingStarted(input) : null,
      ].filter((item): item is string => Boolean(item)),
    },
    kpis: [
      {
        label: "Sign-in",
        value: input.signIn ?? "Alder form",
        unit: input.signIn ? "via Didit" : undefined,
      },
      {
        label: "Payments",
        value: String(moved),
        unit: "monitored",
      },
      {
        label: "Sign-ins blocked",
        value: input.takeover ? "1" : "0",
        color: input.takeover ? "no" : undefined,
      },
    ],
    blocks: [
      checks.length
        ? {
            kind: "identity",
            title: "Identity",
            link: short(onboarding!.sessionId),
            document: onboarding?.documentType
              ? `${(onboarding.documentCountry ?? "").toUpperCase()} · ${onboarding.documentType.toUpperCase()}`
              : "KYC",
            selfie: "Selfie · liveness",
            checks,
          }
        : {
            kind: "note",
            tone: "info",
            text: open
              ? `${name}'s identity check is in progress. ${onboardingStarted(input)}.`
              : `${name} has not finished the identity check yet.`,
          },
      {
        kind: "timeline",
        title: "One timeline, every Didit product",
        link: "All events",
        items: timeline(input.events, input.now),
      },
    ],
    side: {
      title: "Details",
      pairs: [
        ["Email", customer.email || "Not given"],
        ...(input.device
          ? ([["Device", `${input.device.browser} on ${input.device.os}`]] as [
              string,
              string,
            ][])
          : []),
        ["Vendor data", customer.customerId],
        ["First seen", day(customer.createdAt)],
      ],
    },
    linked: linkedRecords(input),
    nav: [
      { label: "All people", count: 1 },
      { label: "Verified", count: approved ? 1 : 0 },
      { label: "Needs review" },
    ],
  };
}

function verificationPage(input: AlderConsoleInput): RecordPage | null {
  const session = onboardingOf(input);

  if (!session || !input.customer) return null;
  const checks = identityChecks(session);
  const open = isOpenSession(session.status);

  return {
    kind: "verification",
    section: "Verifications",
    record: short(session.sessionId),
    head: {
      title: "KYC + AML onboarding",
      tag: statusTag(session.status),
      id: short(session.sessionId),
      meta: [
        nameOf(input),
        open
          ? onboardingStarted(input)
          : "ID, liveness, face match and AML screening",
      ],
    },
    kpis: [],
    blocks: [
      {
        kind: "checks",
        title: "Checks",
        checks: checks.length
          ? checks
          : [
              {
                label: "Status",
                value: open
                  ? `${IN_PROGRESS.label} · ${onboardingStarted(input)}`
                  : statusTag(session.status).label,
                ok: null,
              },
            ],
      },
      ...(session.ip
        ? [
            {
              kind: "pairs" as const,
              title: "IP analysis",
              pairs: [
                ["Country", session.ip.country ?? "Unknown"],
                ["VPN or Tor", session.ip.isVpnOrTor ? "Yes" : "No"],
                ["Data centre", session.ip.isDataCenter ? "Yes" : "No"],
              ] as [string, string][],
            },
          ]
        : []),
    ],
    side: {
      title: "Details",
      tag: statusTag(session.status),
      pairs: [
        ["Workflow", "KYC + AML"],
        ...(open
          ? ([
              ["Started", onboardingStarted(input).replace(/^Started /, "")],
            ] as [string, string][])
          : []),
        ["Vendor data", input.customer.customerId],
      ],
    },
    linked: linkedRecords(input).filter((item) => item.tone !== "ver"),
    nav: [
      {
        label: "All verifications",
        count: [session, input.stepUp].filter(Boolean).length,
      },
      { label: "Needs review" },
    ],
  };
}

function devicePage(input: AlderConsoleInput): RecordPage | null {
  const { device } = input;

  if (!device) return null;

  return {
    kind: "device",
    section: "Devices",
    record: short(device.persistentId),
    head: {
      title: `${device.browser} on ${device.os}`,
      tag: { label: "One account", tone: "ok" },
      id: short(device.persistentId),
      meta: ["Didit signals fingerprint"],
    },
    kpis: [
      {
        label: "Bot score",
        value: device.botScore.toFixed(2),
        color: device.botScore < 0.5 ? "ok" : "no",
      },
      {
        label: "Seen",
        value: device.firstVisit ? "New" : "Before",
        unit: "on this browser",
      },
    ],
    blocks: input.takeover
      ? [
          {
            kind: "note",
            tone: "stop",
            text: `A sign-in to ${nameOf(input)}'s account failed the passkey check at ${clock(input.takeover.at)}. Didit ${input.takeover.status ? `marked the event ${input.takeover.status.toLowerCase().replace(/_/g, " ")}` : "kept the account closed"} and no payment was created.`,
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

/** "why it was held and how it was released", as far as it has gone. */
function heldNote(focus: ConsoleItem): string {
  const record = focus.record;
  const held = record?.ruleHits.some(
    (hit) => hit.statusTarget === "AWAITING_USER",
  );

  if (!record || !held) return "why it was decided";

  return record.status === "AWAITING_USER"
    ? "why it is held"
    : record.status === "APPROVED"
      ? "why it was held and how it was released"
      : "why it was held";
}

export function alderConsole(input: AlderConsoleInput): ConsoleTab[] {
  const name = nameOf(input);
  const focus = focusTransaction(input.activity);

  return [
    {
      id: "person",
      label: "Person",
      tone: "auth",
      note: `This is your Didit console. Everything ${name} just did in ${BANK} is already here, for your team.`,
      page: personPage(input),
      empty: `Open an account in ${BANK} first: the person appears here as soon as Didit knows them.`,
    },
    {
      id: "transaction",
      label: "Transaction",
      tone: "txn",
      note: focus?.record
        ? `This is your Didit console. The ${formatMoney(focus.record.amount || focus.amount)} ${focus.kind === "transfer" ? "transfer" : "payment"} ${name} just made is here, with ${heldNote(focus)}.`
        : "Every payment goes through transaction monitoring. This is the one your team would open.",
      page: transactionPage(input),
      empty: "No payment yet. Send money from Payments.",
    },
    {
      id: "verification",
      label: "Verification",
      tone: "ver",
      note: "The KYC and AML onboarding, as your compliance team sees it.",
      page: verificationPage(input),
      empty: "No verification yet. It starts right after sign-up.",
    },
    {
      id: "device",
      label: "Device",
      tone: "sig",
      note: "The device signals saw, and what it did on this account.",
      page: devicePage(input),
      empty: "Signals has not read this device yet.",
    },
  ];
}
