"use client";

import type { DemoBrand, StepId } from "@/lib/didit/config";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, RotateCw } from "lucide-react";

import { DiditRing } from "./icons";

import { STEPS } from "@/lib/didit/config";
import { DEMOS } from "@/lib/didit/demos";

export interface DemoBarProps {
  demo: { id: string; industry: string; brand: DemoBrand };
  step: StepId;
  done: ReadonlySet<StepId>;
  onStep(step: StepId): void;
  onConsole(): void;
  onRestart(): void;
}

/**
 * The Demo Center bar above every demo: the Didit lockup, the demo switcher,
 * the five steps (the current one white, the finished ones ticked),
 * "Sandbox", "Console view" and restart.
 */
export function DemoBar({
  demo,
  step,
  done,
  onStep,
  onConsole,
  onRestart,
}: DemoBarProps) {
  const [menu, setMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };

    document.addEventListener("mousedown", close);

    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <header className="dx-bar">
      <Link aria-label="Didit Demo Center" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="Didit" className="dx-logo" src="/brand/didit-lockup-white.png" />
      </Link>
      <span aria-hidden className="dx-sep" />
      <Link className="dx-center" href="/">
        Demo Center
      </Link>
      <div ref={menuRef} className="dx-switch">
        <button
          aria-expanded={menu}
          aria-haspopup="menu"
          className="inline-flex items-center gap-2"
          type="button"
          onClick={() => setMenu((open) => !open)}
        >
          <span className="dx-bm" style={{ background: demo.brand.mark }}>
            {demo.brand.initial}
          </span>
          {demo.brand.name} <em>{demo.industry}</em>
          <ChevronDown aria-hidden size={14} />
        </button>
        {menu ? (
          <nav aria-label="Demos" className="dx-menu">
            {DEMOS.map((item) => (
              <Link
                key={item.id}
                aria-current={item.id === demo.id ? "page" : undefined}
                href={item.route}
                onClick={() => setMenu(false)}
              >
                <span className="dx-bm" style={{ background: item.brand.mark }}>
                  {item.brand.initial}
                </span>
                {item.brand.name}
                <em>{item.industry}</em>
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
      <nav aria-label="Demo steps" className="dx-steps">
        {STEPS.map((item, index) => {
          const on = item.id === step;
          const finished = !on && done.has(item.id);

          return (
            <React.Fragment key={item.id}>
              {index > 0 ? <span aria-hidden className="dx-step-line" /> : null}
              <button
                aria-current={on ? "step" : undefined}
                className={`dx-step${on ? " is-on" : ""}${finished ? " is-done" : ""}`}
                type="button"
                onClick={() => onStep(item.id)}
              >
                <span className="n">
                  {finished ? (
                    <Check aria-hidden size={11} strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="l">{item.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>
      <div className="dx-r">
        <span className="dx-sandbox">Sandbox</span>
        <button className="dx-btn is-pri" type="button" onClick={onConsole}>
          <DiditRing />
          Console view
        </button>
        <button
          aria-label="Restart the demo"
          className="dx-iconbtn"
          title="Restart the demo"
          type="button"
          onClick={onRestart}
        >
          <RotateCw aria-hidden size={15} />
        </button>
      </div>
    </header>
  );
}
