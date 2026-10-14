"use client";

import { useState } from "react";
import { ArrowRight, ScanFace, IdCard } from "lucide-react";

import { Button } from "@/components/ui/button";

type AccsComponent = {
  key: "age-estimation" | "age-verification";
  workflowId: string;
  title: string;
  description: string;
  icon: typeof ScanFace;
  buttonLabel: string;
};

const ACCS_COMPONENTS: AccsComponent[] = [
  {
    key: "age-estimation",
    // Production-only workflow (ACCS tests run against the production engine)
    workflowId: "2d958679-f3bf-4747-8a38-9a40a29a6098",
    title: "Age Estimation",
    description:
      "Facial age estimation from a live selfie with passive liveness. Challenge-25 policy: Approved only when the estimated age is over 25, Declined otherwise, so under-18 users are never accepted.",
    icon: ScanFace,
    buttonLabel: "Start Age Estimation Test",
  },
  {
    key: "age-verification",
    // Production-only workflow (ACCS tests run against the production engine)
    workflowId: "a8942aa3-3bfe-4e1c-b322-d0d43e7ec31f",
    title: "Age Verification",
    description:
      "Document-based age verification: ID document scan with fraud checks, passive liveness and 1:1 face match. Returns Approved for genuine 18+ documents, Declined otherwise.",
    icon: IdCard,
    buttonLabel: "Start Age Verification Test",
  },
];

export default function AccsPage() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (component: AccsComponent) => {
    setLoadingKey(component.key);
    setError(null);

    try {
      const vendorData = `accs-${component.key}-${crypto.randomUUID()}`;
      const callback = `${window.location.origin}/accs/callback?component=${component.key}`;

      const response = await fetch("/api/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflow_id: component.workflowId,
          vendor_data: vendorData,
          callback,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      if (data?.session_id) {
        localStorage.setItem("accsSessionId", data.session_id);
        window.location.href = data.url;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";

      setError(errorMessage);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-10">
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            ACCS Age Assurance Testing
          </h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-lg">
            Independent validation testing environment for Didit&apos;s age
            assurance components (ISO/IEC 27566). Each session ends with a clear
            Approved or Declined outcome.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {ACCS_COMPONENTS.map((component) => (
            <div
              key={component.key}
              className="rounded-2xl border border-gray-200 p-6 bg-white text-left space-y-4 flex flex-col"
            >
              <div className="bg-[#f4f4f6] p-3 rounded-full w-fit">
                <component.icon className="w-8 h-8 text-gray-600" />
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {component.title}
              </div>
              <p className="text-sm text-gray-500 flex-1">
                {component.description}
              </p>
              <Button
                className="w-full h-12 rounded-full bg-[#2667ff] hover:bg-[#2667ff]/90 text-sm font-medium"
                disabled={loadingKey !== null}
                onClick={() => handleStart(component)}
              >
                {loadingKey === component.key ? (
                  "Starting..."
                ) : (
                  <>
                    <span>{component.buttonLabel}</span>
                    <div className="bg-white/20 rounded-full p-1 ml-2">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="text-xs text-gray-400">
          Sessions run on the production verification engine. Scan the QR code
          shown after starting a test to continue on a mobile device.
        </div>
      </div>
    </div>
  );
}
