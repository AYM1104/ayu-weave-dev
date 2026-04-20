import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_CODE_VERIFIER_COOKIE,
  AUTH_RETURN_TO_COOKIE,
  AUTH_STATE_COOKIE,
  buildCognitoAuthorizeUrl,
  createOAuthState,
  createPkcePair,
  getAuthFlowCookieOptions,
  normalizeReturnTo,
} from "@/lib/auth/login";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const state = createOAuthState();
  const { codeChallenge, codeVerifier } = createPkcePair();
  const returnTo = normalizeReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
  );
  const authorizeUrl = buildCognitoAuthorizeUrl({
    codeChallenge,
    state,
  });

  const response = NextResponse.redirect(authorizeUrl, {
    status: 302,
  });
  const cookieOptions = getAuthFlowCookieOptions();

  response.cookies.set(AUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(AUTH_CODE_VERIFIER_COOKIE, codeVerifier, cookieOptions);
  response.cookies.set(AUTH_RETURN_TO_COOKIE, returnTo, cookieOptions);

  return response;
}
