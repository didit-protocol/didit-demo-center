import type { Tone } from "@/lib/didit/live";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Fingerprint } from "lucide-react";

import { DiditRing, TONE_CLASS, ToneIcon } from "@/components/didit-live/icons";
import { TONE_LABEL } from "@/lib/didit/live";
import { DEMOS } from "@/lib/didit/demos";
import { siteConfig } from "@/config/site";

/*
 * The Demo Center's front page (the Main board), on design system v4: the
 * light hero, the four industry demos on their halftone plates, how the Didit
 * layer shows itself over them and the install band. The pictures are
 * screenshots of the demos; nothing here is a visitor's data, which only ever
 * appears inside a demo. The product demos section has its own owner and sits
 * between the industry demos and how it works.
 */

const SHOT: Record<string, string> = {
  "aurora-play": "shot-aurora-home",
  alder: "shot-alder-home",
  northmarket: "shot-northmarket-home",
  kestrel: "shot-kestrel-home",
};

const PRODUCTS = [
  { tone: "auth", label: "Authentication" },
  { tone: "sig", label: "Signals" },
  { tone: "ver", label: "Verification" },
  { tone: "txn", label: "Transactions" },
] as const;

const STATS = [
  ["4", "industry demos"],
  ["18", "product demos"],
  ["220+", "countries"],
  ["0 EUR", "no real money moves"],
] as const;

