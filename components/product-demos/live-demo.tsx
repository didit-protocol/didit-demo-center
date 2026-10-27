"use client";

import type { ConsoleTab } from "@/lib/didit/console";
import type { LiveDemo as Live } from "@/lib/product-demos/define";

import * as React from "react";
import { ArrowRight, ImageUp, Loader2, SquareTerminal } from "lucide-react";

import { Code, Crumbs, Eyebrow, Glyph, Status, Steps, Tags } from "./parts";
import { VerificationPreview } from "./verification-preview";

import { ConsoleView } from "@/components/didit-live/console-view";
import { DiditRing } from "@/components/didit-live/icons";
import { LiveFeed } from "@/components/didit-live/live-feed";
import { openVerification } from "@/lib/didit/browser";
import { diditUrls } from "@/lib/didit/config";
import { useDidit } from "@/lib/didit/provider";
import { useLive } from "@/lib/didit/use-live";
import {
  type DecisionView,
  consolePage,
  decisionEvents,
  readDecision,
  sessionEvent,
} from "@/lib/product-demos/decision";

/*
 * A live product demo: the ProductDemo board before the run (the steps, the
 * verification modal it opens and the call behind it), then the
 * ProductDemoResult board (the decision, the live feed) and the
 * ProductDemoConsole board (the console view). Every value on the result
 * comes from the visitor's own session on the demo application.
 */

type Phase = "intro" | "starting" | "verifying" | "reading" | "result";

const STATUS_KIND = {
  approved: "ok",
  review: "rev",
  declined: "no",
  pending: "neu",
} as const;

const MAX_PORTRAIT = 2 * 1024 * 1024;

