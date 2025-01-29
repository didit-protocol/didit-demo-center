import { useState } from "react";

export interface VerificationSession {
  session_id: string;
  session_token: string;
  url: string;
}

export interface VerificationDecision {
  session_id: string;
  session_number: number;
  session_url: string;
  status: string;
  vendor_data: string;
  callback: string;
  features: string;
  kyc?: {
    status: string;
    ocr_status: string;
    epassport_status: string;
    document_type: string;
    document_number: string;
    personal_number: string;
    portrait_image: string | null;
    front_image: string | null;
    front_video: string | null;
    back_image: string | null;
    back_video: string | null;
    full_front_image: string | null;
    full_back_image: string | null;
    date_of_birth: string;
    expiration_date: string;
    date_of_issue: string;
    issuing_state: string;
    issuing_state_name: string;
    first_name: string;
    last_name: string;
    full_name: string;
    gender: string;
    address: string;
    formatted_address: string;
    is_nfc_verified: boolean;
    parsed_address: any | null;
    place_of_birth: string;
    marital_status: string;
    nationality: string;
    created_at: string;
  };
  aml?: {
    status: string;
    total_hits: number;
    score: number;
    hits: Array<{
      id: string;
      match: boolean;
      score: number;
      target: boolean;
      caption: string;
      datasets: string[];
      features: Record<string, number>;
      last_seen: string;
      first_seen: string;
      properties: {
        name: string[];
        alias?: string[];
        notes?: string[];
        gender?: string[];
        topics?: string[];
        position?: string[];
      };
      last_change: string;
    }>;
  };
  face?: {
    status: string;
    face_match_status: string;
    liveness_status: string;
    face_match_similarity: number;
    liveness_confidence: number;
    source_image: string;
    target_image: string;
    video_url: string;
  };
  location?: {
    status: string;
    device_brand: string;
    device_model: string;
    browser_family: string;
    os_family: string;
    platform: string;
    ip_country: string;
    ip_country_code: string;
    ip_state: string;
    ip_city: string;
    latitude: number;
    longitude: number;
    ip_address: string;
    isp: string | null;
    organization: string | null;
    is_vpn_or_tor: boolean;
    is_data_center: boolean;
    time_zone: string;
    time_zone_offset: string;
    document_location: {
      latitude: number;
      longitude: number;
    };
    ip_location: {
      latitude: number;
      longitude: number;
    };
    distance_from_document_to_ip_km: {
      distance: number;
      direction: string;
    };
  };
  warnings?: Array<{
    feature: string;
    risk: string;
    additional_data: any | null;
    log_type: string;
    short_description: string;
    long_description: string;
  }>;
  reviews?: Array<{
    user: string;
    new_status: string;
    comment: string;
    created_at: string;
  }>;
  extra_images: any[];
  created_at: string;
}

export function useVerification() {
  const [sessionData, setSessionData] = useState<VerificationSession | null>(
    null
  );
  const [decisionData, setDecisionData] = useState<VerificationDecision | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = async (
    features: string,
    callback: string,
    vendor_data: string
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
          features,
          callback,
          vendor_data,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create verification session"
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
