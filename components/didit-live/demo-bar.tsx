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
 * The Demo Center bar above every demo, on design system v4: the colour
 * Didit lockup, the demo switcher, the five steps as a segmented control (the
 * current one raised, the finished ones ticked), the Sandbox status, the
 * "Console view" button and restart.
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
  const [stepsMenu, setStepsMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const stepsRef = React.useRef<HTMLDivElement>(null);
  const index = STEPS.findIndex((item) => item.id === step);

  React.useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };

    document.addEventListener("mousedown", close);

    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  React.useEffect(() => {
    if (!stepsMenu) return;
    const close = (event: MouseEvent) => {
      if (!stepsRef.current?.contains(event.target as Node))
        setStepsMenu(false);
    };

    document.addEventListener("mousedown", close);

    return () => document.removeEventListener("mousedown", close);
  }, [stepsMenu]);

  return (
    <header className="dx-bar dd">
      <Link aria-label="Didit Demo Center" href="/">
        <img
          alt="Didit"
          className="dx-logo"
          src="/brand/didit-lockup-colour.png"
        />
      </Link>
      <span aria-hidden className="dx-sep" />
      <Link className="dx-center" href="/">
        Demo Center
      </Link>
      <div ref={menuRef} className="dx-switch">
        <button
          aria-expanded={menu}
          aria-haspopup="menu"
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
        <span className="dx-track">
          {STEPS.map((item, index) => {
            const on = item.id === step;
            const finished = !on && done.has(item.id);

            return (
              <button
                key={item.id}
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
            );
          })}
        </span>
      </nav>
      {/* A phone has room for the current step only; it opens the other four. */}
      <div ref={stepsRef} className="dx-steps-phone">
        <button
          aria-expanded={stepsMenu}
          aria-haspopup="menu"
          aria-label={`Step ${index + 1} of 5: ${STEPS[index].label}. Show the steps`}
          className="dx-step is-on"
          type="button"
          onClick={() => setStepsMenu((open) => !open)}
        >
          <span className="n">{index + 1}</span>
          {STEPS[index].label}
        </button>
        {stepsMenu ? (
          <div aria-label="Demo steps" className="dx-menu" role="menu">
            {STEPS.map((item, number) => (
              <button
                key={item.id}
                role="menuitem"
                type="button"
                onClick={() => {
                  setStepsMenu(false);
                  onStep(item.id);
                }}
              >
                <span
                  className={`n${item.id === step ? " is-on" : done.has(item.id) ? " is-done" : ""}`}
                >
                  {item.id !== step && done.has(item.id) ? (
                    <Check aria-hidden size={12} />
                  ) : (
                    number + 1
                  )}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="dx-r">
        <span className="dd-status dd-status-warning">Sandbox</span>
        <button
          className="dd-btn dd-btn-secondary dd-btn-sm"
          type="button"
          onClick={onConsole}
        >
          <DiditRing />
          Console view
        </button>
        <button
          aria-label="Restart the demo"
          className="dd-btn dd-btn-ghost dd-btn-sm dd-btn-icon"
          title="Restart the demo"
          type="button"
          onClick={onRestart}
        >
          <RotateCw aria-hidden size={16} />
        </button>
      </div>
    </header>
  );
}
