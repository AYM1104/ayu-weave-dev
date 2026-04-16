"use client";

/**
 * PageNavButton — ページナビゲーション矢印ボタン
 *
 * キャンバスエリアの前後ページ送りに使う共通ボタン。
 */

import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";

interface PageNavButtonProps {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}

export default function PageNavButton({
  direction,
  onClick,
  disabled,
}: PageNavButtonProps) {
  const isPrev = direction === "prev";

  return (
    <button
      className={`editor-page-nav editor-page-nav--${direction}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "前のページ" : "次のページ"}
    >
      {isPrev ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
}
