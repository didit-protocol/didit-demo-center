"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  XCircle,
  Timer,
  Copy,
  Check,
  ExternalLink,
  FileText,
} from "lucide-react";

export default function VerificationCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const verificationSessionId = searchParams.get("verificationSessionId") || "";
  const status = searchParams.get("status") || "";

  const [copied, setCopied] = useState(false);

  const statusMeta = useMemo(() => {
    const s = status.toLowerCase();
    if (s === "approved" || s === "success" || s === "completed") {
      return {
        label: "Approved",
        icon: CheckCircle2,
        bgColor: "bg-gradient-to-r from-[#dcfce7] to-[#d1fae5]",
        iconColor: "text-[#15803d]",
        textColor: "text-[#15803d]",
        borderColor: "border-[#bbf7d0]",
      };
    }
    if (s === "declined" || s === "rejected" || s === "failed") {
      return {
        label: "Declined",
        icon: XCircle,
        bgColor: "bg-red-50",
        iconColor: "text-red-600",
        textColor: "text-red-700",
        borderColor: "border-red-100",
      };
    }
    if (s === "pending" || s === "in_progress" || s === "processing") {
      return {
        label: "Pending",
        icon: Timer,
        bgColor: "bg-amber-50",
        iconColor: "text-amber-600",
        textColor: "text-amber-700",
        borderColor: "border-amber-100",
      };
    }
    return {
      label: status || "Unknown",
      icon: CircleAlert,
      bgColor: "bg-[#f5f5f7]",
      iconColor: "text-[#6e6e73]",
      textColor: "text-[#4b5058]",
      borderColor: "border-[#e5e5e5]",
    };
  }, [status]);

  const StatusIcon = statusMeta.icon;

  const copySessionId = async () => {
    await navigator.clipboard.writeText(verificationSessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="section-wrapper">
      <div className="section-container max-w-[800px]">
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="btn-ghost inline-flex items-center gap-2 mb-8 -ml-2"
        >
          <ArrowLeft className="size-4" />
          Back to Demo Center
        </button>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-headline text-[#1a1a1a] mb-2">
            Verification Results
          </h1>
          <p className="text-body text-[#6e6e73]">
            Your verification session has been processed. View the results below.
          </p>
        </div>

        {/* Demo notice */}
        <div className="badge-info mb-6 !py-2 !px-4">
          <FileText className="size-4" />
          <span>
            This is a demo session. In production, verification data is returned via webhook.
          </span>
        </div>

        {/* Status card */}
        <div className={`card-base ${statusMeta.bgColor} ${statusMeta.borderColor} mb-6`}>
          <div className="flex items-center gap-4">
            <div className={`flex size-12 items-center justify-center rounded-xl ${statusMeta.bgColor}`}>
              <StatusIcon className={`size-6 ${statusMeta.iconColor}`} />
            </div>
            <div>
              <h2 className={`text-title ${statusMeta.textColor}`}>
                Verification {statusMeta.label}
              </h2>
              <p className="text-body-small text-[#6e6e73] mt-0.5">
                {statusMeta.label === "Approved"
                  ? "The identity has been successfully verified."
                  : statusMeta.label === "Declined"
                    ? "The verification could not be completed."
                    : statusMeta.label === "Pending"
                      ? "The verification is still being processed."
                      : "The verification status is unknown."}
              </p>
            </div>
          </div>
        </div>

        {/* Session ID card */}
        <div className="card-base mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label-sm text-[#6e6e73] mb-1">Session ID</p>
              <p className="text-body-small text-[#1a1a1a] font-mono">
                {verificationSessionId}
              </p>
            </div>
            <button
              onClick={copySessionId}
              className="flex size-9 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6e6e73] transition-all hover:bg-[#e5e5e5] hover:text-[#1a1a1a]"
            >
              {copied ? (
                <Check className="size-4 text-[#15803d]" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Documentation link */}
        <div className="mt-8 pt-6 border-t border-[#f0f0f0]">
          <a
            href="https://docs.didit.me"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost inline-flex items-center gap-2"
          >
            <ExternalLink className="size-4" />
            View API Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
