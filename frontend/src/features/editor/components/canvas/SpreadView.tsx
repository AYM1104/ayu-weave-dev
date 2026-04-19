"use client";

/**
 * SpreadView — 見開きページビュー
 *
 * 左ページ + 綴じ（スパイン） + 右ページ の見開き構成。
 * 各ページ内にはレイアウトテンプレートのスロットを描画する。
 */

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useEditorStore } from "../../store/editorStore";
import type { AlbumPage, PhotoSlot, UploadedPhoto } from "../../types/editor";
import {
  getRenderablePageSlots,
  getSpreadLayoutSource,
} from "../../utils/spreadLayout";
import { resolveSelectedPageSide } from "../../utils/pageSelection";

interface RenderableSlot extends PhotoSlot {
  renderKey: string;
  interactionKey: string;
  sourcePageIndex: number;
}

function getPhotoStatusLabel(photo: UploadedPhoto) {
  switch (photo.status) {
    case "processing":
      return "画像処理中";
    case "error":
      return "エラー";
    default:
      return "";
  }
}

function getSlotImageUrl(photo: UploadedPhoto) {
  if (photo.status === "ready") {
    return photo.previewUrl ?? photo.thumbnailUrl ?? "";
  }

  return photo.thumbnailUrl ?? photo.previewUrl ?? "";
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
  selectedSlotId,
  selectedSlotPageIndex,
  onSlotSelect,
  getPhotoById,
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
  selectedSlotId: string | null;
  selectedSlotPageIndex: number | null;
  onSlotSelect: (pageIndex: number, slotId: string) => void;
  getPhotoById: (photoId: string | null) => UploadedPhoto | undefined;
}) {
  const [loadedImageUrls, setLoadedImageUrls] = useState<Record<string, boolean>>({});

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

  const handleSlotKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    slot: RenderableSlot,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(side);
      onSlotSelect(slot.sourcePageIndex, slot.id);
    }
  };

  const handleSlotClick = (
    event: MouseEvent<HTMLDivElement>,
    slot: RenderableSlot,
  ) => {
    event.stopPropagation();
    onSelect(side);
    onSlotSelect(slot.sourcePageIndex, slot.id);
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
      {slots.map((slot) => {
        const photo = getPhotoById(slot.photoId);
        const imageUrl = photo ? getSlotImageUrl(photo) : "";
        const isImageLoaded = imageUrl ? Boolean(loadedImageUrls[imageUrl]) : false;
        const showSkeleton =
          !!photo &&
          photo.status !== "error" &&
          (photo.status !== "ready" || (!!imageUrl && !isImageLoaded));
        const isSlotSelected =
          selectedSlotId === slot.id &&
          selectedSlotPageIndex === slot.sourcePageIndex;

        return (
          <div
            key={slot.renderKey}
            className={`editor-slot ${activeSlotKey === slot.interactionKey ? "editor-slot--active" : ""} ${isSlotSelected ? "editor-slot--selected" : ""}`}
            style={{
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: `${slot.width * 100}%`,
              height: `${slot.height * 100}%`,
              borderRadius: slot.borderRadius
                ? `${slot.borderRadius}px`
                : undefined,
            }}
            role="button"
            tabIndex={0}
            aria-label="写真スロットを選択する"
            aria-pressed={isSlotSelected}
            onMouseEnter={() => onSlotActiveChange(slot.interactionKey)}
            onMouseLeave={() => onSlotActiveChange(null)}
            onClick={(event) => handleSlotClick(event, slot)}
            onKeyDown={(event) => handleSlotKeyDown(event, slot)}
          >
            {photo ? (
              <>
                {imageUrl ? (
                  <img
                    className={`editor-slot__image ${!isImageLoaded ? "editor-slot__image--hidden" : ""}`}
                    src={imageUrl}
                    alt={photo.fileName}
                    onLoad={() =>
                      setLoadedImageUrls((current) => {
                        if (current[imageUrl]) {
                          return current;
                        }

                        return {
                          ...current,
                          [imageUrl]: true,
                        };
                      })
                    }
                  />
                ) : null}
                {showSkeleton ? (
                  <span className="editor-slot__skeleton" aria-hidden="true" />
                ) : null}
                {photo.status !== "ready" ? (
                  <span className="editor-slot__status">
                    {getPhotoStatusLabel(photo)}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}

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
  const photos = useEditorStore((s) => s.photos);
  const currentSpreadIndex = useEditorStore((s) => s.currentSpreadIndex);
  const selectedPageSide = useEditorStore((s) => s.selectedPageSide);
  const selectedSlotId = useEditorStore((s) => s.selectedSlotId);
  const selectedSlotPageIndex = useEditorStore((s) => s.selectedSlotPageIndex);
  const setSelectedPageSide = useEditorStore((s) => s.setSelectedPageSide);
  const setSelectedSlot = useEditorStore((s) => s.setSelectedSlot);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);

  const photoMap = useMemo(
    () => new Map(photos.map((photo) => [photo.id, photo])),
    [photos],
  );

  let leftPage: AlbumPage | null = null;
  let rightPage: AlbumPage | null = null;
  let leftPageIndex: number | null = null;
  let rightPageIndex: number | null = null;

  if (currentSpreadIndex === 0) {
    leftPage = null;
    leftPageIndex = null;
    rightPage = pages[0] ?? null;
    rightPageIndex = 0;
  } else {
    leftPageIndex = currentSpreadIndex * 2 - 1;
    rightPageIndex = currentSpreadIndex * 2;
    leftPage = pages[leftPageIndex] ?? null;
    rightPage = pages[rightPageIndex] ?? null;
  }

  const scale = zoomLevel / 100;
  const basePageWidth = 439;
  const basePageHeight = 620;
  const pageWidth = basePageWidth * scale;
  const pageHeight = basePageHeight * scale;
  const spreadLayoutSource = getSpreadLayoutSource(leftPage, rightPage, layouts);
  const spreadSourcePageIndex = leftPageIndex ?? rightPageIndex ?? 0;

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
    sourcePageIndex:
      spreadLayoutSource !== null ? spreadSourcePageIndex : (leftPageIndex ?? 0),
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
    sourcePageIndex:
      spreadLayoutSource !== null ? spreadSourcePageIndex : (rightPageIndex ?? 0),
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
    <div className="editor-spread" style={{ transform: "scale(1)" }}>
      {leftPage && leftPageIndex !== null ? (
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
            selectedSlotId={selectedSlotId}
            selectedSlotPageIndex={selectedSlotPageIndex}
            onSlotSelect={setSelectedSlot}
            getPhotoById={(photoId) => (photoId ? photoMap.get(photoId) : undefined)}
          />
          <div className="editor-spread__spine" />
        </>
      ) : null}

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
        selectedSlotId={selectedSlotId}
        selectedSlotPageIndex={selectedSlotPageIndex}
        onSlotSelect={setSelectedSlot}
        getPhotoById={(photoId) => (photoId ? photoMap.get(photoId) : undefined)}
      />

      {spreadLayoutSource ? (
        <span className="editor-spread__ratio-label editor-spread__ratio-label--spread">
          4:3
        </span>
      ) : null}
    </div>
  );
}
