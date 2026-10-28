/**
 * The console view's page model: what a demo hands the console view to draw
 * a faithful console page (Person, Transaction, Business, Verification,
 * Device) from the visitor's own records. Types only.
 */

import type { Tone } from "./live";

export type TagTone = "ok" | "rev" | "no" | "info" | "neu";

export interface Tag {
  label: string;
  tone: TagTone;
}

export interface Kpi {
  label: string;
  value: string;
  unit?: string;
  /** Colours the value: green for good, amber for attention, red for bad. */
  color?: "ok" | "rev" | "no";
}

export interface Check {
  label: string;
  value: string;
  ok: boolean | null;
}

export interface TimelineItem {
  tone: Tone;
  title: string;
  detail?: string;
  at: string;
}

export interface RuleRow {
  state: "hit" | "passed" | "declined";
  title: string;
  detail?: string;
}

export interface LinkedRecord {
  tone: Tone;
  title: string;
  detail: string;
}

export interface PersonRow {
  name: string;
  role: string;
  status: Tag;
  date?: string;
}

/** One block of the page's main column. */
export type Block =
  | {
      kind: "identity";
      title: string;
      link?: string;
      document: string;
      selfie: string;
      checks: Check[];
    }
  | { kind: "note"; tone: "hold" | "info" | "stop"; text: string }
  | { kind: "rules"; title: string; link?: string; rows: RuleRow[] }
  | { kind: "timeline"; title: string; link?: string; items: TimelineItem[] }
  | { kind: "pairs"; title: string; link?: string; pairs: [string, string][] }
  | { kind: "people"; title: string; link?: string; rows: PersonRow[] }
  | { kind: "checks"; title: string; link?: string; checks: Check[] };

export interface RecordPage {
  kind: "person" | "transaction" | "business" | "verification" | "device";
  /** Breadcrumb: the list, then this record. */
  section: string;
  record: string;
  head: {
    title: string;
    /** "5,000.00 EUR" pages show a direction next to the title. */
    aside?: string;
    tag?: Tag;
    /** A short id in the mono chip. */
    id?: string;
    meta: string[];
    /** An initial for a person; pages without one show an icon. */
    initial?: string;
  };
  kpis: Kpi[];
  blocks: Block[];
  side: {
    title: string;
    pairs: [string, string][];
    tag?: Tag;
  };
  linked: LinkedRecord[];
  /** The list a real console would show on the left, with real counts. */
  nav: { label: string; count?: number }[];
}

export interface ConsoleTab {
  id: string;
  label: string;
  tone: Tone;
  note: string;
  page: RecordPage | null;
  /** Shown instead of a page that has no data yet. */
  empty?: string;
}

/**
 * An open verification session (Didit's "Not Started" or "In Progress"): the
 * console shows it as in progress, never as not started next to a check.
 */
export const IN_PROGRESS: Tag = { label: "In progress", tone: "rev" };

/** True for a session Didit has opened but not decided yet. */
export function isOpenSession(status: string | null | undefined): boolean {
  return status === "Not Started" || status === "In Progress";
}

/** "Started 28 Oct, 16:48" for an open session's meta line and details. */
export function startedLabel(at: string | number | Date | null | undefined) {
  if (at === null || at === undefined) return "Started just now";
  const date = new Date(at);

  if (Number.isNaN(date.getTime())) return "Started just now";

  return `Started ${date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
