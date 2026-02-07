"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { DemoCenterHeader } from "@/components/home/header";
import { WorkflowCard } from "@/components/home/workflow-card";
import { WorkflowDetailModal } from "@/components/home/workflow-detail-modal";
import { DiditCaptchaDemo } from "@/components/home/didit-captcha-demo";
import { WORKFLOWS, type WorkflowConfig } from "@/lib/workflows";
import { useVerification } from "@/app/hooks/useVerification";

export default function Home() {
  const router = useRouter();
  const { createSession, isLoading } = useVerification();

  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCaptchaDemo, setShowCaptchaDemo] = useState(false);

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
      if (workflow.isCaptcha) {
        handleCloseModal();
        setShowCaptchaDemo(true);
        return;
      }

      try {
        const callbackUrl = `${window.location.origin}/verification/callback`;
        const vendorData = `demo-${Date.now()}`;

        const session = await createSession(
          workflow.id,
          vendorData,
          callbackUrl,
          portraitImage,
        );
        if (session?.url) {
          router.push(session.url);
        }
      } catch (error) {
        console.error("Failed to start workflow:", error);
      }
    },
    [createSession, router, handleCloseModal],
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
              workflow={workflow}
              onClick={() => handleWorkflowClick(workflow)}
              index={index}
            />
          ))}
        </div>

        {/* Workflow detail modal */}
        <WorkflowDetailModal
          workflow={selectedWorkflow}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onStartWorkflow={handleStartWorkflow}
          isLoading={isLoading}
        />

        {/* CAPTCHA demo modal */}
        <DiditCaptchaDemo
          isOpen={showCaptchaDemo}
          onClose={() => setShowCaptchaDemo(false)}
        />
      </div>
    </div>
  );
}
