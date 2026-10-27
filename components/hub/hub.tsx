import Link from "next/link";
import { ArrowRight, ArrowUpRight, Fingerprint, SquareTerminal } from "lucide-react";

import { DiditRing, ToneIcon } from "@/components/didit-live/icons";
import { STEPS } from "@/lib/didit/config";
import { DEMOS } from "@/lib/didit/demos";
import { siteConfig } from "@/config/site";

/*
 * The Demo Center's front page (the Main board): what the four demos are, how
 * the Didit layer shows itself over them and the five steps every demo
 * walks. The pictures are screenshots of the demos; nothing here is a
 * visitor's data, which only ever appears inside a demo.
 */

const SHOT: Record<string, { file: string; bg: string }> = {
  "aurora-play": { file: "shot-aurora-home", bg: "#1A1236" },
  alder: { file: "shot-alder-home", bg: "#13493A" },
  northmarket: { file: "shot-northmarket-home", bg: "#F3E3D3" },
  kestrel: { file: "shot-kestrel-home", bg: "#0B1D1E" },
};

const PRODUCTS = [
  { tone: "auth", label: "Authentication" },
  { tone: "sig", label: "Signals" },
  { tone: "ver", label: "Verification" },
  { tone: "txn", label: "Transactions" },
] as const;

const STEP_COPY: Record<string, string> = {
  signup: "Didit Authentication on the customer's own page: a passkey, bot protection, no password.",
  verify: "The redesigned verification flow in the web SDK modal, branded as the customer.",
  transact: "Deposits, transfers, orders and withdrawals scored as they happen.",
  fraud: "One real attack per demo, caught by device signals and rules.",
  console: "The same story in the Didit console your team would use.",
};

