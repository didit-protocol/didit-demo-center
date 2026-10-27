"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

export type ThemeChoice = "light" | "dark" | "system";

const THEME_KEY = "aurora-play-demo:theme";

/**
 * Light, dark or the system setting, remembered per browser. Only the demo
 * area follows it: the vendored didit.me chrome around it stays light.
 */
export function useDemoTheme() {
  const [choice, setChoice] = React.useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);

    if (stored === "light" || stored === "dark") setChoice(stored);
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(query.matches);

    sync();
    query.addEventListener("change", sync);

    return () => query.removeEventListener("change", sync);
  }, []);

  const choose = React.useCallback((next: ThemeChoice) => {
    setChoice(next);
    if (next === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, next);
  }, []);

  const dark = choice === "dark" || (choice === "system" && systemDark);

  return { choice, choose, dark };
}

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({
  choice,
  onChoose,
}: {
  choice: ThemeChoice;
  onChoose: (choice: ThemeChoice) => void;
}) {
  return (
    <div
      aria-label="Theme"
      className="inline-flex h-10 items-center gap-0.5 rounded-pill border border-line bg-canvas p-1"
      role="radiogroup"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = choice === value;

        return (
          <button
            key={value}
            aria-checked={active}
            aria-label={label}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-pill px-2.5 text-xs font-medium transition-colors duration-fast focus-visible:shadow-ring focus-visible:outline-none",
              active ? "bg-ink text-canvas" : "text-muted hover:text-ink",
            )}
            role="radio"
            title={label}
            type="button"
            onClick={() => onChoose(value)}
          >
            <Icon aria-hidden className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
