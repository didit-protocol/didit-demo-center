const DIDIT_CLIENT_ID = process.env.NEXT_PUBLIC_DIDIT_CLIENT_ID || "";
const DIDIT_AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_IS_STAGING === "true"
    ? "https://auth.staging.didit.me/"
    : "https://auth.didit.me/";
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_REDIRECT_URI ||
  (process.env.NEXT_PUBLIC_IS_STAGING === "true"
    ? "https://demos.staging.didit.me/"
    : "https://demos.didit.me/");

export const BASE_URL =
  process.env.NEXT_PUBLIC_IS_STAGING === "true"
    ? "https://apx.staging.didit.me"
    : "https://apx.didit.me";

export const VERIFICATION_BASE_URL =
  process.env.NEXT_PUBLIC_IS_STAGING === "true"
    ? "https://verification.staging.didit.me"
    : "https://verification.didit.me";

export const AuthService = {
  generateRandomString: () =>
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2),

  getAuthorizeUrl: (selectedScopes: string[]) => {
    const scopes = [...selectedScopes];

    if (!scopes.includes("openid")) {
      scopes.push("openid");
    }

    const params = new URLSearchParams({
      client_id: DIDIT_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: scopes.join(" "),
      state: AuthService.generateRandomString(),
      nonce: AuthService.generateRandomString(),
    });

    return `${DIDIT_AUTH_BASE_URL}?${params.toString()}`;
  },

  getSelectedScopes: (scopeItems: Record<string, boolean>): string[] => {
    return Object.entries(scopeItems)
      .filter(([_, isSelected]) => isSelected)
      .map(([item]) => item);
  },
};
