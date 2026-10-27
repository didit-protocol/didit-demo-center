import type { AccountView } from "./onboarding";
import type { ActivityItem } from "./transactions";
import type {
  Check,
  ConsoleTab,
  LinkedRecord,
  RecordPage,
  RuleRow,
  Tag,
  TimelineItem,
} from "../didit/console";
import type { LiveEvent } from "../didit/live";

import { formatAmount } from "./markets";
import {
  ASSETS,
  ruleName,
  shortAddress,
  travelRuleLabel,
  withdrawalStage,
} from "./transactions";

/**
 * Kestrel's console view: the Person, Transaction, Verification and Device
 * pages a crypto exchange's compliance team would open in the Didit console,
 * filled only with what this visitor's own session produced. Where there is
 * no record yet the tab says so instead of showing a made-up one. Pure, for
 * `npm test`.
 */

export interface KestrelConsoleInput {
  /** The Kestrel user id Didit knows them by (`vendor_data`). */
  userId: string | null;
  email: string | null;
  account: AccountView | null;
  activity: ActivityItem[];
  events: LiveEvent[];
  device: {
    persistentId: string;
    firstVisit: boolean;
    botScore: number;
    browser: string;
    os: string;
  } | null;
  /** "Passkey", "Email code"; null without Didit Authentication. */
  signIn: string | null;
  now: number;
}

const time = (at: number, now: number) => {
  const date = new Date(at);
  const today = new Date(now).toDateString() === date.toDateString();
  const clock = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return today
    ? `Today ${clock}`
    : `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${clock}`;
};

const short = (id: string) =>
  id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;

const amountOf = (item: ActivityItem) =>
  `${formatAmount(Number(item.view.amount) || 0).replace(/\.?0+$/, "")} ${item.view.currency || item.asset}`;

