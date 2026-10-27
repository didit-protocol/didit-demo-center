import type {
  RuleState,
  SampleDemo as Sample,
  Verdict,
} from "@/lib/product-demos/define";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  CircleSlash,
  SquareTerminal,
} from "lucide-react";

import { Code, Crumbs, Eyebrow, Status, Steps, Tags } from "./parts";

import { diditUrls } from "@/lib/didit/config";
import { docs } from "@/lib/docs";

/*
 * The ProductDemoSample board: a fixture decision with the rules behind it,
 * the request and the response, and the industry demo that runs it live.
 * Nothing is sent from this page.
 */

const VERDICT: Record<Verdict, { kind: "ok" | "rev" | "no"; label: string }> = {
  approved: { kind: "ok", label: "Approved" },
  review: { kind: "rev", label: "In review" },
  declined: { kind: "no", label: "Declined" },
};

const RULE: Record<RuleState, { kind: "ok" | "rev" | "no"; label: string }> = {
  passed: { kind: "ok", label: "Passed" },
  hit: { kind: "rev", label: "Hit" },
  declined: { kind: "no", label: "Declined" },
};

function RuleIcon({ state }: { state: RuleState }) {
  if (state === "passed")
    return <CircleCheck aria-hidden className="pd-ri is-ok" size={20} />;
  if (state === "declined")
    return <CircleSlash aria-hidden className="pd-ri is-no" size={20} />;

  return <AlertTriangle aria-hidden className="pd-ri is-rev" size={20} />;
}

export function SampleDemo({ demo }: { demo: Sample }) {
  const { fixture } = demo;
  const verdict = VERDICT[fixture.verdict];
  const request = [
    "# the request",
    `${fixture.request.method} ${diditUrls.api}${fixture.request.path}`,
    ...(fixture.request.body ? [fixture.request.body] : []),
    "",
    "# the response",
    fixture.response,
  ];

  return (
    <div className="pd-grid" data-mode="sample" data-testid="product-demo">
      <div className="pd-left">
        <Crumbs demo={demo} />
        <Eyebrow demo={demo} />
        <h1>{demo.title}</h1>
        <p className="pd-lede">{demo.lede}</p>
        <div className="pd-meta">
          <Status kind="line" label="Sample decision" />
          <span>Free in the sandbox</span>
        </div>
        <Steps steps={demo.steps} />
        <Tags demo={demo} />
        <div className="pd-cta">
          {demo.industry ? (
            <Link className="pd-btn is-pri" href={demo.industry.route}>
              Open the {demo.industry.name} demo
              <ArrowRight aria-hidden size={18} />
            </Link>
          ) : null}
          <a
            className={`pd-btn ${demo.industry ? "is-sec" : "is-pri"}`}
            href={docs(demo.docsPath)}
            rel="noreferrer"
            target="_blank"
          >
            <SquareTerminal aria-hidden size={18} />
            The API reference
          </a>
        </div>
      </div>
      <div className="pd-right">
        <section aria-label="Sample decision" className="pd-card pd-sample">
          <header className="pd-card-h">
            <b>Sample decision</b>
            <span>{fixture.ref} · a fixture, nothing sent</span>
          </header>
          <div className="pd-sample-head">
            <strong>{fixture.headline}</strong>
            <Status kind={verdict.kind} label={verdict.label} />
            {fixture.score ? (
              <span className={`pd-score is-${verdict.kind}`}>
                {fixture.score.label} <b>{fixture.score.value}</b>
              </span>
            ) : null}
          </div>
          <ul className="pd-rules">
            {fixture.rules.map((rule) => (
              <li key={rule.title}>
                <RuleIcon state={rule.state} />
                <span>
                  <b>{rule.title}</b>
                  <span> · {rule.detail}</span>
                </span>
                <Status
                  kind={RULE[rule.state].kind}
                  label={RULE[rule.state].label}
                />
              </li>
            ))}
          </ul>
        </section>
        <Code label="The request and the response" lines={request} />
      </div>
    </div>
  );
}
