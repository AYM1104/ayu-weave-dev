"use client";

/**
 * SpreadView — 見開きページビュー
 *
 * 左ページ + 綴じ（スパイン） + 右ページ の見開き構成。
 * 各ページ内にはレイアウトテンプレートのスロットを描画する。
 */

import { useEditorStore } from "../../store/editorStore";
import type { AlbumPage } from "../../types/editor";

/** ページ1枚分の描画 */
function PageView({
  page,
  side,
  width,
  height,
}: {
  page: AlbumPage | null;
  side: "left" | "right";
  width: number;
  height: number;
}) {
  if (!page) {
    return (
      <div
        className={`editor-spread__page editor-spread__page--${side}`}
        style={{ width, height, background: "white" }}
      />
    );
  }

  return (
    <div
      className={`editor-spread__page editor-spread__page--${side}`}
      style={{ width, height, position: "relative" }}
    >
      {/* スロットの描画 */}
      {page.slots.map((slot) => (
        <div
          key={slot.id}
          className="editor-slot"
          style={{
            left: `${slot.x * 100}%`,
            top: `${slot.y * 100}%`,
            width: `${slot.width * 100}%`,
            height: `${slot.height * 100}%`,
            borderRadius: slot.borderRadius
              ? `${slot.borderRadius}px`
              : undefined,
          }}
        >
          {slot.photoId ? (
            <img
              className="editor-slot__image"
              src={`https://picsum.photos/seed/${slot.photoId}/400/400`}
              alt=""
            />
          ) : null}
        </div>
      ))}

      {/* ページレイアウト比率ラベル */}
      <span className="editor-spread__ratio-label">
        {page.layoutId.startsWith("spread") ? "4:3" : "1:1"}
      </span>
    </div>
  );
}

interface SpreadViewProps {
  zoomLevel: number;
}

export default function SpreadView({ zoomLevel }: SpreadViewProps) {
  const pages = useEditorStore((s) => s.pages);
  const currentSpreadIndex = useEditorStore((s) => s.currentSpreadIndex);

  // 見開きインデックスからページを取得
  // spread 0 = 表紙（1ページのみ）, spread 1 = page1+page2, ...
  let leftPage: AlbumPage | null = null;
  let rightPage: AlbumPage | null = null;

  if (currentSpreadIndex === 0) {
    // 表紙
    leftPage = null;
    rightPage = pages[0] ?? null;
  } else {
    const leftIndex = currentSpreadIndex * 2 - 1;
    const rightIndex = currentSpreadIndex * 2;
    leftPage = pages[leftIndex] ?? null;
    rightPage = pages[rightIndex] ?? null;
  }

  // zoom レベルに応じたページサイズ
  const scale = zoomLevel / 100;
  const basePageWidth = 439;
  const basePageHeight = 620;
  const pageWidth = basePageWidth * scale;
  const pageHeight = basePageHeight * scale;

  return (
    <div className="editor-spread" style={{ transform: `scale(1)` }}>
      {/* 左ページ */}
      {leftPage && (
        <>
          <PageView
            page={leftPage}
            side="left"
            width={pageWidth}
            height={pageHeight}
          />
          {/* 綴じ（スパイン） */}
          <div className="editor-spread__spine" />
        </>
      )}

      {/* 右ページ */}
      <PageView
        page={rightPage}
        side="right"
        width={pageWidth}
        height={pageHeight}
      />
    </div>
  );
}
