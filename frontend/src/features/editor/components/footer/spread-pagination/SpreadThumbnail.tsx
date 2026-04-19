import type { CSSProperties } from "react";
import type {
  AlbumPage,
  LayoutTemplate,
  PhotoSlot,
} from "../../../types/editor";
import {
  getRenderablePageSlots,
  getSpreadLayoutSource,
} from "../../../utils/spreadLayout";

/**
 * SpreadThumbnail — 見開きサムネイル
 *
 * 1つの見開きプレビューを描画し、
 * レイアウトスロットの配置とアクティブ状態を表現する。
 */

interface SpreadThumbnailProps {
  leftPage: number | null;
  rightPage: number | null;
  spreadIndex: number;
  pages: AlbumPage[];
  layouts: LayoutTemplate[];
  isActive: boolean;
  onClick: () => void;
}

function getSlotPreviewStyle(slot: PhotoSlot): CSSProperties {
  // slot の座標は 0..1 の相対値なので、サムネイル用に % へ変換する。
  return {
    position: "absolute",
    left: `${slot.x * 100}%`,
    top: `${slot.y * 100}%`,
    width: `${slot.width * 100}%`,
    height: `${slot.height * 100}%`,
    background: "rgba(0,0,0,0.1)",
    borderRadius: slot.borderRadius
      ? `${Math.min(slot.borderRadius, 50)}%`
      : undefined,
  };
}

function ThumbnailPageHalf({ slots }: { slots: PhotoSlot[] }) {
  return (
    <div className="editor-pagination__page-half">
      {/* 片ページ内に収まるスロット枠だけを簡易表示する */}
      {slots.map((slot) => (
        <div key={slot.id} style={getSlotPreviewStyle(slot)} />
      ))}
    </div>
  );
}

export default function SpreadThumbnail({
  leftPage,
  rightPage,
  spreadIndex,
  pages,
  layouts,
  isActive,
  onClick,
}: SpreadThumbnailProps) {
  // `leftPage` / `rightPage` は pages 配列の index。表紙や最終ページでは null になりうる。
  const leftPageData = leftPage !== null ? pages[leftPage] ?? null : null;
  const rightPageData = rightPage !== null ? pages[rightPage] ?? null : null;

  // 両ページが同じ「見開き」レイアウトを共有している場合だけ、
  // 1つの見開きレイアウトとして左右を切り出すための元データを作る。
  const spreadLayoutSource = getSpreadLayoutSource(
    leftPageData,
    rightPageData,
    layouts,
  );

  // 通常ページならそのまま slots を使い、
  // 見開きレイアウトなら左半分 / 右半分に切り出した slots を返す。
  const leftSlots = getRenderablePageSlots(
    leftPageData,
    "left",
    layouts,
    spreadLayoutSource,
  );
  const rightSlots = getRenderablePageSlots(
    rightPageData,
    "right",
    layouts,
    spreadLayoutSource,
  );

  return (
    <div
      className={`editor-pagination__page ${isActive ? "editor-pagination__page--active" : ""}`}
      onClick={onClick}
    >
      {/* 1つの見開きを「左ページ」「右ページ」の 2 カラムで表現する */}
      <ThumbnailPageHalf slots={leftSlots} />
      <ThumbnailPageHalf slots={rightSlots} />
      <span className="editor-pagination__page-num">
        {/* 先頭の見開きだけは番号ではなく表紙ラベルを出す */}
        {spreadIndex === 0 ? "表紙" : leftPage ?? ""}
      </span>
    </div>
  );
}