function statusTag(status: string): Tag {
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

const nameOf = (input: KestrelConsoleInput) =>
  input.account?.fullName ?? input.email ?? "This customer";

/** The transaction the team would open: the declined one, else the held one, else the newest. */
export function focusTransaction(
  activity: ActivityItem[],
): ActivityItem | null {
  return (
    activity.find((item) => item.view.status === "DECLINED") ??
    activity.find((item) =>
      ["AWAITING_USER", "IN_REVIEW"].includes(item.view.status),
    ) ??
    activity[0] ??
    null
  );
}

function kycChecks(account: AccountView): Check[] {
  return account.checks.map((check) => ({
    label: check.label,
    value:
      check.label === "AML screening" && account.amlHits !== null
        ? account.amlHits === 0
          ? "No matches"
          : `${account.amlHits} possible ${account.amlHits === 1 ? "match" : "matches"}`
        : (check.status ?? "Not run"),
    ok:
      check.status === null
        ? null
        : check.status === "Approved"
          ? true
          : check.status === "Declined"
            ? false
            : null,
  }));
}

function timeline(events: LiveEvent[], now: number): TimelineItem[] {
  return events.slice(0, 12).map((event) => ({
    tone: event.tone,
    title: event.title,
    detail: event.detail,
    at: time(event.at, now),
  }));
}

function linkedRecords(
  input: KestrelConsoleInput,
  except: ActivityItem | null,
): LinkedRecord[] {
  const linked: LinkedRecord[] = [];

  if (input.account) {
    linked.push({
      tone: "ver",
      title: `${nameOf(input)} · KYC`,
      detail: [statusTag(input.account.status).label, input.account.document]
        .filter(Boolean)
        .join(" · "),
    });
  }
  for (const item of input.activity
    .filter((entry) => entry !== except)
    .slice(0, 2)) {
    linked.push({
      tone: "txn",
      title: `${short(item.view.txnId || item.id)} · ${amountOf(item)} ${item.kind}`,
      detail:
        item.kind === "withdrawal" && withdrawalStage(item.view) === "ready"
          ? `Travel Rule · released${item.view.stepUp ? " after the selfie" : ""}`
          : statusTag(item.view.status).label,
    });
  }
  if (input.device) {
    linked.push({
      tone: "sig",
      title: `Device ${short(input.device.persistentId)}`,
      detail: `${input.device.browser} on ${input.device.os} · ${input.device.firstVisit ? "new" : "known"} device`,
    });
  }

  return linked;
}

function personPage(input: KestrelConsoleInput): RecordPage | null {
  if (!input.userId && !input.email) return null;
  const name = nameOf(input);
  const tag: Tag =
    input.account?.stage === "approved"
      ? { label: "Verified", tone: "ok" }
      : input.account?.stage === "review"
        ? { label: "In review", tone: "rev" }
        : input.account?.stage === "declined"
          ? { label: "Declined", tone: "no" }
          : { label: "Not verified", tone: "neu" };
  const declined = input.activity.filter(
    (item) => item.view.status === "DECLINED",
  ).length;

  return {
    kind: "person",
    section: "People",
    record: name,
    head: {
      title: name,
      tag,
      id: input.userId ? short(input.userId) : undefined,
      initial: name.charAt(0).toUpperCase(),
      meta: [
        input.account?.document ?? null,
        `Last active ${time(input.events[0]?.at ?? input.now, input.now).toLowerCase()}`,
      ].filter((item): item is string => Boolean(item)),
    },
    kpis: [
      {
        label: "Sign-in",
        value: input.signIn ?? "Kestrel",
        unit: input.signIn ? "Didit" : "own sign-in",
      },
      {
        label: "KYC and AML",
        value: input.account ? statusTag(input.account.status).label : "None",
        color:
          input.account?.stage === "approved"
            ? "ok"
            : input.account?.stage === "declined"
              ? "no"
              : input.account
                ? "rev"
                : undefined,
      },
      {
        label: "Transactions",
        value: String(input.activity.length),
        unit: "monitored",
      },
      {
        label: "Declined",
        value: String(declined),
        color: declined ? "no" : undefined,
      },
    ],
    blocks: [
      input.account
        ? {
            kind: "identity",
            title: "Identity",
            link: short(input.account.sessionId),
            document: (input.account.document ?? "ID document").toUpperCase(),
            selfie: "Selfie · liveness and face match",
            checks: kycChecks(input.account),
          }
        : {
            kind: "note",
            tone: "info",
            text: `${name} has not verified yet. Kestrel asks for it before the first deposit.`,
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
        ...(input.email ? ([["Email", input.email]] as [string, string][]) : []),
        ...(input.device
          ? ([["Device", `${input.device.browser} on ${input.device.os}`]] as [
              string,
              string,
            ][])
          : []),
        ...(input.userId
          ? ([["Vendor data", short(input.userId)]] as [string, string][])
          : []),
      ],
    },
    linked: linkedRecords(input, null),
    nav: [
      { label: "All people", count: 1 },
      { label: "Verified", count: input.account?.stage === "approved" ? 1 : 0 },
      { label: "Needs review", count: input.account?.stage === "review" ? 1 : 0 },
    ],
  };
}

function ruleRows(
  input: KestrelConsoleInput,
  focus: ActivityItem,
): RuleRow[] {
  const view = focus.view;
  const rows: RuleRow[] = view.rules
    .filter((rule) => rule.statusTarget)
    .map((rule) => ({
      state:
        rule.statusTarget === "DECLINED"
          ? ("declined" as const)
          : ("hit" as const),
      title: ruleName(rule.title),
      detail: `action: ${(rule.statusTarget ?? "").toLowerCase().replace(/_/g, " ")}`,
    }));
  const declined = view.status === "DECLINED";

  if (view.travelRule) {
    rows.push({
      state: declined ? "passed" : "hit",
      title: "Travel Rule",
      detail: declined
        ? "not reached, declined first"
        : travelRuleLabel(view.travelRule.status).toLowerCase(),
    });
  }
  if (input.account?.stage === "approved") {
    rows.push({
      state: "passed",
      title: "Customer risk",
      detail: `KYC approved · ${input.account.amlHits ? "AML matches" : "AML clear"}`,
    });
  }
  if (input.device && input.device.botScore < 0.5) {
    rows.push({
      state: "passed",
      title: "Device",
      detail: `${input.device.firstVisit ? "new" : "known"} device · human`,
    });
  }

  return rows.length
    ? rows
    : [{ state: "passed", title: "No rule matched", detail: "approved on its own" }];
}

function transactionPage(input: KestrelConsoleInput): RecordPage | null {
  const focus = focusTransaction(input.activity);

  if (!focus) return null;
  const view = focus.view;
  const name = nameOf(input);
  const outbound = focus.kind === "withdrawal";
  const score = view.screening?.riskScore ?? null;
  const sanctioned = Boolean(
    view.screening?.walletSanctioned || view.screening?.sanctionsHit,
  );
  const at = Date.parse(focus.createdAt);
  const wallet = shortAddress(view.wallet ?? focus.wallet);
  const network = ASSETS[focus.asset]?.network ?? view.currency;
  const hits = view.rules.filter((rule) => rule.statusTarget).length;
  const declinedBy = view.rules.find((rule) => rule.statusTarget === "DECLINED");
  const blocks: RecordPage["blocks"] = [];

  if (view.status === "DECLINED") {
    blocks.push({
      kind: "note",
      tone: "stop",
      text: `Declined because the ${outbound ? "destination" : "sending"} wallet scores ${score ?? "high"} of 100${sanctioned ? ", with direct exposure to a sanctioned entity" : ""}. ${input.account?.stage === "approved" ? `${name} is KYC-approved, so nothing points at the account: only the wallet was the problem. ` : ""}${outbound ? `No ${view.currency} left the platform.` : "The funds were not credited."}`,
    });
  } else if (view.status === "AWAITING_USER") {
    blocks.push({
      kind: "note",
      tone: "hold",
      text: `Held for ${name}: ${withdrawalStage(view) === "prove-ownership" ? "the Travel Rule asks for proof that the self-hosted wallet is theirs, then a selfie" : "a selfie matched to the face verified at sign-up"}. It is released as soon as that is done.`,
    });
  }
  blocks.push(
    {
      kind: "rules",
      title: "Rules",
      link: "Kestrel demo rules",
      rows: ruleRows(input, focus),
    },
    {
      kind: "pairs",
      title: "Overview",
      pairs: [
        ["Transaction ID", short(view.id || focus.id)],
        ["External ID", short(view.txnId)],
        ["Asset and chain", `${focus.asset} · ${network}`],
        [outbound ? "Destination" : "Source", wallet],
        ...(view.travelRule
          ? ([["Travel Rule", travelRuleLabel(view.travelRule.status)]] as [
              string,
              string,
            ][])
          : []),
        ["Risk score", `${Math.round(view.score)}`],
      ],
    },
  );

  return {
    kind: "transaction",
    section: "Transactions",
    record: short(view.id || focus.id),
    head: {
      title: amountOf(focus),
      aside: outbound ? "Outbound" : "Inbound",
      tag: statusTag(view.status),
      meta: [
        outbound ? `${name} → ${wallet}` : `${wallet} → ${name}`,
        outbound ? "Crypto withdrawal" : "Crypto deposit",
        network,
        Number.isFinite(at) ? time(at, input.now) : "",
      ].filter(Boolean),
    },
    kpis: [
      {
        label: "Wallet risk",
        value: score === null ? "Not screened" : `${Math.round(score)} / 100`,
        color:
          score === null
            ? undefined
            : score >= 75
              ? "no"
              : score >= 40
                ? "rev"
                : "ok",
      },
      { label: "Amount", value: amountOf(focus) },
      { label: "Rules triggered", value: String(hits) },
      {
        label: "Exposure",
        value: sanctioned ? "Sanctions" : "None found",
        unit: sanctioned ? "direct" : undefined,
        color: sanctioned ? "no" : "ok",
      },
    ],
    blocks,
    side: {
      title: "Review",
      tag: statusTag(view.status),
      pairs: [
        [
          "Decided by",
          declinedBy
            ? `Rule · ${ruleName(declinedBy.title).toLowerCase()}`
            : hits
              ? "Rules"
              : "Automatic",
        ],
        ["Queue", view.status === "IN_REVIEW" ? "Manual review" : "None needed"],
        ...(view.stepUp
          ? ([["Selfie step-up", view.stepUp.status || "Requested"]] as [
              string,
              string,
            ][])
          : []),
      ],
    },
    linked: linkedRecords(input, focus),
    nav: [
      { label: "All transactions", count: input.activity.length },
      {
        label: "On hold",
        count: input.activity.filter(
          (item) => item.view.status === "AWAITING_USER",
        ).length,
      },
      {
        label: "Declined",
        count: input.activity.filter((item) => item.view.status === "DECLINED")
          .length,
      },
      { label: "Rules" },
      { label: "Lists" },
    ],
  };
}

function verificationPage(input: KestrelConsoleInput): RecordPage | null {
  const account = input.account;

  if (!account) return null;

  return {
    kind: "verification",
    section: "Verifications",
    record: short(account.sessionId),
    head: {
      title: "KYC and AML",
      tag: statusTag(account.status),
      id: short(account.sessionId),
      meta: [nameOf(input), "ID, liveness, face match and AML screening"],
    },
    kpis: [],
    blocks: [{ kind: "checks", title: "Checks", checks: kycChecks(account) }],
    side: {
      title: "Details",
      tag: statusTag(account.status),
      pairs: [
        ["Workflow", "Crypto onboarding (KYC + AML)"],
        ...(account.document
          ? ([["Document", account.document]] as [string, string][])
          : []),
        ...(input.userId
          ? ([["Vendor data", short(input.userId)]] as [string, string][])
          : []),
      ],
    },
    linked: linkedRecords(input, null).filter((item) => item.tone !== "ver"),
    nav: [{ label: "All verifications", count: 1 }, { label: "Needs review" }],
  };
}

function devicePage(input: KestrelConsoleInput): RecordPage | null {
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
        label: "Visits",
        value: device.firstVisit ? "First" : "Returning",
      },
    ],
    blocks: [
      {
        kind: "people",
        title: "Accounts on this device",
        rows: input.userId
          ? [
              {
                name: nameOf(input),
                role: short(input.userId),
                status: { label: "Current", tone: "info" },
              },
            ]
          : [],
      },
    ],
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

