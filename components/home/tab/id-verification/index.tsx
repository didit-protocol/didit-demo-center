"use client";

import { ArrowRight, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useVerification } from "@/app/hooks/useVerification";

export function IdVerificationTab() {
  const { sessionData, decisionData, isLoading, error, createSession } =
    useVerification();

  const handleCreateSession = async () => {
    const workflowId = process.env.NEXT_PUBLIC_WORKFLOW_ID || "";
    const vendorData = crypto.randomUUID();
    const callback = `${window.location.origin}/verification/callback`;

    const session = await createSession(workflowId, vendorData, callback);

    if (session?.session_id) {
      // Store the new session ID
      localStorage.setItem("verificationSessionId", session.session_id);
      // Instead of window.open, directly navigate to the URL
      window.location.href = session.url;
    }
  };

  return (
    <>
      <div className="flex flex-col py-2 space-y-6 sm:space-y-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="bg-[#f4f4f6] p-2 sm:p-3 rounded-full">
            <ScanLine className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-medium">
            Identity Verification (KYC)
          </h2>
        </div>
        <p className="text-sm text-gray-500">
          Didit offers a free, unlimited, and forever Know Your Customer (KYC)
          solution, ensuring that organizations of all sizes can access top-tier
          identity verification services without cost. This comprehensive
          platform combines advanced document verification, facial recognition,
          and reusable KYC features to facilitate quick and secure user
          onboarding.
        </p>
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-500 mb-2">
            Key Features:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-500">
            <li>
              <span className="font-medium">Document Verification:</span>{" "}
              Supports over 3,000 document types from 200+ countries
            </li>
            <li>
              <span className="font-medium">Facial Recognition:</span> Advanced
              1:1 matching with liveness detection
            </li>
            <li>
              <span className="font-medium">Reusable KYC:</span> Verify once,
              use everywhere
            </li>
            <li>
              <span className="font-medium">Quick Integration:</span> API setup
              in under 2 hours
            </li>
            <li>
              <span className="font-medium">Enterprise Security:</span> GDPR
              compliant and ISO 27001 certified
            </li>
          </ul>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm mt-2">Error: {error}</div>}

      <div className="flex flex-col py-8 space-y-8">
        <div className="flex justify-between items-center">
          <Button
            className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-[#2667ff] hover:bg-[#2667ff]/90 text-sm sm:text-base font-normal"
            disabled={isLoading}
            onClick={handleCreateSession}
          >
            {isLoading ? (
              "Creating session..."
            ) : sessionData || decisionData ? (
              <>
                <span>Create new session</span>
                <div className="bg-white/20 rounded-full p-1 ml-2">
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              </>
            ) : (
              <>
                <span>Create Verification Session</span>
                <div className="bg-white/20 rounded-full p-1 ml-2">
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
