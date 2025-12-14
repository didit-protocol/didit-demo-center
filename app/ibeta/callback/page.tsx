"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  CircleAlert,
  UserRoundCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { JsonViewer } from "@/components/general/json-viewer";

interface LivenessData {
  status: string;
  method?: string;
  score?: number;
  reference_image?: string;
  video_url?: string;
  age_estimation?: number;
  warnings?: any[];
}

interface DecisionData {
  session_id: string;
  status: string;
  liveness?: LivenessData;
  [key: string]: any;
}

export default function IBetaCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const verificationSessionId =
    searchParams.get("verificationSessionId") || "";
  const status = searchParams.get("status") || "";

  const [decisionData, setDecisionData] = useState<DecisionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusMeta = useMemo(() => {
    const s = status.toLowerCase();
    if (s === "approved" || s === "success" || s === "completed") {
      return {
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        Icon: CheckCircle2,
        label: "Liveness Verified",
        description:
          "The active liveness check has been successfully completed. The user has been verified as a real person.",
      };
    }
    if (s === "rejected" || s === "declined" || s === "failed") {
      return {
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        Icon: XCircle,
        label: "Liveness Failed",
        description:
          "The active liveness check has failed. The user could not be verified as a real person.",
      };
    }
    if (s.includes("review")) {
      return {
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        Icon: CircleAlert,
        label: "In Review",
        description:
          "The liveness check requires manual review.",
      };
    }
    return {
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      Icon: CircleAlert,
      label: status || "Pending",
      description:
        "The liveness check is being processed.",
    };
  }, [status]);

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
          setError(body?.error || "Failed to fetch liveness data");
          return;
        }
        setDecisionData(body as DecisionData);
      } catch (e) {
        setError("Failed to fetch liveness data");
      } finally {
        setLoading(false);
      }
    };

    fetchDecision();
  }, [verificationSessionId]);

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
      <Button
        className="gap-2"
        variant="ghost"
        onClick={() => router.push("/ibeta")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to iBeta Liveness
      </Button>

      <div className="flex flex-col items-center space-y-4 py-4">
        <div className="bg-[#f4f4f6] p-3 rounded-full">
          <UserRoundCheck className="w-8 h-8 text-gray-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
          Active Liveness Result
        </h1>
      </div>

      <div
        className={`rounded-xl border ${statusMeta.border} ${statusMeta.bg} p-4`}
      >
        <div className="flex items-start gap-3">
          <statusMeta.Icon className={`h-6 w-6 mt-0.5 ${statusMeta.color}`} />
          <div>
            <div className="text-lg font-medium">
              <span className={statusMeta.color}>{statusMeta.label}</span>
            </div>
            {statusMeta.description && (
              <p className="text-gray-700 mt-1 text-sm">
                {statusMeta.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Session ID</div>
            <div className="font-mono text-sm break-all">
              {verificationSessionId || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Liveness Status</div>
            <div className={`text-sm font-medium ${statusMeta.color}`}>
              {statusMeta.label}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-500 text-center">
          Loading liveness results…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {decisionData && (
        <JsonViewer
          title="Liveness Decision (Full JSON)"
          data={decisionData}
          className="h-[calc(100vh-32rem)]"
          contentClassName="h-[calc(100%-2rem)]"
        />
      )}
    </div>
  );
}
