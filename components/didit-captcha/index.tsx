"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

// Local storage keys
const STORAGE_KEY_PREFIX = "didit-captcha-verified-";
const SESSION_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

type VerifiedSession = {
  sessionId: string;
  email: string;
  verifiedAt: number;
  status: string;
};

type DiditCaptchaProps = {
  email: string | null;
  metadata?: Record<string, unknown>;
  onVerified: (result: {
    sessionId: string;
    email: string | null;
    isFromCache: boolean;
  }) => void;
  disabled?: boolean;
  className?: string;
};

// Helper function to get stored session
const getStoredSession = (userEmail: string): VerifiedSession | null => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userEmail}`);

    if (!stored) return null;

    const session: VerifiedSession = JSON.parse(stored);

    // Check if session has expired
    if (Date.now() - session.verifiedAt > SESSION_EXPIRY_MS) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userEmail}`);

      return null;
    }

    return session;
  } catch {
    return null;
  }
};

// Helper function to store verified session
const storeVerifiedSession = (
  userEmail: string,
  sessId: string,
  status: string,
) => {
  const session: VerifiedSession = {
    sessionId: sessId,
    email: userEmail,
    verifiedAt: Date.now(),
    status,
  };

  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${userEmail}`,
    JSON.stringify(session),
  );
};

export const DiditCaptcha: React.FC<DiditCaptchaProps> = ({
  email,
  metadata,
  onVerified,
  disabled = false,
  className,
}) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const verifiedSessionRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle verification complete
  const handleVerificationComplete = useCallback(
    (sessId: string, status: string) => {
      // Prevent duplicate processing
      if (verifiedSessionRef.current === sessId) return;

      if (status === "Approved") {
        verifiedSessionRef.current = sessId;
        setShowSuccess(true);
        setIsVerified(true);
        setError(null);

        // Clear polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        // Store in localStorage for 48-hour persistence
        if (email) {
          storeVerifiedSession(email, sessId, status);
        }

        // Close modal after showing success animation
        setTimeout(() => {
          setIsModalOpen(false);
          setSessionUrl(null);
          setIsLoading(false);
          setShowSuccess(false);
          onVerified({ sessionId: sessId, email, isFromCache: false });
        }, 1500);
      } else if (status === "Declined" || status === "Rejected") {
        setError("Verification was declined. Please try again.");
        setIsVerified(false);
      }
    },
    [email, onVerified],
  );

  // Check for existing verified session on mount
  useEffect(() => {
    if (email) {
      const storedSession = getStoredSession(email);

      if (storedSession && storedSession.status === "Approved") {
        setIsVerified(true);
        verifiedSessionRef.current = storedSession.sessionId;
        onVerified({
          sessionId: storedSession.sessionId,
          email: storedSession.email,
          isFromCache: true,
        });
      }
    }
  }, [email, onVerified]);

  // Handle messages from callback page (fallback for redirect flow)
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("didit-captcha-callback-") && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);

          if (data.type === "DIDIT_VERIFICATION_SUCCESS" && data.sessionId) {
            if (sessionId === data.sessionId || !sessionId) {
              handleVerificationComplete(data.sessionId, data.status);
              localStorage.removeItem(event.key);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    };

    // Also poll localStorage directly (some browsers don't fire storage events in same tab)
    let localPollInterval: NodeJS.Timeout | null = null;

    if (sessionId && isModalOpen) {
      localPollInterval = setInterval(() => {
        const storageKey = `didit-captcha-callback-${sessionId}`;
        const stored = localStorage.getItem(storageKey);

        if (stored) {
          try {
            const data = JSON.parse(stored);

            if (data.type === "DIDIT_VERIFICATION_SUCCESS") {
              handleVerificationComplete(data.sessionId, data.status);
              localStorage.removeItem(storageKey);
            }
          } catch {
            // Ignore
          }
        }
      }, 1000);
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (localPollInterval) clearInterval(localPollInterval);
    };
  }, [sessionId, isModalOpen, handleVerificationComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Start API polling for status updates
  const startPolling = useCallback(
    (sessId: string) => {
      // Clear existing polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      const poll = async () => {
        if (verifiedSessionRef.current) return;

        try {
          const res = await fetch(
            `/api/didit-captcha/verify?sessionId=${encodeURIComponent(sessId)}`,
          );
          const data = await res.json();

          if (data.verified && data.status === "Approved") {
            handleVerificationComplete(sessId, "Approved");
          } else if (data.status === "Declined" || data.status === "Rejected") {
            handleVerificationComplete(sessId, data.status);
          }
        } catch {
          // Ignore errors, will retry
        }
      };

      // Poll every 3 seconds
      pollIntervalRef.current = setInterval(poll, 3000);
    },
    [handleVerificationComplete],
  );

  const createSession = async () => {
    if (!email) {
      setError("Enter your email first.");

      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const callbackUrl = `${window.location.origin}/didit-captcha/callback`;

      const res = await fetch("/api/didit-captcha/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          callback: callbackUrl,
          metadata,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start verification");
      }

      setSessionId(data.sessionId);
      setSessionUrl(data.sessionUrl);

      // Start polling for status updates
      startPolling(data.sessionId);
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Could not start verification";

      console.error(e);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleCheckboxClick = () => {
    if (isVerified || disabled) return;
    if (!email) {
      setError("Enter your email first.");

      return;
    }

    // Check for existing verified session
    const storedSession = getStoredSession(email);

    if (storedSession && storedSession.status === "Approved") {
      setIsVerified(true);
      verifiedSessionRef.current = storedSession.sessionId;
      onVerified({
        sessionId: storedSession.sessionId,
        email: storedSession.email,
        isFromCache: true,
      });

      return;
    }

    // Open modal and start verification
    setIsModalOpen(true);
    setError(null);
    createSession();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsLoading(false);
    setSessionUrl(null);
    setSessionId(null);
    setError(null);
    setShowSuccess(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  return (
    <>
      {/* Captcha Card - Minimal Google-style design */}
      <div
        className={cn(
          "group relative flex w-full max-w-[320px] items-center justify-between rounded-xl border bg-white p-3.5 shadow-soft transition-all duration-200",
          isVerified
            ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-white"
            : "border-gray-200 hover:border-gray-300 hover:shadow-card",
          disabled && "cursor-not-allowed opacity-50",
          !email && !isVerified && "opacity-60",
          className,
        )}
      >
        {/* Checkbox + Label */}
        <button
          className="flex items-center gap-3 focus:outline-none disabled:cursor-not-allowed"
          disabled={isLoading || !email || isVerified || disabled}
          type="button"
          onClick={handleCheckboxClick}
        >
          {/* Checkbox */}
          <div
            className={cn(
              "relative flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
              isVerified
                ? "bg-emerald-500"
                : isLoading
                  ? "border-2 border-gray-300"
                  : "border-2 border-gray-300 group-hover:border-accent",
            )}
          >
            <AnimatePresence mode="wait">
              {isVerified ? (
                <motion.div
                  key="check"
                  animate={{ scale: 1, rotate: 0 }}
                  initial={{ scale: 0, rotate: -45 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Check className="size-4 text-white" strokeWidth={3} />
                </motion.div>
              ) : isLoading ? (
                <motion.div
                  key="loading"
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                >
                  <Loader2 className="size-4 animate-spin text-accent" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Label */}
          <span
            className={cn(
              "select-none text-sm font-medium",
              isVerified ? "text-emerald-700" : "text-app-black",
            )}
          >
            {isLoading ? "Verifying..." : isVerified ? "Verified" : "I'm human"}
          </span>
        </button>

        {/* Branding */}
        <div className="flex items-center gap-1.5 opacity-70">
          <ShieldCheck className="size-5 text-accent" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold leading-tight text-graphite-gray">
              Didit
            </span>
            <span className="text-[9px] leading-tight text-dusty-gray">
              CAPTCHA
            </span>
          </div>
        </div>
      </div>

      {/* Error message below card */}
      <AnimatePresence>
        {error && !isModalOpen && (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 max-w-[320px] text-[13px] text-red-500"
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: -4 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Modal - Compact and focused */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-2 pb-2 pt-4 backdrop-blur-sm sm:p-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isLoading) closeModal();
            }}
          >
            <motion.div
              animate={{ scale: 1, opacity: 1 }}
              className="relative flex h-[calc(100dvh-32px)] max-h-[700px] w-full max-w-[800px] flex-col overflow-hidden rounded-xl bg-white shadow-elevated sm:h-[calc(100dvh-16px)] sm:max-h-[830px] sm:rounded-2xl"
              exit={{ scale: 0.95, opacity: 0 }}
              initial={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {/* Close button - always visible except during success */}
              {!showSuccess && (
                <button
                  className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/5 text-gray-500 transition-colors hover:bg-black/10 hover:text-gray-700 sm:right-3 sm:top-3 sm:size-8"
                  onClick={closeModal}
                >
                  <X className="size-3.5 sm:size-4" />
                </button>
              )}

              {/* Content */}
              {showSuccess ? (
                // Success state
                <motion.div
                  animate={{ opacity: 1 }}
                  className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 sm:py-16"
                  initial={{ opacity: 0 }}
                >
                  <motion.div
                    animate={{ scale: 1 }}
                    className="flex size-20 items-center justify-center rounded-full bg-emerald-500"
                    initial={{ scale: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                      delay: 0.1,
                    }}
                  >
                    <motion.div
                      animate={{ scale: 1 }}
                      initial={{ scale: 0 }}
                      transition={{
                        delay: 0.3,
                        type: "spring",
                        stiffness: 400,
                      }}
                    >
                      <Check className="size-10 text-white" strokeWidth={3} />
                    </motion.div>
                  </motion.div>
                  <motion.p
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 text-lg font-semibold text-gray-900"
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.4 }}
                  >
                    Verification Complete!
                  </motion.p>
                </motion.div>
              ) : isLoading && !sessionUrl ? (
                // Loading state - centered in modal
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-4 py-8 sm:min-h-[400px] sm:px-8 sm:py-16">
                  <div className="relative">
                    <Loader2 className="size-10 animate-spin text-accent sm:size-12" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-700 sm:mt-4">
                    Preparing verification...
                  </p>
                </div>
              ) : sessionUrl ? (
                // Iframe with verification
                <div className="flex min-h-0 flex-1 flex-col">
                  {/* Compact header */}
                  <div className="border-b bg-gray-50 px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-accent sm:size-8">
                        <ShieldCheck className="size-3.5 text-white sm:size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 sm:text-sm">
                          Quick Liveness Check
                        </p>
                        <p className="text-[10px] text-gray-500 sm:text-xs">
                          Complete to continue
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Iframe - sized to fit content, fills remaining space */}
                  <div className="relative min-h-[340px] w-full flex-1 bg-white sm:min-h-[400px]">
                    <iframe
                      allow="camera; microphone"
                      className="absolute inset-0 size-full border-0"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-modals"
                      src={sessionUrl}
                      title="Didit verification"
                    />
                  </div>

                  {/* Minimal footer with error */}
                  {error && (
                    <div className="border-t bg-amber-50 px-4 py-3">
                      <p className="text-xs text-amber-700">{error}</p>
                    </div>
                  )}
                </div>
              ) : error ? (
                // Error state
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 sm:py-16">
                  <div className="flex size-14 items-center justify-center rounded-full bg-red-100 sm:size-16">
                    <X className="size-6 text-red-500 sm:size-8" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-900 sm:mt-4">
                    Something went wrong
                  </p>
                  <p className="mt-1 text-center text-xs text-gray-500">
                    {error}
                  </p>
                  <button
                    className="mt-5 rounded-xl bg-app-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:mt-6 sm:px-6"
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DiditCaptcha;
