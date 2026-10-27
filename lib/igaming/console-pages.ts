import type { ActivityItem, Ledger } from "./ledger";
import type { SessionSummary, TransactionRecord } from "./records";
import type {
  Check,
  ConsoleTab,
  LinkedRecord,
  RecordPage,
  Tag,
  TimelineItem,
} from "../didit/console";
import type { LiveEvent } from "../didit/live";

import { ageText, ruleName } from "./live-events";
import { KYC_THRESHOLD, formatMoney } from "./policy";

/**
 * Aurora Play's console view: the Person, Transaction, Verification and
 * Device pages a casino's team would open in the Didit console, filled only
 * with what this visitor's own session produced. Where there is no record yet
 * the tab says so instead of showing a made-up one. Pure, for `npm test`.
 */

export interface DeviceAccount {
  playerId: string;
  label: string;
  createdAt: number;
}

export interface AuroraConsoleInput {
  player: {
    playerId: string;
    name: string;
    email: string;
    createdAt: number;
  } | null;
  age: SessionSummary | null;
  kyc: SessionSummary | null;
  activity: ActivityItem[];
  events: LiveEvent[];
  device: { persistentId: string; botScore: number; browser: string; os: string } | null;
  /** Every account opened in this browser, the current one included. */
  accounts: DeviceAccount[];
  /** "Passkey", "Email code"; null without Didit Authentication. */
  signIn: string | null;
  totals: Ledger;
  now: number;
}

const time = (at: number, now: number) => {
  const date = new Date(at);
  const today = new Date(now).toDateString() === date.toDateString();
  const clock = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return today
    ? `Today, ${clock}`
    : `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${clock}`;
};

const day = (at: number) =>
  new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const short = (id: string) => (id.length > 14 ? `${id.slice(0, 12)}…${id.slice(-4)}` : id);

const percent = (value: number | null) =>
  value === null ? null : `${value > 1 ? value.toFixed(1) : (value * 100).toFixed(1)}%`;

function statusTag(status: string): Tag {
  const s = status.toUpperCase().replace(/ /g, "_");

  if (s === "APPROVED") return { label: "Approved", tone: "ok" };
  if (s === "DECLINED") return { label: "Declined", tone: "no" };
  if (s === "AWAITING_USER") return { label: "On hold", tone: "rev" };
  if (s === "IN_REVIEW") return { label: "In review", tone: "rev" };

  return { label: status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " "), tone: "neu" };
}

function riskOf(activity: ActivityItem[]) {
  const scores = activity.map((item) => item.record?.score ?? 0);
  const top = scores.length ? Math.max(...scores) : 0;

  if (top >= 60) return { value: "High", color: "no" as const };
  if (top >= 30) return { value: "Medium", color: "rev" as const };

  return { value: "Low", color: "ok" as const };
}

function identityChecks(input: AuroraConsoleInput): Check[] {
  const checks: Check[] = [];
  const { kyc, age } = input;

  if (kyc) {
    const face = percent(kyc.faceMatch);
    const live = percent(kyc.liveness);

    if (face) checks.push({ label: "Face match", value: `${face} · selfie vs document`, ok: kyc.status === "Approved" });
    if (live) checks.push({ label: "Liveness", value: `Passed · ${live}`, ok: true });
  }
  if (age) {
    checks.push({
      label: "Age",
      value: [ageText(age), kyc?.documentAge ? `${kyc.documentAge} on the ID` : null]
        .filter(Boolean)
        .join(", "),
      ok: age.status === "Approved" ? true : age.status === "Declined" ? false : null,
    });
  }
  if (kyc?.documentType) {
    checks.push({
      label: "Document",
      value: [kyc.documentType, kyc.documentCountry].filter(Boolean).join(" · "),
      ok: kyc.status === "Approved" ? true : kyc.status === "Declined" ? false : null,
    });
  }
  if (kyc && kyc.amlHits !== null) {
    checks.push({
      label: "AML",
      value: kyc.amlHits === 0 ? "No matches" : `${kyc.amlHits} possible matches`,
      ok: kyc.amlHits === 0,
    });
  }

  return checks;
}

function timeline(events: LiveEvent[], now: number): TimelineItem[] {
  return events
    .slice(0, 12)
    .map((event) => ({ tone: event.tone, title: event.title, detail: event.detail, at: time(event.at, now) }));
}