const host = siteConfig.url.replace(/^https:\/\//, "");

interface FeedEvent {
  tone: Tone;
  title: string;
  detail: string;
  at: string;
}

/** A still of the Didit live feed, as the demos show it. */
function FeedStill({
  events,
  person,
  foot = false,
}: {
  events: FeedEvent[];
  person: string;
  foot?: boolean;
}) {
  return (
    <div aria-hidden className="lv dd hub-feed">
      <div className="lv-head">
        <DiditRing />
        <b>Didit live</b>
        <span className="dd-status dd-status-approved dd-status-sm">Live</span>
        <span className="lv-who">{person}</span>
      </div>
      <div className="lv-list">
        {events.map((event, index) => (
          <div
            key={event.title}
            className={`lv-ev ${TONE_CLASS[event.tone]}${index === 0 ? " is-new" : ""}`}
          >
            <span className="lv-ic dd-tile dd-tile-32">
              <ToneIcon tone={event.tone} />
            </span>
            <span className="lv-x">
              <small>{TONE_LABEL[event.tone]}</small>
              <b>{event.title}</b>
              <span>{event.detail}</span>
            </span>
            <span className="lv-t">{event.at}</span>
          </div>
        ))}
      </div>
      {foot ? (
        <div className="lv-foot">
          <span className="dd-btn dd-btn-primary dd-btn-sm">
            Open the console view
          </span>
          <span className="dd-btn dd-btn-secondary dd-btn-sm">Code</span>
        </div>
      ) : null}
    </div>
  );
}

/** A screenshot in a browser frame (the DS v4 window). */
function Window({ shot, className }: { shot: string; className?: string }) {
  return (
    <div aria-hidden className={`dd-window hub-window ${className ?? ""}`}>
      <div className="dd-window-bar">
        <i />
        <i />
        <i />
      </div>
      <img alt="" src={`/demos/shots/${shot}.webp`} />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="dd-eb dd-eb-section">{children}</p>;
}

export function Hub() {
  return (
    <div className="hub dd" data-testid="hub">
      <header className="hub-nav">
        <div className="hub-in hub-nav-in">
          <Link aria-label="Didit Demo Center" className="hub-brand" href="/">
            <img
              alt="Didit"
              className="hub-logo"
              src="/brand/didit-lockup-colour.png"
            />
            <span aria-hidden className="hub-sep" />
            <b>Demo Center</b>
          </Link>
          <nav aria-label="Demo Center" className="hub-links">
            <a aria-current="page" href="#demos">
              Industry demos
            </a>
            <Link href="/modules">Product demos</Link>
            <a href="#integrate">Build your flow</a>
          </nav>
          <span className="hub-nav-r">
            <a
              className="hub-docs"
              href={siteConfig.links.docs}
              rel="noreferrer"
              target="_blank"
            >
              Docs <ArrowUpRight aria-hidden size={14} />
            </a>
            <a
              className="dd-btn dd-btn-secondary dd-btn-md"
              href={siteConfig.links.console}
            >
              Sign in
            </a>
            <a
              className="dd-btn dd-btn-primary dd-btn-md"
              href={siteConfig.links.console}
            >
              Start free
            </a>
          </span>
        </div>
      </header>

      <section className="hub-hero dd-wash">
        <div className="hub-in hub-hero-in">
          <div className="hub-hero-x">
            <p className="dd-eb dd-eb-section">
              Demo Center <span className="dd-eb-slash">·</span> Sandbox
            </p>
            <h1 className="dd-h1">
              Try every Didit product, <em>live.</em>
            </h1>
            <p className="dd-lede">
              Four complete products and eighteen product demos, all on the
              Didit sandbox. Sign up, verify, move money, stop an attack, and
              see what your team sees in the console.
            </p>
            <span className="hub-cta">
              <a className="dd-btn dd-btn-primary dd-btn-lg" href="#demos">
                Open an industry demo <ArrowRight aria-hidden size={18} />
              </a>
              <Link
                className="dd-btn dd-btn-secondary dd-btn-lg"
                href="/modules"
              >
                Browse product demos
              </Link>
            </span>
            <dl className="hub-stats">
              {STATS.map(([value, label]) => (
                <div key={label}>
                  <dt>{value}</dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div aria-hidden className="hub-collage">
            <Window className="w1" shot="shot-kestrel-home" />
            <Window className="w2" shot="shot-aurora-home" />
            <FeedStill
              foot
              events={[
                {
                  tone: "hold",
                  title: "Deposit held for an ID check",
                  detail: "1,500 EUR · 30-day total 2,150 EUR",
                  at: "now",
                },
                {
                  tone: "ver",
                  title: "Age check approved",
                  detail: "Estimated 25 or older",
                  at: "2 min",
                },
                {
                  tone: "auth",
                  title: "Signed in with the passkey",
                  detail: "No password",
                  at: "4 min",
                },
              ]}
              person="Sofia Marin"
            />
          </div>
        </div>
      </section>

      <section className="hub-sec" id="demos">
        <div className="hub-in">
          <Eyebrow>Industry demos</Eyebrow>
          <h2 className="dd-h2">A real product, start to finish.</h2>
          <p className="dd-lede hub-lead">
            Each demo is a complete product with its own brand: sign up, verify,
            transact, stop an attack, then open the console view.
          </p>
          <ul className="hub-demos">
            {DEMOS.map((demo) => (
              <li key={demo.id} className="hub-demo">
                <Link
                  aria-hidden
                  className="dd-halftone hub-plate"
                  href={demo.route}
                  style={{
                    backgroundImage: `url(/demos/halftone/${demo.id}.webp)`,
                  }}
                  tabIndex={-1}
                >
                  <Window shot={SHOT[demo.id]} />
                </Link>
                <div className="hub-demo-x">
                  <div className="hub-demo-h">
                    <span
                      className="hub-mark"
                      style={{ background: demo.brand.mark }}
                    >
                      {demo.brand.initial}
                    </span>
                    <span>
                      <h3>{demo.brand.name}</h3>
                      <small>
                        {demo.industry} · {demo.copy.tagline}
                      </small>
                    </span>
                  </div>
                  <p>{demo.copy.story}</p>
                  <span className="hub-tags">
                    {PRODUCTS.map((product) => (
                      <span
                        key={product.tone}
                        className={`dd-tag dd-tag-cat ${TONE_CLASS[product.tone]}`}
                      >
                        {product.label}
                      </span>
                    ))}
                  </span>
                  <span className="hub-open">
                    <Link
                      className="dd-btn dd-btn-secondary dd-btn-md"
                      href={demo.route}
                    >
                      Open the demo <ArrowRight aria-hidden size={16} />
                    </Link>
                    <span>
                      {host}
                      {demo.route}
                    </span>
                    <em>5 steps</em>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hub-sec" id="how">
        <div className="hub-in">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="dd-h2">
            See what Didit sees, without leaving the app.
          </h2>
          <div className="hub-layer">
            <article className="hub-tile">
              <div aria-hidden className="hub-tile-art is-feed">
                <FeedStill
                  events={[
                    {
                      tone: "txn",
                      title: "Deposit approved",
                      detail: "500 EUR · risk 4 of 100",
                      at: "now",
                    },
                    {
                      tone: "ver",
                      title: "Age check approved",
                      detail: "25 or older",
                      at: "2 min",
                    },
                    {
                      tone: "auth",
                      title: "Signed in with the passkey",
                      detail: "No password",
                      at: "4 min",
                    },
                  ]}
                  person="Sofia Marin"
                />
              </div>
              <h3>Didit live</h3>
              <p>
                Every event as it happens: the passkey, the device, each check,
                every payment and the rule that fired, with the call behind it.
              </p>
            </article>
            <article className="hub-tile">
              <div aria-hidden className="hub-tile-art is-pin">
                <img alt="" src="/demos/shots/shot-aurora-home.webp" />
                <span className="co p-sig">
                  <span className="co-dot" />
                  <span className="co-line" style={{ width: 48 }} />
                  <span className="co-card">
                    <span className="co-ic">
                      <Fingerprint aria-hidden size={16} />
                    </span>
                    <span>
                      <small>Signals</small>
                      <b>Same device as Sofia M.</b>
                    </span>
                  </span>
                </span>
              </div>
              <h3>Pinned to the moment</h3>
              <p>
                A callout marks the place in the app where Didit acted: the
                passkey button, the held deposit, the declined bonus.
              </p>
            </article>
            <article className="hub-tile">
              <div aria-hidden className="hub-tile-art is-console">
                <div className="dd-window hub-mini">
                  <div className="dd-window-bar">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="hub-mini-top">
                    <DiditRing />
                    <b>Console view</b>
                    <span>console.didit.me / Transactions</span>
                  </div>
                  <div className="hub-mini-note" />
                  <div className="hub-mini-body">
                    <span className="n">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="c">
                      <i className="h" />
                      <i className="k" />
                      <i className="k" />
                      <i className="k" />
                      <i className="k" />
                      <i className="b" />
                      <i className="b" />
                    </span>
                  </div>
                </div>
              </div>
              <h3>The console view</h3>
              <p>
                One tap opens a preview of the Didit console with this
                visitor&apos;s data: the person, the transaction, the business.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="hub-sec hub-sec-last" id="integrate">
        <div className="hub-in">
          <div className="hub-band">
            <div className="hub-band-x">
              <Eyebrow>Build your own</Eyebrow>
              <h2 className="dd-h2">
                Compose any flow, then ship it with three packages.
              </h2>
              <p className="dd-lede">
                Start from any demo&apos;s workflow in the console, change the
                steps without code, and add the same packages these demos use.
              </p>
              <span className="hub-cta">
                <a
                  className="dd-btn dd-btn-primary dd-btn-lg"
                  href={siteConfig.links.console}
                >
                  Start free
                </a>
                <a
                  className="dd-btn dd-btn-secondary dd-btn-lg"
                  href={siteConfig.links.docs}
                  rel="noreferrer"
                  target="_blank"
                >
                  Read the docs
                </a>
              </span>
            </div>
            <pre aria-label="Install the three packages" className="hub-code">
              <span className="c"># what every demo here runs on</span>
              {"\n"}npm install{" "}
              <span className="s">
                @didit-protocol/auth-nextjs @didit-protocol/signals
                @didit-protocol/sdk-web
              </span>
              {"\n\n"}
              <span className="k">import</span> {"{ DiditAuth }"}{" "}
              <span className="k">from</span>{" "}
              <span className="s">&quot;@didit-protocol/auth-nextjs&quot;</span>
              {"\n"}
              <span className="k">import</span> {"{ configureEvents }"}{" "}
              <span className="k">from</span>{" "}
              <span className="s">&quot;@didit-protocol/signals&quot;</span>
              {"\n"}
              <span className="k">import</span> {"{ startVerification }"}{" "}
              <span className="k">from</span>{" "}
              <span className="s">&quot;@didit-protocol/sdk-web&quot;</span>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