const host = siteConfig.url.replace(/^https:\/\//, "");

function Lockup({ className }: { className?: string }) {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img alt="Didit" className={className} src="/brand/didit-lockup-white.png" />;
}

function Chip({ tone, label }: { tone: (typeof PRODUCTS)[number]["tone"]; label: string }) {
  return (
    <span className={`hub-chip p-${tone}`}>
      <i />
      {label}
    </span>
  );
}

function HeroCard({
  tone,
  label,
  title,
  className,
}: {
  tone: "auth" | "ver" | "stop" | "hold";
  label: string;
  title: string;
  className: string;
}) {
  return (
    <span aria-hidden className={`hub-float co-card p-${tone} ${className}`}>
      <span className="co-ic">
        <ToneIcon tone={tone} />
      </span>
      <span>
        <small>{label}</small>
        <b>{title}</b>
      </span>
    </span>
  );
}

export function Hub() {
  return (
    <div className="hub" data-testid="hub">
      <section className="hub-dark">
        <header className="hub-nav">
          <Link aria-label="Didit Demo Center" className="hub-brand" href="/">
            <Lockup className="hub-logo" />
            <span aria-hidden className="hub-sep" />
            <b>Demo Center</b>
          </Link>
          <nav aria-label="Demo Center" className="hub-links">
            <a href="#demos">Demos</a>
            <a href="#how">How it works</a>
            <a href="#integrate">Integrate</a>
            <Link href="/modules">Modules</Link>
          </nav>
          <span className="hub-nav-r">
            <a href={siteConfig.links.docs} rel="noreferrer" target="_blank">
              Docs <ArrowUpRight aria-hidden size={14} />
            </a>
            <a className="hub-btn is-blue" href={siteConfig.links.console}>
              Start free
            </a>
          </span>
        </header>
        <div className="hub-hero">
          <div className="hub-hero-x">
            <span className="hub-sandbox">Sandbox · no real money, no real people</span>
            <h1>
              Four real products.
              <br />
              <em>Didit inside each one.</em>
            </h1>
            <p>
              Sign up, verify, move money and watch an attack get stopped, in a
              casino, a bank, a marketplace and a crypto exchange. The Didit live
              layer shows every check as it happens, and the console view shows
              what your team sees.
            </p>
            <span className="hub-cta">
              <Link className="hub-btn is-white" href="/igaming">
                Start with Aurora Play <ArrowRight aria-hidden size={16} />
              </Link>
              <a className="hub-btn is-dark" href="#how">
                How it works
              </a>
            </span>
          </div>
          <div aria-hidden className="hub-collage">
            <img alt="" className="hub-shot s1" src="/demos/shots/shot-kestrel-home.webp" />
            <img alt="" className="hub-shot s2" src="/demos/shots/shot-alder-home.webp" />
            <img alt="" className="hub-shot s3" src="/demos/shots/shot-aurora-home.webp" />
            <HeroCard className="f1" label="Verification" title="Age 25+ approved" tone="ver" />
            <HeroCard className="f2" label="Authentication" title="Passkey created" tone="auth" />
            <HeroCard className="f3" label="Blocked" title="Sanctioned wallet declined" tone="stop" />
            <HeroCard className="f4" label="Transactions" title="Deposit held: ID check" tone="hold" />
          </div>
        </div>
      </section>

      <section className="hub-sec" id="demos">
        <h2>Pick an industry</h2>
        <p className="hub-lead">
          Each demo is a complete product with its own brand. Every step runs on
          the Didit sandbox, live.
        </p>
        <ul className="hub-demos">
          {DEMOS.map((demo) => (
            <li key={demo.id} className="hub-demo">
              <Link
                aria-hidden
                className="hub-demo-art"
                href={demo.route}
                style={{ background: SHOT[demo.id].bg }}
                tabIndex={-1}
              >
                <img alt="" src={`/demos/shots/${SHOT[demo.id].file}.webp`} />
              </Link>
              <div className="hub-demo-x">
                <div className="hub-demo-h">
                  <span className="hub-mark" style={{ background: demo.brand.mark }}>
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
                <span className="hub-chips">
                  {PRODUCTS.map((product) => (
                    <Chip key={product.tone} {...product} />
                  ))}
                </span>
                <span className="hub-open">
                  <Link className="hub-btn is-line" href={demo.route}>
                    Open the demo <ArrowRight aria-hidden size={16} />
                  </Link>
                  <span>
                    {host}
                    {demo.route}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="hub-sec" id="how">
        <h2>See what Didit sees, without leaving the app</h2>
        <p className="hub-lead">
          The Didit layer floats over each product. It never gets in the way of
          the demo, and it shows exactly what you would build.
        </p>
        <div className="hub-layer">
          <article className="hub-tile">
            <div aria-hidden className="hub-tile-art is-feed">
              <div className="lv">
                <div className="lv-in">
                  <div className="lv-head">
                    <DiditRing />
                    <b>Didit live</b>
                    <span className="lv-live">Live</span>
                  </div>
                  <div className="lv-list">
                    {[
                      ["txn", "Deposit approved", "Scored as it happens"],
                      ["ver", "Age check approved", "Selfie age estimate"],
                      ["auth", "Signed in with the passkey", "No password"],
                    ].map(([tone, title, detail], index) => (
                      <div key={title} className={`lv-ev p-${tone}${index === 0 ? " is-new" : ""}`}>
                        <span className="lv-ic">
                          <ToneIcon tone={tone as "txn"} />
                        </span>
                        <span className="lv-x">
                          <b>{title}</b>
                          <span>{detail}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <h3>Didit live</h3>
            <p>
              Every event, the moment it happens: the passkey, the device, each
              check, every payment and every rule that fired, in the colour of
              its product. Tap Code to see the one call behind it.
            </p>
          </article>
          <article className="hub-tile">
            <div aria-hidden className="hub-tile-art is-pin">
              <img alt="" src="/demos/shots/shot-aurora-home.webp" />
              <span className="co p-sig">
                <span className="co-dot" />
                <span className="co-line" style={{ width: 40 }} />
                <span className="co-card">
                  <span className="co-ic">
                    <Fingerprint size={16} />
                  </span>
                  <span>
                    <small>Signals</small>
                    <b>Same device, second account</b>
                  </span>
                </span>
              </span>
            </div>
            <h3>Pinned to the moment</h3>
            <p>
              A callout marks the exact place in the app where Didit acted: the
              passkey button, the held deposit, the declined bonus.
            </p>
          </article>
          <article className="hub-tile">
            <div aria-hidden className="hub-tile-art is-console">
              <div className="hub-mini">
                <div className="hub-mini-top">
                  <DiditRing />
                  <b>Console view</b>
                  <i />
                </div>
                <div className="hub-mini-note" />
                <div className="hub-mini-body">
                  <span className="r" />
                  <span className="n" />
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
              One tap opens a preview of the real Didit console with this
              visitor&apos;s data: the person, the transaction, the business, and
              why each decision was made.
            </p>
          </article>
        </div>
      </section>

      <section className="hub-sec">
        <h2>The same five steps in every demo</h2>
        <ol className="hub-steps">
          {STEPS.map((step, index) => (
            <li key={step.id}>
              <span className="hub-n">{index + 1}</span>
              <b>{step.label}</b>
              <p>{STEP_COPY[step.id]}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="hub-sec" id="integrate">
        <div className="hub-band">
          <div>
            <Lockup className="hub-band-logo" />
            <h2>Build this into your product.</h2>
            <p>
              Three packages, one publishable key. Every demo here uses exactly
              what you would ship.
            </p>
            <span className="hub-cta">
              <a className="hub-btn is-blue" href={siteConfig.links.console}>
                Start free
              </a>
              <a className="hub-btn is-dark" href={siteConfig.links.docs} rel="noreferrer" target="_blank">
                Read the docs
              </a>
            </span>
          </div>
          <pre aria-label="Install the three packages" className="hub-code">
            <span className="c"># the same three packages every demo uses</span>
            {"\n"}npm install <span className="s">@didit-protocol/auth-nextjs @didit-protocol/signals @didit-protocol/sdk-web</span>
            {"\n\n"}
            <span className="k">import</span> {"{ DiditAuth }"} <span className="k">from</span>{" "}
            <span className="s">&quot;@didit-protocol/auth-nextjs&quot;</span>
            {"\n"}
            <span className="k">import</span> {"{ configureEvents }"} <span className="k">from</span>{" "}
            <span className="s">&quot;@didit-protocol/signals&quot;</span>
            {"\n"}
            <span className="k">import</span> {"{ startVerification }"} <span className="k">from</span>{" "}
            <span className="s">&quot;@didit-protocol/sdk-web&quot;</span>
            <SquareTerminal aria-hidden className="hub-code-ic" size={16} />
          </pre>
        </div>
      </section>
    </div>
  );
}
