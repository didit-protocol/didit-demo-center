"use client";

import React from "react";
import {
  ArrowRight,
  Layers,
  ListChecks,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useVerification } from "@/app/hooks/useVerification";
import { WORKFLOWS, type WorkflowConfig } from "@/lib/workflows";
import { DiditCaptchaTab } from "@/components/home/tab/didit-captcha";

export function WorkflowsTab() {
  const { isLoading, error, createSession } = useVerification();

  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);

  const selected = React.useMemo<WorkflowConfig | undefined>(
    () => WORKFLOWS[selectedIndex],
    [selectedIndex],
  );

  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  const [portraitBase64, setPortraitBase64] = React.useState<string | null>(
    null,
  );
  const [portraitError, setPortraitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    setPortraitBase64(null);
    setPortraitError(null);
  }, [selectedIndex]);

  const handleStart = async (workflowId: string) => {
    const vendorData = crypto.randomUUID();
    const callback = `${window.location.origin}/verification/callback`;

    if (selected?.requiresPortrait && !portraitBase64) {
      setPortraitError(
        "Please upload a selfie (max 1MB) before starting this workflow.",
      );

      return;
    }
    const session = await createSession(
      workflowId,
      vendorData,
      callback,
      portraitBase64 || undefined,
    );

    if (session?.session_id) {
      localStorage.setItem("verificationSessionId", session.session_id);
      window.location.href = session.url;
    }
  };

  const handlePortraitChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPortraitError("Please select an image file.");
      setPortraitBase64(null);

      return;
    }
    if (file.size > 1024 * 1024) {
      setPortraitError("File too large. Max size is 1MB.");
      setPortraitBase64(null);

      return;
    }
    setPortraitError(null);
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;

      setPortraitBase64(base64);
    };
    reader.onerror = () => {
      setPortraitError("Failed to read file. Please try again.");
      setPortraitBase64(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col space-y-8">
      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 lg:gap-10">
        {/* Left column - Workflow selector */}
        <div>
          {/* Mobile/Tablet: custom dropdown */}
          <div ref={dropdownRef} className="space-y-3 relative lg:hidden">
            <span className="text-label-md text-graphite-gray block">
              Choose a workflow
            </span>
            <button
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              className="relative w-full rounded-xl border border-gray-200 py-3.5 pl-4 pr-10 text-left bg-white transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              onClick={() => setIsOpen((v) => !v)}
            >
              {selected && (
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <selected.icon className="h-5 w-5 text-accent" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-subtitle text-app-black truncate">
                      {selected.title}
                    </div>
                    <div className="text-body-small line-clamp-1">
                      {selected.bestFor}
                    </div>
                  </div>
                </div>
              )}
              <ChevronDown
                className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dusty-gray transition-transform ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
            {isOpen && (
              <div
                className="absolute left-0 right-0 z-20 mt-2 w-full rounded-2xl border border-gray-200 bg-white shadow-elevated overflow-hidden animate-fade-in"
                role="listbox"
              >
                <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                  {WORKFLOWS.map((wf, idx) => (
                    <button
                      key={`${wf.id}-${idx}`}
                      aria-selected={selectedIndex === idx}
                      className={`w-full text-left rounded-xl px-3 py-3.5 transition-all ${
                        selectedIndex === idx
                          ? "bg-accent/5 border border-accent/20"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                      role="option"
                      onClick={() => {
                        setSelectedIndex(idx);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                            selectedIndex === idx
                              ? "bg-accent/10"
                              : "bg-gray-100"
                          }`}
                        >
                          <wf.icon
                            className={`h-4 w-4 ${selectedIndex === idx ? "text-accent" : "text-graphite-gray"}`}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-label-lg ${selectedIndex === idx ? "text-accent" : "text-app-black"}`}
                            >
                              {wf.title}
                            </span>
                            {wf.badge && (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  wf.badgeColor === "green"
                                    ? "bg-green-100 text-green-700"
                                    : wf.badgeColor === "purple"
                                      ? "bg-purple-100 text-purple-700"
                                      : wf.badgeColor === "orange"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {wf.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-body-small line-clamp-2 mt-0.5">
                            {wf.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop: vertical list of workflow options */}
          <div className="hidden lg:block space-y-3">
            <span className="text-label-md text-graphite-gray block">
              Choose a workflow
            </span>
            <div className="space-y-3">
              {WORKFLOWS.map((wf, idx) => (
                <button
                  key={`${wf.id}-${idx}`}
                  className={`w-full text-left rounded-2xl border p-5 transition-all duration-200 ${
                    selectedIndex === idx
                      ? "border-accent bg-accent/[0.03] shadow-soft ring-1 ring-accent/10"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-soft"
                  }`}
                  onClick={() => setSelectedIndex(idx)}
                >
                  {/* Header row with icon, title, and badge */}
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors shrink-0 ${
                        selectedIndex === idx ? "bg-accent/10" : "bg-gray-100"
                      }`}
                    >
                      <wf.icon
                        className={`h-5 w-5 transition-colors ${
                          selectedIndex === idx
                            ? "text-accent"
                            : "text-graphite-gray"
                        }`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-label-lg transition-colors ${
                            selectedIndex === idx
                              ? "text-accent"
                              : "text-app-black"
                          }`}
                        >
                          {wf.title}
                        </span>
                        {wf.badge && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              wf.badgeColor === "green"
                                ? "bg-green-100 text-green-700"
                                : wf.badgeColor === "purple"
                                  ? "bg-purple-100 text-purple-700"
                                  : wf.badgeColor === "orange"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {wf.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-body-small line-clamp-2 mt-1">
                        {wf.description}
                      </p>
                    </div>
                  </div>

                  {/* Features preview */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {wf.features.slice(0, 3).map((f, fidx) => (
                      <span
                        key={fidx}
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          selectedIndex === idx
                            ? "bg-accent/10 text-accent"
                            : "bg-gray-100 text-graphite-gray"
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                    {wf.features.length > 3 && (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-dusty-gray">
                        +{wf.features.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Workflow details */}
        {selected && (
          <div className="space-y-6 animate-fade-in">
            {selected.isCaptcha ? (
              <DiditCaptchaTab />
            ) : (
              <>
                {/* Workflow header */}
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 shrink-0">
                    <selected.icon className="h-6 w-6 text-accent" />
                  </span>
                  <div>
                    <h3 className="text-title text-app-black mb-1">
                      {selected.title}
                    </h3>
                    <p className="text-body">{selected.description}</p>
                  </div>
                </div>

                {/* Info cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Steps card */}
                  <div className="card-base">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                        <ListChecks className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-label-lg text-app-black">
                        Steps
                      </span>
                    </div>
                    <ol className="space-y-3">
                      {selected.steps.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-label-sm text-graphite-gray shrink-0">
                            {idx + 1}
                          </span>
                          <div className="pt-0.5">
                            <span className="text-body-md text-app-black font-medium">
                              {s.title}
                            </span>
                            {s.description && (
                              <p className="text-body-sm text-graphite-gray mt-0.5">
                                {s.description}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Features card */}
                  <div className="card-base">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                        <Layers className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-label-lg text-app-black">
                        Features
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.features.map((f, idx) => (
                        <span key={idx} className="badge">
                          <Sparkles className="h-3 w-3 text-accent" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Portrait upload for biometric auth */}
                {selected.requiresPortrait && (
                  <div className="card-base">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                        <ShieldCheck className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-label-lg text-app-black">
                        Reference Selfie
                      </span>
                    </div>
                    <p className="text-body-small mb-4">
                      Upload a clear selfie (max 1MB). This will be matched
                      against the live capture.
                    </p>
                    <input
                      accept="image/*"
                      className="input-base file:mr-3 file:rounded-lg file:border-0 file:bg-accent/10 file:px-4 file:py-2 file:text-label-md file:text-accent file:cursor-pointer hover:file:bg-accent/20"
                      type="file"
                      onChange={handlePortraitChange}
                    />
                    {portraitError && (
                      <p className="text-label-sm text-red-600 mt-2">
                        {portraitError}
                      </p>
                    )}
                    {portraitBase64 && !portraitError && (
                      <p className="text-label-sm text-green-600 mt-2 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Image attached successfully
                      </p>
                    )}
                  </div>
                )}

                {/* Best for card */}
                <div className="card-base bg-gradient-to-br from-accent/[0.03] to-transparent">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                      <ShieldCheck className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-label-lg text-app-black">
                      Best For
                    </span>
                  </div>
                  <p className="text-body">{selected.bestFor}</p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="badge-error px-4 py-3 rounded-xl">
                    <p className="text-label-md">Error: {error}</p>
                  </div>
                )}

                {/* CTA button */}
                <div className="pt-2">
                  <Button
                    className="w-full sm:w-auto btn-primary h-12 px-8 text-[15px]"
                    disabled={isLoading}
                    onClick={() => handleStart(selected.id)}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating session...</span>
                      </>
                    ) : (
                      <>
                        <span>Start this workflow</span>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
