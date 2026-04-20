"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandHeader } from "@/shared/BrandHeader";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GoogleSignInButton } from "@/shared/GoogleSignInButton";
import styles from "./page.module.css";

type LoginMode = "signup" | "login";

function getLoginMode(mode: string | null): LoginMode {
  return mode === "login" ? "login" : "signup";
}

function buildAuthLoginHref(returnTo: string | null) {
  const params = new URLSearchParams();

  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  const query = params.toString();
  return query ? `/auth/login?${query}` : "/auth/login";
}

function buildModeHref(mode: LoginMode, returnTo: string | null) {
  const params = new URLSearchParams();

  if (mode === "login") {
    params.set("mode", "login");
  }

  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

type LoginPageShellProps = {
  alternateLinkLabel: string;
  alternateMessagePrefix: string;
  alternateMessageSuffix: string;
  alternateModeHref: string;
  heading: string;
  isLoading: boolean;
  onContinue: () => void;
};

function LoginPageShell({
  alternateLinkLabel,
  alternateMessagePrefix,
  alternateMessageSuffix,
  alternateModeHref,
  heading,
  isLoading,
  onContinue,
}: LoginPageShellProps) {
  return (
    <main className={styles.page}>
      <BrandHeader />

      <div className={styles.shell}>
        <section className={styles.heroSection} aria-hidden="true">
          <div className={styles.heroImage}>
            <Image
              src="/images/login-image-sample.jpg"
              alt=""
              fill
              priority
              sizes="(max-width: 860px) 100vw, (max-width: 1100px) 45vw, 640px"
              style={{ objectFit: "cover" }}
            />
          </div>
        </section>

        <section className={styles.panelSection}>
          <div className={styles.panel}>
            <h1 className={styles.heading}>{heading}</h1>

            <div className={styles.googleButtonWrapper}>
              <GoogleSignInButton
                onClick={onContinue}
                isLoading={isLoading}
                label="Googleで続行"
                fullWidth
                size="large"
              />
            </div>

            <p className={styles.legal}>
              登録することで当社の{" "}
              <Link href="/terms" className={styles.inlineLink}>
                利用規約
              </Link>
              ・
              <Link href="/privacy" className={styles.inlineLink}>
                プライバシーポリシー
              </Link>
              に同意いただいたものとみなします
            </p>

            <p className={styles.alternateMessage}>
              {alternateMessagePrefix}{" "}
              <Link href={alternateModeHref} className={styles.inlineLink}>
                {alternateLinkLabel}
              </Link>{" "}
              {alternateMessageSuffix}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const mode = getLoginMode(searchParams.get("mode"));
  const returnTo = searchParams.get("returnTo");
  const isLoginMode = mode === "login";

  const authLoginHref = buildAuthLoginHref(returnTo);
  const alternateModeHref = buildModeHref(
    isLoginMode ? "signup" : "login",
    returnTo,
  );

  const heading = isLoginMode
    ? "すでに登録済みの方はログインしてください"
    : "アルバム作成には新規登録が必要です";
  const alternateMessagePrefix = isLoginMode
    ? "はじめてご利用の方は"
    : "すでに登録済みの方は";
  const alternateMessageSuffix = "してください";
  const alternateLinkLabel = isLoginMode ? "新規登録" : "ログイン";

  const handleContinue = () => {
    setIsLoading(true);
    window.location.assign(authLoginHref);
  };

  return (
    <LoginPageShell
      alternateLinkLabel={alternateLinkLabel}
      alternateMessagePrefix={alternateMessagePrefix}
      alternateMessageSuffix={alternateMessageSuffix}
      alternateModeHref={alternateModeHref}
      heading={heading}
      isLoading={isLoading}
      onContinue={handleContinue}
    />
  );
}

function LoginPageFallback() {
  return (
    <LoginPageShell
      alternateLinkLabel="ログイン"
      alternateMessagePrefix="すでに登録済みの方は"
      alternateMessageSuffix="してください"
      alternateModeHref="/login?mode=login"
      heading="アルバム作成には新規登録が必要です"
      isLoading={false}
      onContinue={() => {
        window.location.assign("/auth/login");
      }}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
