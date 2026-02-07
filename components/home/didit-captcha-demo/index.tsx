"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  ArrowRight,
  Mail,
  Shield,
  ListChecks,
  Check,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { DiditCaptcha } from "@/components/didit-captcha";
import { WORKFLOWS } from "@/lib/workflows";

interface DiditCaptchaDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiditCaptchaDemo({ isOpen, onClose }: DiditCaptchaDemoProps) {
  const [email, setEmail] = useState("");
  const [diditSessionId, setDiditSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get the CAPTCHA workflow data
  const captchaWorkflow = WORKFLOWS.find((w) => w.isCaptcha);

  const handleCaptchaVerified = (data: {
    sessionId: string;
    email: string | null;
    isFromCache: boolean;
  }) => {
    setDiditSessionId(data.sessionId);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/didit-captcha/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          diditSessionId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setDiditSessionId(null);
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#1a1a1a]/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-4 z-50 flex items-center justify-center sm:inset-8"
          >
            <div
              className="relative w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6e6e73] transition-all hover:bg-[#e5e5e5] hover:text-[#1a1a1a]"
              >
                <X className="size-4" />
              </button>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="border-b border-[#f0f0f0] p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="icon-container-accent shrink-0">
                      <Shield className="size-5 text-white sm:size-6" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                      <h2 className="text-headline text-[#1a1a1a] mb-2">
                        Didit CAPTCHA
                      </h2>
                      <p className="text-body text-[#6e6e73]">
                        Human-only access with privacy-first biometric verification. 
                        No more clicking traffic lights.
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="stat-card">
                      <div className="stat-value">1-Click</div>
                      <div className="stat-label">Experience</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">48h</div>
                      <div className="stat-label">Session Cache</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">0%</div>
                      <div className="stat-label">Bot Pass Rate</div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8 space-y-6">
                  {success ? (
                    /* Success state */
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-r from-[#dcfce7] to-[#d1fae5]">
                          <CheckCircle2 className="size-8 text-[#15803d]" />
                        </div>
                      </div>
                      <h3 className="text-headline text-[#1a1a1a] mb-2">
                        Verification Complete!
                      </h3>
                      <p className="text-body text-[#6e6e73] max-w-sm mx-auto">
                        You&apos;ve been verified as human. In a real application, you&apos;d now have
                        full access to protected features.
                      </p>
                      <button
                        onClick={handleClose}
                        className="btn-secondary mt-6"
                      >
                        Close Demo
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      {/* Interactive form */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Mail className="size-4 text-[#2567ff]" />
                          <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
                            Try It Now
                          </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                          {/* Email input */}
                          <div>
                            <label className="block text-[13px] font-medium text-[#4b5058] mb-1.5">
                              Your Email
                            </label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Enter your email to try the demo"
                              required
                              className="input-base"
                            />
                          </div>

                          {/* CAPTCHA widget */}
                          <div className="rounded-xl bg-[#f5f5f7] p-4">
                            <DiditCaptcha
                              email={email || null}
                              onVerified={handleCaptchaVerified}
                              disabled={!email}
                              className="w-full"
                            />
                          </div>

                          {/* Error message */}
                          {error && (
                            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-700">
                              {error}
                            </div>
                          )}

                          {/* Submit button */}
                          <button
                            type="submit"
                            disabled={!email || !diditSessionId || submitting}
                            className={cn(
                              "btn-primary w-full flex items-center justify-center gap-2",
                              (!email || !diditSessionId || submitting) && "opacity-50 pointer-events-none"
                            )}
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                Complete Demo
                                <ArrowRight className="size-4" />
                              </>
                            )}
                          </button>
                        </form>
                      </div>

                      {/* How it works */}
                      <div className="border-t border-[#f0f0f0] pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <ListChecks className="size-4 text-[#2567ff]" />
                          <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
                            How It Works
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {[
                            { title: "Click the checkbox", desc: "A simple, familiar interaction" },
                            { title: "Complete biometric check", desc: "Quick face scan in a popup window" },
                            { title: "You're verified", desc: "Session cached for 48 hours" },
                          ].map((step, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 rounded-xl bg-[#f5f5f7] p-3 sm:p-4"
                            >
                              <div className="step-number">{i + 1}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[13px] font-semibold text-[#1a1a1a] sm:text-[14px]">
                                  {step.title}
                                </h4>
                                <p className="text-[12px] text-[#6e6e73] sm:text-[13px] mt-0.5">
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Features */}
                      <div className="border-t border-[#f0f0f0] pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Check className="size-4 text-[#2567ff]" />
                          <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
                            Features Included
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["Biometric Check", "Session Caching", "Privacy First", "No Puzzles", "Fast Integration"].map((feature) => (
                            <div
                              key={feature}
                              className="feature-pill feature-pill-selected"
                            >
                              <div className="flex size-4 items-center justify-center rounded-full bg-[#2567ff]">
                                <Check className="size-2.5 text-white" strokeWidth={3} />
                              </div>
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