function clock(at: number) {
  return new Date(at).toLocaleTimeString("en-GB", { hour12: false });
}

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export function LiveDemo({ demo }: { demo: Live }) {
  const { device } = useDidit();
  const live = useLive(`product-${demo.id}`);
  const [phase, setPhase] = React.useState<Phase>("intro");
  const [error, setError] = React.useState<string | null>(null);
  const [session, setSession] = React.useState<{
    id: string;
    vendorData: string;
    view: DecisionView;
  } | null>(null);
  const [portrait, setPortrait] = React.useState<{
    data: string;
    name: string;
  } | null>(null);
  const [consoleOpen, setConsoleOpen] = React.useState(false);
  const [tab, setTab] = React.useState("person");
  const busy =
    phase === "starting" || phase === "verifying" || phase === "reading";
  const blocked = !demo.workflow || (demo.requiresPortrait && !portrait);

  /** Reads the decision, waiting a little while Didit finishes it. */
  const finish = React.useCallback(
    async (sessionId: string) => {
      setPhase("reading");
      setError(null);
      let body: Record<string, unknown> = {};

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await fetch(
          `/api/product-demos/${demo.id}/session?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );

        body = await readJson(response);
        if (!response.ok) {
          setError(String(body.error ?? "The decision could not be read."));
          setPhase("intro");

          return;
        }
        const status = String((body.decision as { status?: string }).status);

        if (!["In Progress", "Not Started"].includes(status)) break;
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
      const decision = body.decision as Record<string, unknown>;
      const view = readDecision(decision);

      for (const event of decisionEvents(demo, sessionId, view))
        live.push(event);
      setSession({
        id: sessionId,
        vendorData: String(decision.vendor_data ?? ""),
        view,
      });
      setPhase("result");
    },
    [demo, live],
  );

  // The hosted flow's redirect (a phone, or a full-page return) lands here.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("verificationSessionId");

    if (!sessionId) return;
    window.history.replaceState(null, "", window.location.pathname);
    void finish(sessionId);
    // Once, on the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (blocked || busy) return;
    setPhase("starting");
    setError(null);
    const response = await fetch(`/api/product-demos/${demo.id}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(portrait ? { portrait: portrait.data } : {}),
    });
    const body = await readJson(response);

    if (!response.ok || typeof body.url !== "string") {
      setError(String(body.error ?? "The session could not be created."));
      setPhase("intro");

      return;
    }
    const sessionId = String(body.sessionId);

    live.push(sessionEvent(demo, sessionId));
    setPhase("verifying");
    const result = await openVerification(body.url);

    if (result.type === "completed")
      return finish(result.session?.sessionId ?? sessionId);
    setPhase("intro");
    setError(
      result.type === "cancelled"
        ? "You closed the verification before it finished. Start again whenever you like."
        : "The verification stopped before it finished. Try again.",
    );
  }

  function choosePortrait(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type))
      return setError("Choose a JPEG, PNG or WebP photo.");
    if (file.size > MAX_PORTRAIT)
      return setError("The photo must be 2 MB or smaller.");
    const reader = new FileReader();

    reader.onload = () => {
      setError(null);
      setPortrait({ data: String(reader.result), name: file.name });
    };
    reader.readAsDataURL(file);
  }

  function again() {
    setSession(null);
    setConsoleOpen(false);
    setPhase("intro");
  }

  const integration = [
    "// the server creates the session for the signed-in user",
    `const { url } = await didit.sessions.create({ workflow: "${demo.id}", user })`,
    "// the browser opens the verification modal",
    "await startVerification({ url })",
  ];

  const tabs: ConsoleTab[] = React.useMemo(() => {
    if (!session) return [];
    const ours = live.events
      .filter((event) => event.id.endsWith(session.id))
      .slice()
      .reverse();
    const page = consolePage(demo, session.view, {
      vendorData: session.vendorData,
      device: device ? `${device.browser} on ${device.os}` : null,
      timeline: ours.map((event) => ({
        tone: event.tone as "ver",
        title: event.title,
        detail: event.detail,
        at: clock(event.at),
      })),
    });

    return [
      {
        id: "person",
        label: "Person",
        tone: "auth",
        note: `This is your Didit console. The ${demo.title.toLowerCase()} session you just ran is already here, with every check.`,
        page,
      },
      {
        id: "transaction",
        label: "Transaction",
        tone: "txn",
        note: "Transactions appear here when a demo sends them.",
        page: null,
        empty:
          "This demo sends no transactions. The Alder and Kestrel demos do.",
      },
      {
        id: "verification",
        label: "Verification",
        tone: "ver",
        note: `The ${demo.title.toLowerCase()} session, with every check Didit ran.`,
        page: { ...page, kind: "verification", section: "Sessions" },
      },
      {
        id: "device",
        label: "Device",
        tone: "sig",
        note: "The device and network this session ran on.",
        page: device
          ? {
              kind: "device",
              section: "Devices",
              record: device.persistentId.slice(0, 12),
              head: {
                title: `${device.browser} on ${device.os}`,
                id: device.persistentId.slice(0, 12),
                meta: [device.firstVisit ? "First seen today" : "Seen before"],
              },
              kpis: [
                { label: "Bot score", value: String(device.botScore) },
                ...(session.view.network
                  ? [
                      {
                        label: "Network",
                        value: session.view.network.label.split(" · ")[0],
                      },
                    ]
                  : []),
              ],
              blocks: [],
              side: {
                title: "Details",
                pairs: [
                  ["Browser", device.browser],
                  ["System", device.os],
                  ["Environment", "Sandbox"],
                ],
              },
              linked: [],
              nav: [{ label: "All devices" }],
            }
          : null,
        empty: "The device read-out needs signals, which this browser blocked.",
      },
    ];
  }, [demo, device, live.events, session]);

  const view = phase === "result" ? session?.view : null;

  return (
    <div
      className="pd-grid"
      data-mode="live"
      data-phase={phase}
      data-testid="product-demo"
    >
      <div className="pd-left">
        <Crumbs demo={demo} />
        <Eyebrow demo={demo} />
        <h1>{demo.title}</h1>
        <p className="pd-lede">
          {view
            ? view.status === "approved"
              ? `${demo.check} passed. This is the decision your backend receives, and the same session is already in the console.`
              : view.status === "pending"
                ? "The session is not finished yet. This is what your backend receives so far."
                : `${demo.check} ${view.statusLabel.toLowerCase()}. This is the decision your backend receives, and the same session is already in the console.`
            : demo.lede}
        </p>
        <div className="pd-meta">
          <Status kind="ok" label="Live demo" />
          {view ? null : <span>{demo.time.long}</span>}
          <span>Free in the sandbox</span>
        </div>

        {view && session ? (
          <>
            <section
              aria-label="Decision"
              className="pd-card pd-decision"
              data-testid="decision"
            >
              <header className="pd-card-h">
                <span className="pd-tile">
                  <Glyph demo={demo} size={20} />
                </span>
                <b>Decision</b>
                <Status
                  kind={STATUS_KIND[view.status]}
                  label={view.statusLabel}
                />
              </header>
              <div className="pd-decision-b">
                {view.portrait ? (
                  <img
                    alt="Your selfie from this session"
                    className="pd-portrait"
                    src={view.portrait}
                  />
                ) : null}
                <dl>
                  {view.rows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
            <div className="pd-cta">
              <button
                className="pd-btn is-pri"
                type="button"
                onClick={() => setConsoleOpen(true)}
              >
                <DiditRing className="pd-ring" />
                Open the console view
              </button>
              <button className="pd-btn is-sec" type="button" onClick={again}>
                Run it again
              </button>
            </div>
          </>
        ) : (
          <>
            <Steps steps={demo.steps} />
            <Tags demo={demo} />
            {demo.requiresPortrait ? (
              <label className="pd-portrait-pick">
                <ImageUp aria-hidden size={18} />
                <span>
                  <b>{portrait ? portrait.name : "Choose a reference photo"}</b>
                  <small>
                    A clear photo of your face, up to 2 MB. It is sent as the
                    session&apos;s portrait_image and never stored by this site.
                  </small>
                </span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  type="file"
                  onChange={(event) => choosePortrait(event.target.files?.[0])}
                />
              </label>
            ) : null}
            <div className="pd-cta">
              <button
                className="pd-btn is-pri"
                disabled={blocked || busy}
                type="button"
                onClick={start}
              >
                {busy ? (
                  <Loader2 aria-hidden className="animate-spin" size={18} />
                ) : null}
                {phase === "reading"
                  ? "Reading the decision"
                  : "Start the demo"}
                {busy ? null : <ArrowRight aria-hidden size={18} />}
              </button>
              <a className="pd-btn is-sec" href="#api-call">
                <SquareTerminal aria-hidden size={18} />
                The API call
              </a>
            </div>
            <p className="pd-note">
              {demo.workflow
                ? "Runs a real session on the Didit sandbox. Nothing is billed."
                : "This workflow is not published on this environment yet, so the demo cannot start here."}
            </p>
          </>
        )}
        {error ? (
          <p className="pd-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="pd-right">
        {view ? (
          <div className="pd-feed">
            <LiveFeed
              events={live.events}
              integration={integration}
              person="You"
              onConsole={() => setConsoleOpen(true)}
            />
          </div>
        ) : (
          <>
            <VerificationPreview
              demo={demo}
              disabled={blocked || busy}
              onStart={start}
            />
            <Code
              id="api-call"
              label="The call behind this demo"
              lines={[
                "# the call behind this demo",
                `curl -X POST ${diditUrls.api}/v3/session/ \\`,
                ' -H "x-api-key: $DIDIT_API_KEY" \\',
                ` -d '{ "workflow_id": "<${demo.id} workflow>", "vendor_data": "demo-visitor" }'`,
                "",
                "# then, in the browser",
                "await startVerification({ url })",
              ]}
            />
          </>
        )}
      </div>

      <ConsoleView
        app={{ name: "Didit demos", initial: "D" }}
        open={consoleOpen && tabs.length > 0}
        tab={tab}
        tabs={tabs}
        onClose={() => setConsoleOpen(false)}
        onTab={setTab}
      />
    </div>
  );
}
