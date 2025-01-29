let cachedToken: string | null = null;
let cachedTokenExpiry: number | null = null;

import { BASE_URL } from "@/lib/auth-service";

const DIDIT_CLIENT_ID = process.env.NEXT_PUBLIC_DIDIT_CLIENT_ID || "";
const DIDIT_CLIENT_SECRET = process.env.DIDIT_CLIENT_SECRET || "";

export async function getClientToken() {
  if (cachedToken && cachedTokenExpiry && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  const base64Credentials = Buffer.from(
    `${DIDIT_CLIENT_ID}:${DIDIT_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await fetch(`${BASE_URL}/auth/v2/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64Credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch client token");
  }

  const tokenData = await response.json();

  cachedToken = tokenData.access_token;
  cachedTokenExpiry = Date.now() + 4 * 60 * 1000; // 4 minutes expiry

  return cachedToken;
}
