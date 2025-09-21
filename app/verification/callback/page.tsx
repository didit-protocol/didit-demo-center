"use client";

import type { VerificationDecision } from "@/app/types/verification";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  XCircle,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { JsonViewer } from "@/components/general/json-viewer";

export default function VerificationCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const verificationSessionId = searchParams.get("verificationSessionId") || "";
  const status = searchParams.get("status") || "";

  const statusMeta = useMemo(() => {
    const s = status.toLowerCase();
    if (s === "approved" || s === "success" || s === "completed") {
      return {
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        Icon: CheckCircle2,
        label: "Approved",
        description:
          "The verification has been successfully completed and approved. All required checks have passed.",
      };
    }
    if (s === "rejected" || s === "declined" || s === "failed") {
      return {
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        Icon: XCircle,
        label: "Declined",
        description:
          "The verification has been rejected due to issues with submitted information or documents not meeting the workflow requirements. Review the warnings section below for more details.",
      };
    }
    // Treat any status containing "review" as In Review
    if (s.includes("review")) {
      return {
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        Icon: CircleAlert,
        label: "In Review",
        description:
          "The verification requires manual review by your team due to certain flags or by your workflow configuration.",
      };
    }
    return {
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      Icon: CircleAlert,
      label: status || "Pending",
      description:
        "The verification is being processed. If your workflow includes manual steps, this may take a bit longer.",
    };
  }, [status]);

  const [decisionData, setDecisionData] = useState<VerificationDecision | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDecision = async () => {
      if (!verificationSessionId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/verification?sessionId=${encodeURIComponent(verificationSessionId)}`
        );
        const body = await res.json();
        if (!res.ok) {
          setError(body?.error || "Failed to fetch verification data");
          return;
        }
        setDecisionData(body as VerificationDecision);
      } catch (e) {
        setError("Failed to fetch verification data");
      } finally {
        setLoading(false);
      }
    };

    fetchDecision();
  }, [verificationSessionId]);

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
      <Button
        className="gap-2"
        variant="ghost"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="h-4 w-4" />
        Return to Demo Center
      </Button>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-2">
        <Timer className="h-4 w-4 text-blue-600 mt-0.5" />
        <p className="text-sm text-blue-700">
          For this demo, verification sessions are accessible for up to 60
          minutes after creation. Retrieve results promptly; older sessions may
          no longer be available.
        </p>
      </div>

      <div
        className={`rounded-xl border ${statusMeta.border} ${statusMeta.bg} p-4`}
      >
        <div className="flex items-start gap-3">
          <statusMeta.Icon className={`h-5 w-5 mt-0.5 ${statusMeta.color}`} />
          <div className="text-sm">
            <div>
              <span className="font-medium mr-1">Status:</span>
              <span className={statusMeta.color}>
                {statusMeta.label || "Unknown"}
              </span>
            </div>
            {statusMeta.description && (
              <p className="text-gray-700 mt-1">{statusMeta.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">
              Verification Session ID
            </div>
            <div className="font-mono text-sm break-all">
              {verificationSessionId || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className="text-sm">{status || "-"}</div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">
          Loading verification results…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {decisionData && (
        <JsonViewer
          title="Verification Decision (Full JSON)"
          data={decisionData}
          className="h-[calc(100vh-16rem)]"
          contentClassName="h-[calc(100%-2rem)]"
        />
      )}
    </div>
  );
}
