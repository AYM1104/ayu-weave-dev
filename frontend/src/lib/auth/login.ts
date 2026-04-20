import { createHash, randomBytes } from "node:crypto";

export const AUTH_CODE_VERIFIER_COOKIE = "weave_oauth_code_verifier";
export const AUTH_RETURN_TO_COOKIE = "weave_oauth_return_to";
export const AUTH_STATE_COOKIE = "weave_oauth_state";
export const AUTH_FLOW_COOKIE_PATH = "/auth";
export const AUTH_FLOW_COOKIE_MAX_AGE_SECONDS = 60 * 10;
export const DEFAULT_RETURN_TO = "/dashboard";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required auth environment variable: ${name}`);
  }

  return value;
}

function toBase64Url(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function isSafeReturnToPath(pathname: string) {
  return pathname.startsWith("/") && !pathname.startsWith("//");
}

export function normalizeReturnTo(returnTo: string | null | undefined) {
  if (!returnTo) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const normalized = new URL(returnTo, "http://weave.local");
    const normalizedPath = `${normalized.pathname}${normalized.search}${normalized.hash}`;

    if (!isSafeReturnToPath(normalizedPath)) {
      return DEFAULT_RETURN_TO;
    }

    return normalizedPath;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

export function createOAuthState() {
  return toBase64Url(randomBytes(32));
}

export function createPkcePair() {
  const codeVerifier = toBase64Url(randomBytes(32));
  const codeChallenge = toBase64Url(
    createHash("sha256").update(codeVerifier).digest(),
  );

  return {
    codeVerifier,
    codeChallenge,
  };
}

export function getAuthFlowCookieOptions() {
  return {
    httpOnly: true,
    maxAge: AUTH_FLOW_COOKIE_MAX_AGE_SECONDS,
    path: AUTH_FLOW_COOKIE_PATH,
    sameSite: "lax" as const,
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.AUTH_CALLBACK_URL?.startsWith("https://") === true,
  };
}

export function buildCognitoAuthorizeUrl({
  codeChallenge,
  state,
}: {
  codeChallenge: string;
  state: string;
}) {
  const authorizeUrl = new URL("/oauth2/authorize", requireEnv("COGNITO_DOMAIN"));

  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", requireEnv("COGNITO_APP_CLIENT_ID"));
  authorizeUrl.searchParams.set(
    "redirect_uri",
    requireEnv("AUTH_CALLBACK_URL"),
  );
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set(
    "identity_provider",
    requireEnv("COGNITO_IDENTITY_PROVIDER"),
  );

  return authorizeUrl;
}
