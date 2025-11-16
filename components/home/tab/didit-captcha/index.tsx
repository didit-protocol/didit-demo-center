"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { DiditCaptcha } from "@/components/didit-captcha";
import { Button } from "@/components/ui/button";

export function DiditCaptchaTab() {
  const [email, setEmail] = useState("");
  const [diditSessionId, setDiditSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCaptchaVerified = (data: {
    sessionId: string;
    email: string | null;
  }) => {
    setDiditSessionId(data.sessionId);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!diditSessionId) {
      setError("Please complete the Didit CAPTCHA first.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/didit-captcha/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          diditSessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold tracking-tight mb-2">
          Didit CAPTCHA Demo
        </h3>
        <p className="text-sm text-gray-500">
          Experience a bot-resistant CAPTCHA powered by liveness verification.
          We&apos;re improving this flow so users verify their identity once
          periodically via liveness check, then their verified identity is
          reused to prove they&apos;re human—just by clicking the checkbox.
          Enter your email, complete the quick face check, and submit the form
          to test an example of the flow.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="work-email"
            className="block text-sm font-medium mb-2 text-gray-700"
          >
            Work email
          </label>
          <input
            id="work-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2667ff]"
            placeholder="[email protected]"
          />
        </div>

        <div>
          <DiditCaptcha email={email || null} onVerified={handleCaptchaVerified} />
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Form submitted successfully! Humanity confirmed via Didit.</span>
          </div>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            disabled={submitting || !diditSessionId}
            className="rounded-lg bg-[#2667ff] hover:bg-[#2667ff]/90"
          >
            {submitting ? "Submitting…" : "Submit Form"}
          </Button>
        </div>
      </form>
    </div>
  );
}

