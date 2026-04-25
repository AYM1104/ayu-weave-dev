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

/**
 * ログイン処理の入り口となるAPIルート (/auth/login)
 * ユーザーがログインボタンを押した時に呼ばれ、必要なセキュリティパラメータ(PKCE, state)を
 * 発行・保存した上で、Cognito（認証サーバー）のログイン画面へリダイレクトさせます。
 */

export async function GET(request: NextRequest) {

  // 1. stateの生成
  // - state: CSRF攻撃を防ぐための合言葉（ランダム文字列）
  const state = createOAuthState();

  // 2. PKCEのペアを生成
  // - codeVerifier: 後で答え合わせに使う「秘密の答え」
  // - codeChallenge: 今回Cognitoに渡す「ハッシュ化された問題文」
  const { codeChallenge, codeVerifier } = createPkcePair();
  
  // 3. リダイレクト先URL（ログイン後に遷移先に戻るためのURL）を取得
  const returnTo = normalizeReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
  );
  
  // 4. Cognitoの認可エンドポイントURLを生成（ここで上記で作ったセキュリティパラメータを含める）
  const authorizeUrl = buildCognitoAuthorizeUrl({
    codeChallenge,
    state,
  });

  // 5. Cognitoへのリダイレクト
  const response = NextResponse.redirect(authorizeUrl, {
    status: 302,  // 302 Found: 一時的にリダイレクト
  });

  // 6. ログイン状態を維持するためのCookieに値をセット
  const cookieOptions = getAuthFlowCookieOptions();

  // リダイレクトの指示にCookieをくっつける
  response.cookies.set(AUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(AUTH_CODE_VERIFIER_COOKIE, codeVerifier, cookieOptions);
  response.cookies.set(AUTH_RETURN_TO_COOKIE, returnTo, cookieOptions);

  // 7. レスポンスを返す
  return response;
}
