"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

function AccsCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") || "";
  const component = searchParams.get("component") || "";
  const sessionId = searchParams.get("verificationSessionId") || "";

  const componentLabel =
    component === "age-estimation"
      ? "Age Estimation"
      : component === "age-verification"
        ? "Age Verification"
        : "Age Assurance";

  const statusMeta = useMemo(() => {
    const s = status.toLowerCase();

    if (s === "approved" || s === "success" || s === "completed") {
      return {
        color: "text-green-600",
        bg: "bg-green-50",
        Icon: CheckCircle2,
        label: "Approved",
        description: `The ${componentLabel} check passed: the session was accepted.`,
      };
    }
    if (s === "rejected" || s === "declined" || s === "failed") {
      return {
        color: "text-red-600",
        bg: "bg-red-50",
        Icon: XCircle,
        label: "Declined",
        description: `The ${componentLabel} check did not pass: the session was rejected.`,
      };
    }

    return {
      color: "text-amber-600",
      bg: "bg-amber-50",
      Icon: CircleAlert,
      label: status || "Pending",
      description: "The verification is still being processed.",
    };
  }, [status, componentLabel]);

  return (
    <div className="container max-w-xl mx-auto py-8 px-4 space-y-8">
      <Button
        className="gap-2"
        variant="ghost"
        onClick={() => router.push("/accs")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to ACCS testing
      </Button>

      <div className="flex flex-col items-center space-y-6 py-8">
        <div className={`${statusMeta.bg} p-4 rounded-full`}>
          <statusMeta.Icon className={`w-12 h-12 ${statusMeta.color}`} />
        </div>
        <div className="text-center space-y-2">
          <h1
            className={`text-2xl sm:text-3xl font-semibold ${statusMeta.color}`}
          >
            {statusMeta.label}
          </h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-md">
            {statusMeta.description}
          </p>
        </div>
        {sessionId && (
          <div className="text-xs text-gray-400 font-mono break-all">
            Session ID: {sessionId}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-400">
        {componentLabel} — ACCS ISO/IEC 27566 independent validation testing
      </div>

      <div className="flex justify-center">
        <Button
          className="h-12 px-8 rounded-full bg-[#2667ff] hover:bg-[#2667ff]/90"
          onClick={() => router.push("/accs")}
        >
          Run Another Test
        </Button>
      </div>
    </div>
  );
}

export default function AccsCallback() {
  return (
    <Suspense fallback={null}>
      <AccsCallbackContent />
    </Suspense>
  );
}
