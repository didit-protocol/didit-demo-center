"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  Check,
  ListChecks,
  Target,
  Loader2,
  Upload,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkflowConfig } from "@/lib/workflows";

interface WorkflowDetailModalProps {
  workflow: WorkflowConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onStartWorkflow: (workflow: WorkflowConfig, portraitImage?: string) => void;
  isLoading?: boolean;
}

export function WorkflowDetailModal({
  workflow,
  isOpen,
  onClose,
  onStartWorkflow,
  isLoading,
}: WorkflowDetailModalProps) {
  const [portraitImage, setPortraitImage] = useState<string | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPortraitPreview(previewUrl);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64Data = base64.split(",")[1];
        setPortraitImage(base64Data);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setPortraitImage(null);
    setPortraitPreview(null);
  }, []);

  const handleClose = useCallback(() => {
    setPortraitImage(null);
    setPortraitPreview(null);
    onClose();
  }, [onClose]);

  const handleStartClick = useCallback(() => {
    if (workflow) {
      onStartWorkflow(workflow, portraitImage || undefined);
    }
  }, [workflow, portraitImage, onStartWorkflow]);

  if (!workflow) return null;

  const IconComponent = workflow.icon;
  const needsPortrait = workflow.requiresPortrait;
  const canStart = !needsPortrait || portraitImage;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#1a1a1a]/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-4 z-50 flex items-center justify-center sm:inset-8"
          >
            <div
              className="relative w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-[#f5f5f7] text-[#6e6e73] transition-all hover:bg-[#e5e5e5] hover:text-[#1a1a1a]"
              >
                <X className="size-4" />
              </button>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="border-b border-[#f0f0f0] p-6 sm:p-8">
                  {/* Icon + Title row */}
                  <div className="flex items-center gap-3 pr-10">
                    <div className="icon-container-accent shrink-0">
                      <IconComponent className="size-5 text-white sm:size-6" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-headline text-[#1a1a1a]">
                      {workflow.title}
                    </h2>
                  </div>

                  {/* Description - full width */}
                  <p className="text-body text-[#6e6e73] mt-4">
                    {workflow.longDescription}
                  </p>

                  {/* Stats */}
                  {workflow.stats && workflow.stats.length > 0 && (
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      {workflow.stats.map((stat, i) => (
                        <div key={i} className="stat-card">
                          <div className="stat-value">{stat.value}</div>
                          <div className="stat-label">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Portrait Upload Section */}
                  {needsPortrait && (
                    <div className="rounded-xl border-2 border-dashed border-[#2567ff]/30 bg-[#2567ff]/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Upload className="size-4 text-[#2567ff]" />
                        <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
                          Upload Reference Photo
                        </h3>
                        <span className="text-[11px] font-medium text-[#dc3545] bg-[#dc3545]/10 px-2 py-0.5 rounded-full">
                          Required
                        </span>
                      </div>
                      <p className="text-[12px] text-[#6e6e73] mb-4">
                        Upload a photo of yourself. This will be used to match against the live selfie during authentication.
                      </p>

                      {portraitPreview ? (
                        <div className="relative inline-block">
                          <img
                            src={portraitPreview}
                            alt="Portrait preview"
                            className="size-24 rounded-xl object-cover border border-[#e5e5e5]"
                          />
                          <button
                            onClick={handleRemoveImage}
                            className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-[#dc3545] text-white shadow-lg transition-transform hover:scale-110"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-[#e5e5e5] bg-white p-6 transition-all hover:border-[#2567ff] hover:bg-[#2567ff]/5">
                          <div className="flex size-12 items-center justify-center rounded-full bg-[#f5f5f7]">
                            <ImageIcon className="size-5 text-[#6e6e73]" />
                          </div>
                          <span className="text-[13px] font-medium text-[#4b5058]">
                            Click to upload photo
                          </span>
                          <span className="text-[11px] text-[#9da1a1]">
                            JPG, PNG up to 5MB
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {/* How it works */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <ListChecks className="size-4 text-[#2567ff]" />
                      <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
                        How It Works
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {workflow.steps.map((step, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-xl bg-[#f5f5f7] p-3 sm:p-4"
                        >
                          <div className="step-number">{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-semibold text-[#1a1a1a] sm:text-[14px]">
                              {step.title}
                            </h4>
                            <p className="text-[12px] text-[#6e6e73] sm:text-[13px] mt-0.5">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="border-t border-[#f0f0f0] pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Check className="size-4 text-[#2567ff]" />
                      <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
                        Features Included
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workflow.features.map((feature) => (
                        <div
                          key={feature}
                          className="feature-pill feature-pill-selected"
                        >
                          <div className="flex size-4 items-center justify-center rounded-full bg-[#2567ff]">
                            <Check className="size-2.5 text-white" strokeWidth={3} />
                          </div>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Best for */}
                  <div className="border-t border-[#f0f0f0] pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="size-4 text-[#2567ff]" />
                      <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
                        Best For
                      </h3>
                    </div>
                    <p className="text-body-small text-[#4b5058]">
                      {workflow.bestFor}
                    </p>
                    {workflow.useCases && workflow.useCases.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {workflow.useCases.map((useCase, i) => {
                          const UseCaseIcon = useCase.icon;
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-[12px] font-medium text-[#4b5058]"
                            >
                              <UseCaseIcon className="size-3.5 text-[#6e6e73]" />
                              {useCase.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="sticky bottom-0 border-t border-[#f0f0f0] bg-white p-4 sm:p-6">
                  <button
                    onClick={handleStartClick}
                    disabled={isLoading || !canStart}
                    className={cn(
                      "btn-primary w-full flex items-center justify-center gap-2",
                      (isLoading || !canStart) && "opacity-70 pointer-events-none"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Starting verification...
                      </>
                    ) : !canStart ? (
                      <>
                        <Upload className="size-4" />
                        Upload photo to continue
                      </>
                    ) : (
                      <>
                        Try {workflow.shortTitle} Now
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