/** The transaction the team would open: the held one, else the newest. */
export function focusTransaction(activity: ActivityItem[]): ActivityItem | null {
  return (
    activity.find((item) => item.record && ["AWAITING_USER", "IN_REVIEW", "DECLINED"].includes(item.record.status)) ??
    activity.find((item) => item.record) ??
    null
  );
}

function linkedRecords(input: AuroraConsoleInput): LinkedRecord[] {
  const linked: LinkedRecord[] = [];
  const others = input.accounts.filter((account) => account.playerId !== input.player?.playerId);

  for (const other of others.slice(0, 2)) {
    linked.push({ tone: "sig", title: other.label, detail: "Same device" });
  }
  if (input.kyc) {
    linked.push({
      tone: "ver",
      title: `${short(input.kyc.sessionId)} · Core KYC`,
      detail: statusTag(input.kyc.status).label,
    });
  } else if (input.age) {
    linked.push({
      tone: "ver",
      title: `${short(input.age.sessionId)} · Age check`,
      detail: statusTag(input.age.status).label,
    });
  }
  const focus = focusTransaction(input.activity);

  if (focus?.record) {
    linked.push({
      tone: "txn",
      title: `${focus.record.txnId} · ${formatMoney(focus.amount)}`,
      detail: statusTag(focus.record.status).label,
    });
  }

  return linked;
}

