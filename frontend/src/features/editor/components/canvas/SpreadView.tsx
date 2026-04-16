"use client";

/**
 * SpreadView — 見開きページビュー
 *
 * 左ページ + 綴じ（スパイン） + 右ページ の見開き構成。
 * 各ページ内にはレイアウトテンプレートのスロットを描画する。
 */

import { useState, type KeyboardEvent } from "react";
import { useEditorStore } from "../../store/editorStore";
import type { AlbumPage, PhotoSlot } from "../../types/editor";
import {
  getRenderablePageSlots,
  getSpreadLayoutSource,
} from "../../utils/spreadLayout";
import { resolveSelectedPageSide } from "../../utils/pageSelection";

interface RenderableSlot extends PhotoSlot {
  renderKey: string;
  interactionKey: string;
}

/** ページ1枚分の描画 */
function PageView({
  hasPage,
  side,
  width,
  height,
  slots,
  layoutId,
  showRatioLabel,
  isSelected,
  onSelect,
  activeSlotKey,
  onSlotActiveChange,
}: {
  hasPage: boolean;
  side: "left" | "right";
  width: number;
  height: number;
  slots: RenderableSlot[];
  layoutId: string;
  showRatioLabel: boolean;
  isSelected: boolean;
  onSelect: (side: "left" | "right") => void;
  activeSlotKey: string | null;
  onSlotActiveChange: (slotKey: string | null) => void;
}) {
  if (!hasPage) {
    return (
      <div
        className={`editor-spread__page editor-spread__page--${side}`}
        style={{ width, height, background: "white" }}
      />
    );
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(side);
    }
  };

  return (
    <div
      className={`editor-spread__page editor-spread__page--${side} ${isSelected ? "editor-spread__page--selected" : ""}`}
      style={{ width, height, position: "relative" }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={side === "left" ? "左ページを編集対象にする" : "右ページを編集対象にする"}
      onClick={() => onSelect(side)}
      onKeyDown={handleKeyDown}
    >
      {/* スロットの描画 */}
      {slots.map((slot) => (
        <div
          key={slot.renderKey}
          className={`editor-slot ${activeSlotKey === slot.interactionKey ? "editor-slot--active" : ""}`}
          style={{
            left: `${slot.x * 100}%`,
            top: `${slot.y * 100}%`,
            width: `${slot.width * 100}%`,
            height: `${slot.height * 100}%`,
            borderRadius: slot.borderRadius
              ? `${slot.borderRadius}px`
              : undefined,
          }}
          onMouseEnter={() => onSlotActiveChange(slot.interactionKey)}
          onMouseLeave={() => onSlotActiveChange(null)}
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
      {showRatioLabel && layoutId ? (
        <span className="editor-spread__ratio-label">
          {layoutId.startsWith("spread") ? "4:3" : "1:1"}
        </span>
      ) : null}
    </div>
  );
}

interface SpreadViewProps {
  zoomLevel: number;
}

export default function SpreadView({ zoomLevel }: SpreadViewProps) {
  const pages = useEditorStore((s) => s.pages);
  const layouts = useEditorStore((s) => s.layouts);
  const currentSpreadIndex = useEditorStore((s) => s.currentSpreadIndex);
  const selectedPageSide = useEditorStore((s) => s.selectedPageSide);
  const setSelectedPageSide = useEditorStore((s) => s.setSelectedPageSide);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);

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
  const spreadLayoutSource = getSpreadLayoutSource(leftPage, rightPage, layouts);
  const leftSlots: RenderableSlot[] = getRenderablePageSlots(
    leftPage,
    "left",
    layouts,
    spreadLayoutSource,
  ).map((slot) => ({
    ...slot,
    renderKey: `${leftPage?.id ?? "left"}-${slot.id}`,
    interactionKey:
      spreadLayoutSource !== null
        ? `spread-${slot.id}`
        : `${leftPage?.id ?? "left"}-${slot.id}`,
  }));
  const rightSlots: RenderableSlot[] = getRenderablePageSlots(
    rightPage,
    "right",
    layouts,
    spreadLayoutSource,
  ).map((slot) => ({
    ...slot,
    renderKey: `${rightPage?.id ?? "right"}-${slot.id}`,
    interactionKey:
      spreadLayoutSource !== null
        ? `spread-${slot.id}`
        : `${rightPage?.id ?? "right"}-${slot.id}`,
  }));
  const leftLayoutId = spreadLayoutSource?.layout.id ?? leftPage?.layoutId ?? "";
  const rightLayoutId =
    spreadLayoutSource?.layout.id ?? rightPage?.layoutId ?? "";
  const showPageRatioLabel = !spreadLayoutSource;
  const currentEditableSide = resolveSelectedPageSide(
    currentSpreadIndex,
    selectedPageSide,
    pages.length,
  );

  return (
    <div className="editor-spread" style={{ transform: `scale(1)` }}>
      {/* 左ページ */}
      {leftPage && (
        <>
          <PageView
            hasPage
            side="left"
            width={pageWidth}
            height={pageHeight}
            slots={leftSlots}
            layoutId={leftLayoutId}
            showRatioLabel={showPageRatioLabel}
            isSelected={currentEditableSide === "left"}
            onSelect={setSelectedPageSide}
            activeSlotKey={activeSlotKey}
            onSlotActiveChange={setActiveSlotKey}
          />
          {/* 綴じ（スパイン） */}
          <div className="editor-spread__spine" />
        </>
      )}

      {/* 右ページ */}
      <PageView
        hasPage={!!rightPage}
        side="right"
        width={pageWidth}
        height={pageHeight}
        slots={rightSlots}
        layoutId={rightLayoutId}
        showRatioLabel={showPageRatioLabel}
        isSelected={currentEditableSide === "right"}
        onSelect={setSelectedPageSide}
        activeSlotKey={activeSlotKey}
        onSlotActiveChange={setActiveSlotKey}
      />

      {spreadLayoutSource ? (
        <span className="editor-spread__ratio-label editor-spread__ratio-label--spread">
          4:3
        </span>
      ) : null}
    </div>
  );
}
