"use client";

import { useState } from "react";
import { ArrowRight, Fingerprint, Upload, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";
const IBETA_WORKFLOW_ID = isStaging
  ? "4110eaa9-3f0d-4fd5-bf7e-90a8c8a8d565"
  : "36aa1546-d69f-4f33-b111-ce23615fde49";

export default function IBetaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portraitBase64, setPortraitBase64] = useState<string | null>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setPortraitError("Please select an image file.");
      setPortraitBase64(null);

      return;
    }
    if (file.size > 1024 * 1024) {
      setPortraitError("File too large. Max size is 1MB.");
      setPortraitBase64(null);

      return;
    }
    setPortraitError(null);
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;

      setPortraitBase64(base64);
    };
    reader.onerror = () => {
      setPortraitError("Failed to read file. Please try again.");
      setPortraitBase64(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePortraitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) processFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];

    if (file) processFile(file);
  };

  const handleStartLiveness = async () => {
    if (!portraitBase64) {
      setError("Please upload a selfie before starting.");

      return;
    }

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
          portrait_image: portraitBase64,
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
            <Fingerprint className="w-12 h-12 text-gray-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            iBeta Biometric Verification
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Full system with 1:1 matching and active liveness. Upload a
            reference selfie, then verify your identity.
          </p>
        </div>

        {/* Portrait Upload Section */}
        <div className="rounded-2xl border border-gray-200 p-5 bg-white text-left space-y-3">
          <div className="text-sm font-medium text-gray-900">
            Step 1: Upload Reference Selfie
          </div>
          <div className="text-xs text-gray-500">
            Upload a clear selfie (max 1MB). This will be matched against the
            live capture.
          </div>
          <div
            className="flex items-center gap-3"
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <label className="flex-1 cursor-pointer">
              <div
                className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 px-4 transition ${
                  isDragging
                    ? "border-[#2667ff] bg-blue-50"
                    : portraitBase64
                      ? "border-green-300 bg-green-50/50"
                      : "border-gray-300 hover:border-[#2667ff] hover:bg-blue-50/50"
                }`}
              >
                {portraitBase64 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Image attached</span>
                  </div>
                ) : isDragging ? (
                  <span className="text-sm text-[#2667ff] font-medium">
                    Drop image here
                  </span>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Drag & drop or click to upload
                    </span>
                  </div>
                )}
              </div>
              <input
                accept="image/*"
                className="hidden"
                type="file"
                onChange={handlePortraitChange}
              />
            </label>
          </div>
          {portraitError && (
            <div className="text-xs text-red-600">{portraitError}</div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <Button
          className="w-full h-14 rounded-full bg-[#2667ff] hover:bg-[#2667ff]/90 text-base font-medium"
          disabled={isLoading || !portraitBase64}
          onClick={handleStartLiveness}
        >
          {isLoading ? (
            "Starting..."
          ) : (
            <>
              <span>Start Biometric Authentication</span>
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
