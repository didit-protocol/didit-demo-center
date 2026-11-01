import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { BASE_URL } from "@/lib/auth-service";

interface SessionData {
  session_id: string;
  session_token: string;
  url: string;
}

export function useAuth() {
  const [code, setCode] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userData, setUserData] = useState<any>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [decisionData, setDecisionData] = useState<any>(null);

  const searchParams = useSearchParams();

  // Handle code from URL and localStorage
  useEffect(() => {
    const urlCode = searchParams.get("code");

    if (urlCode) {
      setCode(urlCode);
      localStorage.setItem("code", urlCode);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedCode = localStorage.getItem("code");

      if (storedCode) {
        setCode(storedCode);
      }
    }
  }, [searchParams]);

  // Handle authentication state
  useEffect(() => {
    const storedAccessToken = localStorage.getItem("accessToken");

    if (storedAccessToken) {
      setIsLoggedIn(true);
      fetchUserData(storedAccessToken);
    } else if (code && !isLoggedIn) {
      exchangeCodeForAccessToken();
    }
  }, [isLoggedIn, code]);

  const exchangeCodeForAccessToken = async () => {
    if (code && !isLoggedIn) {
      try {
        const response = await fetch(`/api/token?code=${code}`);

        if (response.ok) {
          const data = await response.json();

          localStorage.setItem("accessToken", data.access_token);
          setIsLoggedIn(true);
          localStorage.removeItem("code");
          setCode(null);
        } else {
          console.error("Code Invalid or Expired");
        }
      } catch (error) {
        console.error("Error exchanging code for token:", error);
      }
    }
  };

  const fetchUserData = async (accessToken: string) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/v2/users/retrieve/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        setUserData(data);
      } else {
        console.error("Error fetching user data:", response.statusText);
        localStorage.removeItem("accessToken");
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    localStorage.removeItem("accessToken");
  };

  const createSession = async (selectedScope: string) => {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scope: selectedScope }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const result = await response.json();

      setSessionData(result);
      setSessionStatus(null);
      setDecisionData(null);

      return result;
    } catch (error) {
      console.error("Error creating session:", error);

      return null;
    }
  };

  const checkSessionStatus = async (
    sessionId: string,
    sessionToken: string,
  ) => {
    try {
      const response = await fetch(
        `/api/auth?sessionId=${sessionId}&action=status&sessionToken=${sessionToken}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch session status");
      }

      const statusData = await response.json();

      setSessionStatus(statusData.status);

      // If status is confirmed, get the decision data and stop polling
      if (statusData.status === "confirmed") {
        const decision = await getSessionDecision(sessionId);

        setDecisionData(decision);

        return true;
      }

      // Also stop polling if status is declined or expired
      if (statusData.status === "declined" || statusData.status === "expired") {
        return true;
      }

      // Continue polling for other statuses
      return false;
    } catch (error) {
      console.error("Error checking session status:", error);

      return true; // Stop polling on error
    }
  };

  const getSessionDecision = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/auth?sessionId=${sessionId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch decision data");
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting session decision:", error);

      return null;
    }
  };

  const resetSession = () => {
    setSessionData(null);
    setSessionStatus(null);
    setDecisionData(null);
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let ws: WebSocket | null = null;

    if (sessionData) {
      const wsUrl = new URL(BASE_URL + "/auth/ws/notifications/");

      wsUrl.protocol = wsUrl.protocol.replace("http", "ws");
      wsUrl.searchParams.append("token", sessionData.session_token);

      ws = new WebSocket(wsUrl.toString());

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (
          data.message?.status === "confirmed" ||
          data.message?.status === "declined" ||
          data.message?.status === "expired" ||
          data.message?.status === "retrieved"
        ) {
          const shouldStop = await checkSessionStatus(
            sessionData.session_id,
            sessionData.session_token,
          );

          if (shouldStop) {
            if (ws) ws.close();
            if (intervalId) clearInterval(intervalId);
          }
        }
      };

      checkSessionStatus(sessionData.session_id, sessionData.session_token);

      intervalId = setInterval(async () => {
        const shouldStop = await checkSessionStatus(
          sessionData.session_id,
          sessionData.session_token,
        );

        if (shouldStop) {
          clearInterval(intervalId);
          if (ws) ws.close();
        }
      }, 30000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (ws) ws.close();
    };
  }, [sessionData]);

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  };

  const createSessionWithScope = async (
    scopeItems: Record<string, boolean>,
  ) => {
    if (sessionData || decisionData) {
      resetSession();

      return;
    }

    const selectedScope = Object.entries(scopeItems)
      .filter(([_, isSelected]) => isSelected)
      .map(([item]) => item)
      .join(" ");

    await createSession(selectedScope);
  };

  return {
    isLoggedIn,
    userData,
    setUserData,
    logout,
    sessionData,
    sessionStatus,
    decisionData,
    createSessionWithScope,
    resetSession,
    isMobileDevice,
  };
}
