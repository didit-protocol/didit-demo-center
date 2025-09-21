import { useState } from "react";

import {
  VerificationSession,
  VerificationDecision,
} from "../types/verification"; // Adjusted path assuming types dir is sibling to hooks

export function useVerification() {
  const [sessionData, setSessionData] = useState<VerificationSession | null>(
    null,
  );
  const [decisionData, setDecisionData] = useState<VerificationDecision | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = async (
    workflow_id: string,
    vendor_data: string,
    callback: string,
    portrait_image?: string,
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflow_id,
          vendor_data,
          callback,
          ...(portrait_image ? { portrait_image } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create verification session",
        );
      }

      setSessionData(data);

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";

      setError(errorMessage);
      console.error("Error creating verification session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSessionDecision = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/verification?sessionId=${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        return { error: data.error };
      }

      return data;
    } catch (err) {
      console.error("Error fetching session decision:", err);

      return { error: "Failed to fetch verification data" };
    }
  };

  const resetSession = () => {
    setSessionData(null);
    setDecisionData(null);
    setError(null);
  };

  return {
    sessionData,
    decisionData,
    isLoading,
    error,
    createSession,
    getSessionDecision,
    resetSession,
  };
}
export type { VerificationDecision };
