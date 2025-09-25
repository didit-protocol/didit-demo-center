"use client";

import React from "react";
import {
  ArrowRight,
  Layers,
  ListChecks,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useVerification } from "@/app/hooks/useVerification";
import { WORKFLOWS, type WorkflowConfig } from "@/lib/workflows";

export function WorkflowsTab() {
  const { sessionData, decisionData, isLoading, error, createSession } =
    useVerification();

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
    // Reset portrait state when changing workflows
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
    <>
      <div className="flex flex-col py-2 space-y-6 sm:space-y-8">
        {/* Workflow selector and details (all breakpoints) */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-8">
          <div>
            {/* Mobile/Tablet: custom dropdown */}
            <div ref={dropdownRef} className="space-y-2 relative lg:hidden">
              <div className="text-sm font-medium text-gray-700">
                Choose a workflow
              </div>
              <button
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className="relative w-full rounded-xl border border-gray-300 py-3 pl-3 pr-10 text-left bg-white focus:outline-none focus:ring-2 focus:ring-[#2667ff] shadow-sm"
                onClick={() => setIsOpen((v) => !v)}
              >
                {selected && (
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                      <selected.icon className="h-4 w-4 text-[#2667ff]" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-gray-900">
                        {selected.title}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {selected.bestFor}
                      </div>
                    </div>
                  </div>
                )}
                <ChevronDown
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform ${
                    isOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
              {isOpen && (
                <div
                  className="absolute left-0 right-0 z-20 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
                  role="listbox"
                >
                  <div className="max-h-[420px] overflow-y-auto p-1">
                    {WORKFLOWS.map((wf, idx) => (
                      <button
                        key={`${wf.id}-${idx}`}
                        aria-selected={selectedIndex === idx}
                        className={`w-full text-left rounded-lg px-3 py-3 hover:bg-blue-50 ${
                          selectedIndex === idx ? "bg-blue-50" : "bg-white"
                        }`}
                        role="option"
                        onClick={() => {
                          setSelectedIndex(idx);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                            <wf.icon className="h-4 w-4 text-[#2667ff]" />
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-gray-900">
                              {wf.title}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-2">
                              {wf.bestFor}
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
            <div className="hidden lg:block space-y-2">
              <div className="text-sm font-medium text-gray-700">
                Choose a workflow
              </div>
              <div className="grid grid-cols-1 gap-2">
                {WORKFLOWS.map((wf, idx) => (
                  <button
                    key={`${wf.id}-${idx}`}
                    className={`text-left rounded-xl border p-4 hover:bg-blue-50 transition ${
                      selectedIndex === idx
                        ? "border-[#2667ff] bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                        <wf.icon className="h-4 w-4 text-[#2667ff]" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-gray-900">
                          {wf.title}
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {wf.bestFor}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {selected && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
                    <selected.icon className="h-5 w-5 text-[#2667ff]" />
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {selected.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {selected.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks className="h-4 w-4 text-[#2667ff]" />
                    <div className="text-sm font-medium">Steps</div>
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                    {selected.steps.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-[#2667ff]" />
                    <div className="text-sm font-medium">Features</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.features.map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {selected.requiresPortrait && (
                <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                  <div className="text-sm font-medium mb-2">
                    Reference selfie (face match)
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    Upload a clear selfie. Max size 1MB. This will be matched
                    against the live capture.
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      accept="image/*"
                      className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:px-3 file:py-2 file:text-sm file:cursor-pointer"
                      type="file"
                      onChange={handlePortraitChange}
                    />
                  </div>
                  {portraitError && (
                    <div className="text-xs text-red-600 mt-2">
                      {portraitError}
                    </div>
                  )}
                  {portraitBase64 && !portraitError && (
                    <div className="text-xs text-green-700 mt-2">
                      Image attached ✓
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-[#2667ff]" />
                  <div className="text-sm font-medium">Best for</div>
                </div>
                <p className="text-sm text-gray-700">{selected.bestFor}</p>
              </div>

              {error && (
                <div className="text-red-500 text-sm">Error: {error}</div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Button
                  className="w-full sm:w-auto rounded-lg bg-[#2667ff] hover:bg-[#2667ff]/90"
                  disabled={isLoading}
                  onClick={() => handleStart(selected.id)}
                >
                  {isLoading ? (
                    "Creating session..."
                  ) : sessionData || decisionData ? (
                    <>
                      <span>Start this workflow</span>
                      <div className="bg-white/20 rounded-full p-1 ml-2">
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </>
                  ) : (
                    <>
                      <span>Start this workflow</span>
                      <div className="bg-white/20 rounded-full p-1 ml-2">
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
