"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { DemoCenterHeader } from "@/components/home/header";
import { WorkflowCard } from "@/components/home/workflow-card";
import { WorkflowDetailModal } from "@/components/home/workflow-detail-modal";
import { WORKFLOWS, type WorkflowConfig } from "@/lib/workflows";
import { useVerification } from "@/app/hooks/useVerification";

export default function Home() {
  const router = useRouter();
  const { createSession, isLoading } = useVerification();
  const sdkRef = useRef<
    typeof import("@didit-protocol/sdk-web").DiditSdk | null
  >(null);

  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize SDK on client side only
  useEffect(() => {
    const initSdk = async () => {
      const { DiditSdk } = await import("@didit-protocol/sdk-web");

      sdkRef.current = DiditSdk;

      // Set up completion callback
      DiditSdk.shared.onComplete = (result) => {
        switch (result.type) {
          case "completed":
            if (result.session) {
              router.push(
                `/verification/callback?verificationSessionId=${result.session.sessionId}&status=${result.session.status}`,
              );
            }
            break;
          case "cancelled":
            // User cancelled verification - no action needed
            break;
          case "failed":
            console.error("Verification failed:", result.error?.message);
            break;
        }
      };
    };

    initSdk();

    return () => {
      if (sdkRef.current) {
        sdkRef.current.shared.onComplete = undefined;
      }
    };
  }, [router]);

  const handleWorkflowClick = useCallback((workflow: WorkflowConfig) => {
    setSelectedWorkflow(workflow);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedWorkflow(null), 200);
  }, []);

  const handleStartWorkflow = useCallback(
    async (workflow: WorkflowConfig, portraitImage?: string) => {
      if (!sdkRef.current) {
        console.error("SDK not initialized");

        return;
      }

      try {
        const vendorData = `demo-${Date.now()}`;
        const callbackUrl = `${window.location.origin}/verification/callback`;

        const session = await createSession(
          workflow.id,
          vendorData,
          callbackUrl,
          portraitImage,
        );

        if (session?.url) {
          // Close the detail modal first
          handleCloseModal();

          // Start verification with SDK modal
          sdkRef.current.shared.startVerification({
            url: session.url,
            configuration: {
              showCloseButton: false,
              showExitConfirmation: false,
              closeModalOnComplete: true,
            },
          });
        }
      } catch (error) {
        console.error("Failed to start workflow:", error);
      }
    },
    [createSession, handleCloseModal],
  );

  return (
    <div className="section-wrapper">
      <div className="section-container">
        <DemoCenterHeader />

        {/* Workflow cards grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {WORKFLOWS.map((workflow, index) => (
            <WorkflowCard
              key={workflow.id}
              index={index}
              workflow={workflow}
              onClick={() => handleWorkflowClick(workflow)}
            />
          ))}
        </div>

        {/* Workflow detail modal */}
        <WorkflowDetailModal
          isLoading={isLoading}
          isOpen={isModalOpen}
          workflow={selectedWorkflow}
          onClose={handleCloseModal}
          onStartWorkflow={handleStartWorkflow}
        />
      </div>
    </div>
  );
}