export function kestrelConsole(input: KestrelConsoleInput): ConsoleTab[] {
  const focus = focusTransaction(input.activity);
  const declined = focus?.view.status === "DECLINED";

  return [
    {
      id: "person",
      label: "Person",
      tone: "auth",
      note: `This is your Didit console. Everything ${nameOf(input)} just did in Kestrel is already here, for your team.`,
      page: personPage(input),
      empty:
        "Sign up in Kestrel first: the person appears here as soon as Didit knows them.",
    },
    {
      id: "transaction",
      label: "Transaction",
      tone: "txn",
      note: focus
        ? `This is your Didit console. The ${focus.asset} ${focus.kind} Kestrel just ${declined ? "declined" : "screened"} is here, with the wallet's risk and what your rules did.`
        : "Every deposit and withdrawal goes through transaction monitoring.",
      page: transactionPage(input),
      empty: "No transaction yet. Make a deposit once your KYC is approved.",
    },
    {
      id: "verification",
      label: "Verification",
      tone: "ver",
      note: "The KYC and AML check before the first deposit, as your compliance team sees it.",
      page: verificationPage(input),
      empty: "No verification yet. It starts before the first deposit.",
    },
    {
      id: "device",
      label: "Device",
      tone: "sig",
      note: "The device signals saw, from the first page load.",
      page: devicePage(input),
      empty: "Signals has not read this device yet.",
    },
  ];
}
