"use client";

import type { Tone } from "@/lib/didit/live";

import * as React from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleSlash,
  Eye,
  FileText,
  Home,
  Inbox,
  Link2,
  List,
  ListChecks,
  Lock,
  PanelLeft,
  ScanFace,
  Sparkles,
  Timer,
  User,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { DiditRing, TONE_CLASS, ToneIcon } from "./icons";

/* ── The page model: what a demo hands the console view ─────────────── */

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
  | { kind: "identity"; title: string; link?: string; document: string; selfie: string; checks: Check[] }
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

/* ── Building blocks ────────────────────────────────────────────────── */

function TagChip({ tag }: { tag: Tag }) {
  return <span className={`cs-tag ${tag.tone}`}>{tag.label}</span>;
}

function OkIcon({ ok }: { ok: boolean | null }) {
  if (ok === null) return <Timer aria-hidden className="text-[#9A5200]" size={18} />;

  return ok ? (
    <CircleCheck aria-hidden className="cs-ok" size={18} />
  ) : (
    <CircleSlash aria-hidden className="cs-bad" size={18} />
  );
}

function BoxHead({ title, link }: { title: string; link?: string }) {
  return (
    <div className="cs-box-h">
      {title}
      {/* A preview: the link names where the console would go. */}
      {link ? <a href="#preview">{link}</a> : null}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "identity":
      return (
        <div className="cs-box">
          <BoxHead link={block.link} title={block.title} />
          <div className="cs-id-doc">
            <div className="flex flex-col gap-2.5">
              <div className="cs-doc">
                <b>{block.document}</b>
                <span className="cs-face">
                  <User aria-hidden size={26} />
                </span>
                <i style={{ top: 34, width: 96 }} />
                <i style={{ top: 48, width: 70 }} />
                <i style={{ top: 62, width: 104 }} />
                <i style={{ top: 76, width: 60 }} />
                <u />
              </div>
              <span className="flex items-center gap-2 text-[12.5px] text-[#6B6B6B]">
                <ScanFace aria-hidden size={16} /> {block.selfie}
              </span>
            </div>
            <dl className="cs-checks m-0">
              {block.checks.map((check) => (
                <div key={check.label}>
                  <dt>{check.label}</dt>
                  <dd>{check.value}</dd>
                  <OkIcon ok={check.ok} />
                </div>
              ))}
            </dl>
          </div>
        </div>
      );
    case "checks":
      return (
        <div className="cs-box">
          <BoxHead link={block.link} title={block.title} />
          <dl className="cs-checks m-0 px-3.5 py-1.5">
            {block.checks.map((check) => (
              <div key={check.label}>
                <dt>{check.label}</dt>
                <dd>{check.value}</dd>
                <OkIcon ok={check.ok} />
              </div>
            ))}
          </dl>
        </div>
      );
    case "note":
      return (
        <div
          className={`cs-hold${block.tone === "stop" ? " is-stop" : block.tone === "info" ? " is-info" : ""}`}
        >
          <span className="flex gap-3">
            {block.tone === "hold" ? (
              <Timer aria-hidden className="mt-0.5 flex-none text-[#D97706]" size={18} />
            ) : block.tone === "stop" ? (
              <CircleSlash aria-hidden className="mt-0.5 flex-none text-[#E5484D]" size={18} />
            ) : (
              <Eye aria-hidden className="mt-0.5 flex-none text-[#2567FF]" size={18} />
            )}
            <span>{block.text}</span>
          </span>
        </div>
      );
    case "rules":
      return (
        <div className="cs-box">
          <BoxHead link={block.link} title={block.title} />
          <div className="cs-rules">
            {block.rows.map((row) => (
              <div key={row.title}>
                {row.state === "passed" ? (
                  <CheckCircle2 aria-hidden className="cs-ok" size={18} />
                ) : row.state === "declined" ? (
                  <CircleSlash aria-hidden className="cs-bad" size={18} />
                ) : (
                  <AlertTriangle aria-hidden className="text-[#9A5200]" size={18} />
                )}
                <span>
                  <b className="font-medium text-[#1A1A1A]">{row.title}</b>
                  {row.detail ? (
                    <span className="text-[#6B6B6B]"> · {row.detail}</span>
                  ) : null}
                </span>
                <TagChip
                  tag={
                    row.state === "passed"
                      ? { label: "Passed", tone: "ok" }
                      : row.state === "declined"
                        ? { label: "Declined", tone: "no" }
                        : { label: "Hit", tone: "rev" }
                  }
                />
              </div>
            ))}
          </div>
        </div>
      );
    case "timeline":
      return (
        <div className="cs-box">
          <BoxHead link={block.link} title={block.title} />
          <div className="cs-tl">
            {block.items.length === 0 ? (
              <p className="cs-empty m-0">Nothing recorded yet.</p>
            ) : null}
            {block.items.map((item, index) => (
              <div key={`${item.title}-${index}`} className={TONE_CLASS[item.tone]}>
                <i className="cs-pi">
                  <ToneIcon size={14} tone={item.tone} />
                </i>
                <span>
                  <b>{item.title}</b>
                  {item.detail ? <span className="d"> · {item.detail}</span> : null}
                </span>
                <time>{item.at}</time>
              </div>
            ))}
          </div>
        </div>
      );
    case "pairs":
      return (
        <div className="cs-box">
          <BoxHead link={block.link} title={block.title} />
          <dl className="cs-grid2 m-0 px-3.5 py-3">
            {block.pairs.map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-3 py-1 text-[12.5px]">
                <dt className="text-[#6B6B6B]">{key}</dt>
                <dd className="m-0 truncate text-right text-[#1A1A1A]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "people":
      return (
        <div className="cs-box">
          <BoxHead link={block.link} title={block.title} />
          <div className="cs-people">
            {block.rows.map((row) => (
              <div key={row.name}>
                <span className="ini">
                  {row.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span>
                  <b>{row.name}</b>
                  <span className="d">{row.role}</span>
                </span>
                <TagChip tag={row.status} />
                <span className="text-xs text-[#8A8A8A]">{row.date}</span>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

const KIND_ICON = {
  person: Users,
  transaction: ArrowLeftRight,
  business: Building2,
  verification: ScanFace,
  device: Link2,
} as const;

function Page({ page }: { page: RecordPage }) {
  const Icon = KIND_ICON[page.kind];

  return (
    <div className="cs-card">
      <div className="cs-crumb">
        <PanelLeft aria-hidden size={16} />
        {page.section}
        <ChevronRight aria-hidden size={14} />
        <b>{page.record}</b>
        <span className="cs-r">
          <span className="cs-b">
            <Sparkles aria-hidden size={14} /> Ask Didit
          </span>
        </span>
      </div>
      <div className="cs-main">
        <div className="cs-page">
          <div className="cs-h">
            {page.head.initial ? (
              <span className="cs-ava is-ini">{page.head.initial}</span>
            ) : (
              <span className="cs-ava rounded-[14px]">
                <Icon aria-hidden size={22} />
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2>{page.head.title}</h2>
                {page.head.aside ? (
                  <span className="text-[13px] text-[#6B6B6B]">{page.head.aside}</span>
                ) : null}
                {page.head.tag ? <TagChip tag={page.head.tag} /> : null}
              </div>
              <div className="cs-meta">
                {page.head.id ? <span className="cs-id">{page.head.id}</span> : null}
                {page.head.meta.map((item) => (
                  <span key={item}>· {item}</span>
                ))}
              </div>
            </div>
          </div>
          {page.kpis.length ? (
            <div className="cs-kpis">
              {page.kpis.map((kpi) => (
                <div key={kpi.label} className="cs-kpi">
                  <small>{kpi.label}</small>
                  <b
                    className={
                      kpi.color === "ok"
                        ? "text-[#1B7A3A]"
                        : kpi.color === "rev"
                          ? "text-[#B45309]"
                          : kpi.color === "no"
                            ? "text-[#C62828]"
                            : undefined
                    }
                  >
                    {kpi.value}
                    {kpi.unit ? <em>{kpi.unit}</em> : null}
                  </b>
                </div>
              ))}
            </div>
          ) : null}
          {page.blocks.map((block, index) => (
            <BlockView key={`${block.kind}-${index}`} block={block} />
          ))}
        </div>
        <aside className="cs-side">
          <h4>{page.side.title}</h4>
          <dl className="cs-panel cs-kv m-0">
            {page.side.tag ? (
              <>
                <dt>Status</dt>
                <dd>
                  <TagChip tag={page.side.tag} />
                </dd>
              </>
            ) : null}
            {page.side.pairs.map(([key, value]) => (
              <React.Fragment key={key}>
                <dt>{key}</dt>
                <dd title={value}>{value}</dd>
              </React.Fragment>
            ))}
          </dl>
          {page.linked.length ? (
            <>
              <h4 className="mt-2">Linked records</h4>
              {page.linked.map((record) => (
                <div key={record.title} className={`cs-link ${TONE_CLASS[record.tone]}`}>
                  <span className="lv-ic" style={{ width: 28, height: 28, borderRadius: 8 }}>
                    <ToneIcon size={15} tone={record.tone} />
                  </span>
                  <span className="x">
                    <b>{record.title}</b>
                    <span>{record.detail}</span>
                  </span>
                  <ChevronRight aria-hidden className="text-[#8A8A8A]" size={16} />
                </div>
              ))}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

const RAIL = [
  { kind: null, icon: Home },
  { kind: null, icon: Inbox },
  { kind: "person", icon: Users },
  { kind: "verification", icon: ScanFace },
  { kind: "transaction", icon: ArrowLeftRight },
  { kind: null, icon: List },
  { kind: null, icon: BarChart3 },
  { kind: "device", icon: Workflow },
] as const;

const NAV_ICON = [ListChecks, CircleCheck, AlertTriangle, Link2, FileText];

/**
 * The console view: a faithful preview of the Didit console in a modal,
 * filled with this visitor's own records. It is drawn by the demo center from
 * the data the visitor's session produced; it is never a console session.
 */
export function ConsoleView({
  open,
  onClose,
  app,
  tabs,
  tab,
  onTab,
}: {
  open: boolean;
  onClose(): void;
  app: { name: string; initial: string };
  tabs: ConsoleTab[];
  tab: string;
  onTab(id: string): void;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const current = tabs.find((item) => item.id === tab) ?? tabs[0];

  React.useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !current) return null;
  const page = current.page;

  return (
    <div
      className="cv-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-label="Console view"
        aria-modal="true"
        className="cv"
        data-testid="console-view"
        role="dialog"
      >
        <div className="cv-top">
          <DiditRing />
          <b>Console view</b>
          <span className="cv-url">
            <Lock aria-hidden size={13} />
            console.didit.me /{" "}
            <b>
              {page ? `${page.section} / ${page.record}` : current.label}
            </b>
          </span>
          <div className="cv-tabs" role="tablist">
            {tabs.map((item) => (
              <button
                key={item.id}
                aria-selected={item.id === current.id}
                className={`${TONE_CLASS[item.tone]}${item.id === current.id ? " is-on" : ""}`}
                role="tab"
                type="button"
                onClick={() => onTab(item.id)}
              >
                <i className="dot" />
                {item.label}
              </button>
            ))}
          </div>
          <button
            ref={closeRef}
            aria-label="Close the console view"
            className="cv-x"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden size={16} />
          </button>
        </div>
        <div className="cv-note">
          <Eye aria-hidden size={16} />
          <b>Preview</b>
          <span>{current.note}</span>
          <em>Demo application · Sandbox</em>
        </div>
        <div className="cv-body">
          <div className="cs-rail">
            <span className="cs-logo">
              <DiditRing />
            </span>
            {RAIL.map(({ kind, icon: Icon }, index) => (
              <span
                key={index}
                className={page && kind === page.kind ? "is-on" : undefined}
              >
                <Icon aria-hidden size={18} />
              </span>
            ))}
          </div>
          <nav className="cs-nav">
            <span className="cs-org">
              <i>{app.initial}</i>
              {app.name}
              <ChevronDown aria-hidden size={14} />
            </span>
            <span className="cs-app">
              <b>{app.name} · Web</b>
              <span>Sandbox</span>
            </span>
            <span className="cs-sec">{page?.section ?? current.label}</span>
            {(page?.nav ?? []).map((item, index) => {
              const Icon = NAV_ICON[index % NAV_ICON.length];

              return (
                <span key={item.label} className={`cs-item${index === 0 ? " is-on" : ""}`}>
                  <Icon aria-hidden size={16} />
                  {item.label}
                  {item.count !== undefined ? <em>{item.count}</em> : null}
                </span>
              );
            })}
          </nav>
          {page ? (
            <Page page={page} />
          ) : (
            <div className="cs-card">
              <p className="cs-empty m-0">{current.empty}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
