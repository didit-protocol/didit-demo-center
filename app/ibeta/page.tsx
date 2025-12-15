"use client";

import { useState } from "react";
import { ArrowRight, UserRoundCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const IBETA_WORKFLOW_ID = "09e01223-d121-442c-b05a-8a6444b0f0e7";

export default function IBetaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartLiveness = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const vendorData = crypto.randomUUID();
      const callback = `${window.location.origin}/ibeta/callback`;

      const response = await fetch("/api/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflow_id: IBETA_WORKFLOW_ID,
          vendor_data: vendorData,
          callback,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      if (data?.session_id) {
        localStorage.setItem("ibetaSessionId", data.session_id);
        window.location.href = data.url;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-[#f4f4f6] p-4 rounded-full">
            <UserRoundCheck className="w-12 h-12 text-gray-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            iBeta Active Liveness
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Verify that you are a real person by completing an active liveness
            check.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <Button
          className="w-full h-14 rounded-full bg-[#2667ff] hover:bg-[#2667ff]/90 text-base font-medium"
          disabled={isLoading}
          onClick={handleStartLiveness}
        >
          {isLoading ? (
            "Starting..."
          ) : (
            <>
              <span>Start Active Liveness</span>
              <div className="bg-white/20 rounded-full p-1 ml-2">
                <ArrowRight className="h-4 w-4" />
              </div>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