function personPage(input: AuroraConsoleInput): RecordPage | null {
  const { player } = input;

  if (!player) return null;
  const name = input.kyc?.fullName ?? player.name ?? player.email;
  const risk = riskOf(input.activity);
  const others = input.accounts.filter((account) => account.playerId !== player.playerId).length;
  const tag: Tag =
    input.kyc?.status === "Approved"
      ? { label: "Verified", tone: "ok" }
      : input.age?.status === "Approved"
        ? { label: "Age checked", tone: "info" }
        : { label: "Not verified", tone: "neu" };
  const checks = identityChecks(input);
  const signIns = input.events.filter((event) => event.product === "authentication").length;

  return {
    kind: "person",
    section: "People",
    record: name,
    head: {
      title: name,
      tag,
      id: short(player.playerId),
      initial: name.charAt(0).toUpperCase(),
      meta: [
        input.age?.ip?.country ?? input.kyc?.ip?.country ?? null,
        `Joined ${new Date(player.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        `Last active ${time(input.events[0]?.at ?? player.createdAt, input.now).replace("Today", "today")}`,
      ].filter((item): item is string => Boolean(item)),
    },
    kpis: [
      input.signIn
        ? { label: "Sign-ins", value: String(Math.max(signIns, 1)), unit: input.signIn.toLowerCase() }
        : { label: "Sign-ins", value: "1", unit: "demo sign-in" },
      { label: "Risk", value: risk.value, unit: "overall", color: risk.color },
      { label: "Deposits", value: `${input.totals.depositedTotal.toLocaleString("en-US")} EUR`, unit: "30 days" },
      { label: "Linked accounts", value: String(others), unit: "same device", color: others ? "no" : undefined },
    ],
    blocks: [
      checks.length
        ? {
            kind: "identity",
            title: input.kyc ? "Identity" : "Age check",
            link: short((input.kyc ?? input.age)!.sessionId),
            document: input.kyc?.documentType
              ? `${(input.kyc.documentCountry ?? "").toUpperCase()} · ${input.kyc.documentType.toUpperCase()}`
              : "AGE ESTIMATION",
            selfie: input.kyc ? "Selfie · liveness passed" : "Selfie · deleted after the estimate",
            checks,
          }
        : { kind: "note", tone: "info", text: `${name} has not finished a verification yet.` },
      { kind: "timeline", title: "One timeline, every Didit product", link: "All events", items: timeline(input.events, input.now) },
    ],
    side: {
      title: "Details",
      pairs: [
        ["Email", player.email],
        ["Sign-in", input.signIn ? `${input.signIn} · 1 device` : "Aurora Play sign-in"],
        ...(input.device ? ([["Device", `${input.device.browser} on ${input.device.os}`]] as [string, string][]) : []),
        ...(input.age?.ip
          ? ([["Network", `${input.age.ip.isVpnOrTor ? "VPN" : input.age.ip.isDataCenter ? "Data centre" : "Residential"} · ${input.age.ip.country ?? "unknown"}`]] as [string, string][])
          : []),
        ["Vendor data", player.playerId],
        ["First seen", day(player.createdAt)],
      ],
    },
    linked: linkedRecords(input),
    nav: [
      { label: "All people", count: input.accounts.length },
      { label: "Verified", count: input.kyc?.status === "Approved" ? 1 : 0 },
      { label: "Needs review" },
      { label: "Linked accounts", count: others },
    ],
  };
}

function transactionPage(input: AuroraConsoleInput): RecordPage | null {
  const focus = focusTransaction(input.activity);
  const record: TransactionRecord | null = focus?.record ?? null;

  if (!focus || !record || !input.player) return null;
  const name = input.kyc?.fullName ?? input.player.name ?? input.player.email;
  const held = record.status === "AWAITING_USER";
  const released = record.status === "APPROVED" && focus.kind === "deposit" && input.kyc?.status === "Approved";
  const at = record.createdAt ? Date.parse(record.createdAt) : focus.at;
  const score = Math.round(record.score);

  return {
    kind: "transaction",
    section: "Transactions",
    record: record.txnId,
    head: {
      title: formatMoney(record.amount || focus.amount),
      aside: record.direction === "in" ? "Inbound" : "Outbound",
      tag: statusTag(record.status),
      meta: [
        `${name} → Aurora Play`,
        focus.kind === "deposit" || focus.kind === "withdrawal" ? "Visa ending 4417" : focus.detail ?? focus.kind,
        time(Number.isFinite(at) ? at : focus.at, input.now),
      ],
    },
    kpis: [
      { label: "Risk score", value: `${score} / 100`, color: score >= 60 ? "no" : score >= 30 ? "rev" : "ok" },
      { label: "Amount", value: formatMoney(record.amount || focus.amount) },
      { label: "Rules triggered", value: String(record.ruleHits.length) },
      record.action
        ? { label: "Step-up", value: "ID check", unit: (record.action.status ?? "pending").toLowerCase().replace(/_/g, " "), color: input.kyc?.status === "Approved" ? "ok" : "rev" }
        : { label: "Step-up", value: "None", unit: "needed" },
    ],
    blocks: [
      ...(held
        ? [{ kind: "note" as const, tone: "hold" as const, text: `Held because ${name}'s deposits reach ${KYC_THRESHOLD.toLocaleString("en-US")} EUR in 30 days. Didit asked for an ID check in the same cashier; the deposit is released as soon as it is approved.` }]
        : released
          ? [{ kind: "note" as const, tone: "info" as const, text: `Held at ${KYC_THRESHOLD.toLocaleString("en-US")} EUR in 30 days, then released automatically once ${name}'s ID check was approved. Nobody on your team had to look at it.` }]
          : record.status === "IN_REVIEW" || record.status === "DECLINED"
            ? [{ kind: "note" as const, tone: "stop" as const, text: record.tags.includes("BONUS_ABUSE") ? "The welcome offer was already claimed by another player on this device, so the claim did not go through." : `Didit ${record.status === "DECLINED" ? "declined" : "held"} this transaction: ${record.reason ?? `risk ${score} of 100`}.` }]
            : []),
      {
        kind: "rules",
        title: "Rules",
        link: "iGaming ruleset",
        rows: record.ruleHits.length
          ? record.ruleHits.map((hit) => ({
              state: hit.statusTarget === "DECLINED" ? ("declined" as const) : ("hit" as const),
              title: ruleName(hit.title),
              detail: hit.statusTarget ? `action: ${hit.statusTarget.toLowerCase().replace(/_/g, " ")}` : `+${hit.scoreDelta} risk`,
            }))
          : [{ state: "passed" as const, title: "No rule matched", detail: "approved on its own" }],
      },
      {
        kind: "pairs",
        title: "Overview",
        pairs: [
          ["Transaction ID", record.txnId],
          ["Didit ID", short(record.id)],
          ["Type", record.actionType.replace(/_/g, " ")],
          ["Category", record.category],
          ["Device", record.device.fingerprint ? short(record.device.fingerprint) : "Attached by the SDK"],
          ["IP country", record.device.ipCountry ?? "Unknown"],
        ],
      },
    ],
    side: {
      title: "Review",
      tag: statusTag(record.status),
      pairs: [
        ["Decided by", record.action ? "Rule + ID check" : record.ruleHits.length ? "Rules" : "Automatic"],
        ["Queue", record.status === "IN_REVIEW" ? "Manual review" : "None needed"],
        ["Score", `${score} / 100`],
      ],
    },
    linked: linkedRecords(input).filter((item) => item.tone !== "txn"),
    nav: [
      { label: "All transactions", count: input.activity.filter((item) => item.record).length },
      { label: "On hold", count: input.activity.filter((item) => item.record?.status === "AWAITING_USER").length },
      { label: "Declined", count: input.activity.filter((item) => item.record?.status === "DECLINED").length },
      { label: "Rules" },
    ],
  };
}

