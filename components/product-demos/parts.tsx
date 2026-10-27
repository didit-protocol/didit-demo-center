import type { DemoStep, ProductDemo } from "@/lib/product-demos/define";

import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

import { siteConfig } from "@/config/site";
import { familyLabel } from "@/lib/product-demos/define";

/*
 * The pieces every product demo page shares, live or sample: the top bar,
 * the breadcrumb, the eyebrow, the three steps, the product tags and the dark
 * code panel. No state, so the sample pages render on the server.
 */

/** A module glyph in the demo's DS v4 category colour. */
export function Glyph({
  demo,
  size = 22,
}: {
  demo: Pick<ProductDemo, "icon" | "glyph">;
  size?: number;
}) {
  return (
    <i
      aria-hidden
      className={`pd-glyph g-${demo.glyph}`}
      style={{
        width: size,
        height: size,
        maskImage: `url(/icons/modules/${demo.icon}.svg)`,
        WebkitMaskImage: `url(/icons/modules/${demo.icon}.svg)`,
      }}
    />
  );
}

export function TopBar() {
  return (
    <header className="pd-top">
      <div className="pd-top-in">
        <Link aria-label="Didit Demo Center" className="pd-brand" href="/">
          <img
            alt="Didit"
            className="pd-logo"
            src="/logos/primary-horizontal-light.svg"
          />
          <span aria-hidden className="pd-sep" />
          <b>Demo Center</b>
        </Link>
        <nav aria-label="Demo Center" className="pd-links">
          <Link href="/#demos">Industry demos</Link>
          <Link aria-current="page" href="/#product-demos">
            Product demos
          </Link>
          <Link href="/#how">Build your flow</Link>
        </nav>
        <span className="pd-top-r">
          <a
            className="pd-docs"
            href={siteConfig.links.docs}
            rel="noreferrer"
            target="_blank"
          >
            Docs <ArrowUpRight aria-hidden size={15} />
          </a>
          <a className="pd-btn is-sec is-sm" href={siteConfig.links.console}>
            Sign in
          </a>
          <a className="pd-btn is-pri is-sm" href={siteConfig.links.console}>
            Start free
          </a>
        </span>
      </div>
    </header>
  );
}

export function Crumbs({ demo }: { demo: ProductDemo }) {
  return (
    <nav aria-label="Breadcrumb" className="pd-crumbs">
      <Link href="/#product-demos">Product demos</Link>
      <ChevronRight aria-hidden size={14} />
      <Link href={`/?family=${demo.family}#product-demos`}>
        {familyLabel(demo.family).split(" ")[0]}
      </Link>
      <ChevronRight aria-hidden size={14} />
      <b aria-current="page">{demo.title}</b>
    </nav>
  );
}

export function Eyebrow({ demo }: { demo: ProductDemo }) {
  return (
    <p className={`pd-eyebrow g-${demo.glyph}`}>
      <i aria-hidden />
      {familyLabel(demo.family).split(" ")[0]} · {demo.area}
    </p>
  );
}

export function Steps({ steps }: { steps: DemoStep[] }) {
  return (
    <ol className="pd-steps">
      {steps.map((step, index) => (
        <li key={step.title}>
          <span className="pd-n">{index + 1}</span>
          <span>
            <b>{step.title}</b>
            <span>{step.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Tags({ demo }: { demo: ProductDemo }) {
  return (
    <ul aria-label="Products" className="pd-tags">
      {demo.tags.map((tag) => (
        <li key={tag} className={`g-${demo.glyph}`}>
          <i aria-hidden />
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function Status({
  kind,
  label,
}: {
  kind: "ok" | "rev" | "no" | "neu" | "line";
  label: string;
}) {
  return <span className={`pd-status is-${kind}`}>{label}</span>;
}

/** The dark code panel: comment lines start with `#`. */
export function Code({
  id,
  label,
  lines,
}: {
  id?: string;
  label: string;
  lines: string[];
}) {
  return (
    <pre aria-label={label} className="pd-code" id={id}>
      {lines.map((line, index) => (
        <span
          key={`${index}-${line}`}
          className={
            line.startsWith("#") ? "c" : line.startsWith("await ") ? "k" : ""
          }
        >
          {line.startsWith("await ") ? (
            <>
              <em>await</em>
              {line.slice(5)}
            </>
          ) : (
            line
          )}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}
