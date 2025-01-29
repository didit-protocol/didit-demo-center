"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JsonViewer } from "@/components/general/json-viewer";
import {
  useVerification,
  VerificationDecision,
} from "@/app/hooks/useVerification";

export default function VerificationCallback() {
  const router = useRouter();
  const [decisionData, setDecisionData] = useState<VerificationDecision | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const { getSessionDecision } = useVerification();

  useEffect(() => {
    const fetchDecision = async () => {
      const sessionId = localStorage.getItem("verificationSessionId");

      if (sessionId) {
        try {
          const response = await getSessionDecision(sessionId);

          if (response?.error) {
            setError(
              "More than 24 hours have passed since the session was created. Please create a new session.",
            );
            localStorage.removeItem("verificationSessionId");
          } else {
            setDecisionData(response);
          }
        } catch (err) {
          setError("Failed to fetch verification data");
        }
      }
    };

    fetchDecision();
  }, []);

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

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : (
        decisionData && (
          <JsonViewer
            className="h-[calc(100vh-12rem)]"
            contentClassName="h-[calc(100%-2rem)]"
            data={decisionData}
            title="Verification Results"
          />
        )
      )}
    </div>
  );
}
