"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function IBetaCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") || "";

  const statusMeta = useMemo(() => {
    const s = status.toLowerCase();

    if (s === "approved" || s === "success" || s === "completed") {
      return {
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        Icon: CheckCircle2,
        label: "Verification Successful",
        description:
          "The full system with 1:1 matching and active liveness check has been successfully completed. The user has been verified.",
      };
    }
    if (s === "rejected" || s === "declined" || s === "failed") {
      return {
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        Icon: XCircle,
        label: "Verification Failed",
        description:
          "The full system with 1:1 matching and active liveness check has failed. The user could not be verified.",
      };
    }
    if (s.includes("review")) {
      return {
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        Icon: CircleAlert,
        label: "In Review",
        description: "The verification requires manual review.",
      };
    }

    return {
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      Icon: CircleAlert,
      label: status || "Pending",
      description: "The verification is being processed.",
    };
  }, [status]);

  return (
    <div className="container max-w-xl mx-auto py-8 px-4 space-y-8">
      <Button
        className="gap-2"
        variant="ghost"
        onClick={() => router.push("/ibeta")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to iBeta
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
      </div>

      <div className="text-center text-xs text-gray-400">
        Full system with 1:1 matching and active liveness
      </div>

      <div className="flex justify-center">
        <Button
          className="h-12 px-8 rounded-full bg-[#2667ff] hover:bg-[#2667ff]/90"
          onClick={() => router.push("/ibeta")}
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}


