"use client";

import type { StepId } from "@/lib/didit/config";
import type { LiveEvent } from "@/lib/didit/live";

import * as React from "react";

import { type CalloutSpec, Callouts } from "./callouts";
import { type ConsoleTab, ConsoleView } from "./console-view";
import { DemoBar, type DemoBarProps } from "./demo-bar";
import { LiveFeed, type ProductTile } from "./live-feed";

/**
 * One industry demo inside the Demo Center: the dark bar, the customer app
 * filling the rest of the screen, the Didit live layer floating over it, the
 * callouts pinned to the app and the console view.
 */
export function DemoShell({
  demo,
  app,
  step,
  done,
  onStep,
  onRestart,
  person,
  events,
  tiles,
  integration,
  callouts,
  consoleTabs,
  consoleOpen,
  consoleTab,
  onConsole,
  quiet,
  children,
}: {
  demo: DemoBarProps["demo"];
  /** `data-app` of the customer app's stylesheet. */
  app: string;
  step: StepId;
  done: ReadonlySet<StepId>;
  onStep(step: StepId): void;
  onRestart(): void;
  person: string | null;
  events: LiveEvent[];
  tiles?: ProductTile[];
  integration: string[];
  callouts: CalloutSpec[];
  consoleTabs: ConsoleTab[];
  consoleOpen: boolean;
  consoleTab: string;
  onConsole(open: boolean, tab?: string): void;
  /** The app has a dialog open: the feed folds on a phone. */
  quiet?: boolean;
  children: React.ReactNode;
}) {
  const appRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="dx" data-testid="demo-shell">
      <DemoBar
        demo={demo}
        done={done}
        step={step}
        onConsole={() => onConsole(true)}
        onRestart={onRestart}
        onStep={onStep}
      />
      <div ref={appRef} className="dx-app" data-app={app}>
        {children}
        <Callouts callouts={callouts} container={appRef} />
        <LiveFeed
          events={events}
          integration={integration}
          person={person}
          quiet={quiet}
          tiles={tiles}
          onConsole={() => onConsole(true)}
        />
      </div>
      <ConsoleView
        app={{ name: demo.brand.name, initial: demo.brand.initial }}
        open={consoleOpen}
        tab={consoleTab}
        tabs={consoleTabs}
        onClose={() => onConsole(false)}
        onTab={(tab) => onConsole(true, tab)}
      />
    </div>
  );
}
