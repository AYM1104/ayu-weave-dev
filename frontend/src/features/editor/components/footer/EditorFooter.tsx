"use client";

/**
 * EditorFooter — エディターフッター
 *
 * ページネーション（サムネイル横スクロール）+
 * ページコントロール（ズーム、ページカウンター、グリッド表示切り替え）
 */

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import {
  getRenderablePageSlots,
  getSpreadLayoutSource,
} from "../../utils/spreadLayout";
import GridIcon from "@/components/icons/GridIcon";
import ZoomSlider from "./ZoomSlider";

export default function EditorFooter() {
  const pages = useEditorStore((s) => s.pages);
  const layouts = useEditorStore((s) => s.layouts);
  const currentSpreadIndex = useEditorStore((s) => s.currentSpreadIndex);
  const goToSpread = useEditorStore((s) => s.goToSpread);
  const zoomLevel = useEditorStore((s) => s.zoomLevel);
  const setZoom = useEditorStore((s) => s.setZoom);
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);
  const [isPaginationScrolling, setIsPaginationScrolling] = useState(false);
  const scrollEndTimerRef = useRef<number | null>(null);

  const maxSpread = Math.ceil((pages.length - 1) / 2);

  // 見開き単位でページを組み立てる（表紙除くので1始まり）
  const spreads: { leftPage: number | null; rightPage: number | null; spreadIndex: number }[] = [];

  // 表紙
  spreads.push({ leftPage: null, rightPage: 0, spreadIndex: 0 });

  // 本文（見開き2ページずつ）
  for (let i = 1; i < pages.length; i += 2) {
    const spreadIdx = Math.ceil(i / 2);
    spreads.push({
      leftPage: i,
      rightPage: i + 1 < pages.length ? i + 1 : null,
      spreadIndex: spreadIdx,
    });
  }

  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current !== null) {
        window.clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, []);

  const handlePaginationScroll = () => {
    setIsPaginationScrolling(true);

    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = window.setTimeout(() => {
      setIsPaginationScrolling(false);
    }, 700);
  };

  return (
    <div className="editor-footer">
      {/* ページネーション */}
      <div className="editor-pagination">
        <div
          className={`editor-pagination__track ${
            isPaginationScrolling ? "editor-pagination__track--scrolling" : ""
          }`}
          style={{ position: "relative" }}
          onScroll={handlePaginationScroll}
        >
          {/* 左フェード */}
          <div className="editor-pagination__fade-left" />

          {spreads.map((spread) => {
            const isActive = spread.spreadIndex === currentSpreadIndex;
            const leftPageData =
              spread.leftPage !== null ? pages[spread.leftPage] ?? null : null;
            const rightPageData =
              spread.rightPage !== null ? pages[spread.rightPage] ?? null : null;
            const spreadLayoutSource = getSpreadLayoutSource(
              leftPageData,
              rightPageData,
              layouts,
            );
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
                key={spread.spreadIndex}
                className={`editor-pagination__page ${isActive ? "editor-pagination__page--active" : ""}`}
                onClick={() => goToSpread(spread.spreadIndex)}
              >
                {/* 左半分 */}
                <div className="editor-pagination__page-half">
                  {leftSlots.map((slot) => (
                    <div
                      key={slot.id}
                      style={{
                        position: "absolute",
                        left: `${slot.x * 100}%`,
                        top: `${slot.y * 100}%`,
                        width: `${slot.width * 100}%`,
                        height: `${slot.height * 100}%`,
                        background: "rgba(0,0,0,0.1)",
                        borderRadius: slot.borderRadius
                          ? `${Math.min(slot.borderRadius, 50)}%`
                          : undefined,
                      }}
                    />
                  ))}
                </div>
                {/* 右半分 */}
                <div className="editor-pagination__page-half">
                  {rightSlots.map((slot) => (
                    <div
                      key={slot.id}
                      style={{
                        position: "absolute",
                        left: `${slot.x * 100}%`,
                        top: `${slot.y * 100}%`,
                        width: `${slot.width * 100}%`,
                        height: `${slot.height * 100}%`,
                        background: "rgba(0,0,0,0.1)",
                        borderRadius: slot.borderRadius
                          ? `${Math.min(slot.borderRadius, 50)}%`
                          : undefined,
                      }}
                    />
                  ))}
                </div>
                {/* ページ番号 */}
                <span className="editor-pagination__page-num">
                  {spread.spreadIndex === 0
                    ? "表紙"
                    : spread.leftPage !== null
                      ? spread.leftPage
                      : ""}
                </span>
              </div>
            );
          })}

          {/* 右フェード */}
          <div className="editor-pagination__fade-right" />
        </div>
      </div>

      {/* ページコントロール */}
      <div className="editor-page-control">
        {/* ズームスライダー */}
        <ZoomSlider value={zoomLevel} onChange={setZoom} />

        {/* ページカウンター */}
        <span className="editor-page-counter">
          {currentSpreadIndex} / {maxSpread}
        </span>

        {/* グリッド表示切り替え */}
        <button
          className="editor-view-toggle"
          onClick={() =>
            setViewMode(viewMode === "spread" ? "grid" : "spread")
          }
        >
          <GridIcon />
          {viewMode === "spread" ? "グリッド表示" : "見開き表示"}
        </button>
      </div>
    </div>
  );
}
