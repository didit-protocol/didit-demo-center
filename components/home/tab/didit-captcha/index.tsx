"use client";

import React, { useState } from "react";
import { CheckCircle2, ArrowRight, Mail, Shield } from "lucide-react";

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
    isFromCache: boolean;
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
      {/* Header */}
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 shrink-0">
          <Shield className="h-6 w-6 text-accent" />
        </span>
        <div>
          <h3 className="text-title text-app-black mb-1">Didit CAPTCHA Demo</h3>
          <p className="text-body">
            Experience a bot-resistant CAPTCHA powered by liveness verification.
            Users verify their humanity through a quick biometric check,
            providing a seamless yet secure experience. Enter your email,
            complete the face check, and submit to see it in action.
          </p>
        </div>
      </div>

      {/* Form */}
      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Email field */}
        <div className="card-base max-w-lg">
          <label
            className="flex items-center gap-2 text-label-lg text-app-black mb-3"
            htmlFor="work-email"
          >
            <Mail className="h-4 w-4 text-accent" />
            Work Email
          </label>
          <input
            required
            className="input-base"
            id="work-email"
            placeholder="[email protected]"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* CAPTCHA component */}
        <div className="card-base max-w-lg">
          <div className="flex items-center gap-2 text-label-lg text-app-black mb-3">
            <Shield className="h-4 w-4 text-accent" />
            Human Verification
          </div>
          <DiditCaptcha
            email={email || null}
            onVerified={handleCaptchaVerified}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="badge-error px-4 py-3 rounded-xl max-w-lg">
            <p className="text-label-md">{error}</p>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="card-base border-green-200 bg-green-50 max-w-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-label-lg text-green-800">
                  Form submitted successfully!
                </p>
                <p className="text-body-small text-green-700">
                  Humanity confirmed via Didit.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-2">
          <Button
            className="btn-primary h-12 px-8 text-[15px]"
            disabled={submitting || !diditSessionId}
            type="submit"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Submit Form</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