function verificationPage(input: AuroraConsoleInput): RecordPage | null {
  const session = input.kyc ?? input.age;

  if (!session || !input.player) return null;
  const kyc = session === input.kyc;
  const checks = identityChecks(input);

  return {
    kind: "verification",
    section: "Verifications",
    record: short(session.sessionId),
    head: {
      title: kyc ? "Core KYC" : "Age estimation",
      tag: statusTag(session.status),
      id: short(session.sessionId),
      meta: [input.kyc?.fullName ?? input.player.email, kyc ? "ID, liveness and face match" : "Selfie age estimate"],
    },
    kpis: [],
    blocks: [
      { kind: "checks", title: "Checks", checks: checks.length ? checks : [{ label: "Status", value: session.status, ok: null }] },
      ...(session.ip
        ? [{
            kind: "pairs" as const,
            title: "IP analysis",
            pairs: [
              ["Country", session.ip.country ?? "Unknown"],
              ["VPN or Tor", session.ip.isVpnOrTor ? "Yes" : "No"],
              ["Data centre", session.ip.isDataCenter ? "Yes" : "No"],
            ] as [string, string][],
          }]
        : []),
    ],
    side: { title: "Details", tag: statusTag(session.status), pairs: [["Workflow", kyc ? "Core KYC" : "Age estimation"], ["Vendor data", input.player.playerId]] },
    linked: linkedRecords(input).filter((item) => item.tone !== "ver"),
    nav: [{ label: "All verifications", count: [input.age, input.kyc].filter(Boolean).length }, { label: "Needs review" }],
  };
}

function devicePage(input: AuroraConsoleInput): RecordPage | null {
  const { device } = input;

  if (!device) return null;
  const others = input.accounts.length;

  return {
    kind: "device",
    section: "Devices",
    record: short(device.persistentId),
    head: {
      title: `${device.browser} on ${device.os}`,
      tag: others > 1 ? { label: `${others} accounts`, tone: "rev" } : { label: "One account", tone: "ok" },
      id: short(device.persistentId),
      meta: ["Didit signals fingerprint"],
    },
    kpis: [
      { label: "Accounts", value: String(others), unit: "on this device", color: others > 1 ? "no" : undefined },
      { label: "Bot score", value: device.botScore.toFixed(2), color: device.botScore < 0.5 ? "ok" : "no" },
    ],
    blocks: [
      {
        kind: "people",
        title: "Accounts on this device",
        rows: input.accounts.map((account) => ({
          name: account.label,
          role: account.playerId,
          status: account.playerId === input.player?.playerId ? { label: "Current", tone: "info" } : { label: "Same device", tone: "rev" },
          date: day(account.createdAt),
        })),
      },
    ],
    side: { title: "Details", pairs: [["Browser", device.browser], ["System", device.os], ["Persistent id", short(device.persistentId)]] },
    linked: [],
    nav: [{ label: "All devices", count: 1 }],
  };
}

export function auroraConsole(input: AuroraConsoleInput): ConsoleTab[] {
  const name = input.kyc?.fullName ?? input.player?.name ?? "this player";

  return [
    {
      id: "person",
      label: "Person",
      tone: "auth",
      note: `This is your Didit console. Everything ${name} just did in Aurora Play is already here, for your team.`,
      page: personPage(input),
      empty: "Sign up in Aurora Play first: the person appears here as soon as Didit knows them.",
    },
    {
      id: "transaction",
      label: "Transaction",
      tone: "txn",
      note: "Every deposit, bet and bonus goes through transaction monitoring. This is the one your team would open.",
      page: transactionPage(input),
      empty: "No transaction yet. Make a deposit in the cashier.",
    },
    {
      id: "verification",
      label: "Verification",
      tone: "ver",
      note: "The age check and the ID check, as your compliance team sees them.",
      page: verificationPage(input),
      empty: "No verification yet. The age check starts right after sign-up.",
    },
    {
      id: "device",
      label: "Device",
      tone: "sig",
      note: "The device signals saw, and every account opened on it.",
      page: devicePage(input),
      empty: "Signals has not read this device yet.",
    },
  ];
}
