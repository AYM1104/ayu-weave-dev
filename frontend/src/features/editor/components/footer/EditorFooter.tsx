"use client";

/**
 * EditorFooter — エディターフッター
 *
 * ページネーション（サムネイル横スクロール）+
 * ページコントロール（ズーム、ページカウンター、グリッド表示切り替え）
 */

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  const paginationTrackRef = useRef<HTMLDivElement | null>(null);
  const paginationScrollbarRef = useRef<HTMLDivElement | null>(null);
  const scrollHideTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    startClientX: number;
    startScrollLeft: number;
  } | null>(null);
  const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const [scrollbarThumbStyle, setScrollbarThumbStyle] = useState({
    width: 0,
    offset: 0,
    isScrollable: false,
  });

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

  const clearScrollbarHideTimer = () => {
    if (scrollHideTimerRef.current !== null) {
      window.clearTimeout(scrollHideTimerRef.current);
      scrollHideTimerRef.current = null;
    }
  };

  const showScrollbarTemporarily = () => {
    clearScrollbarHideTimer();
    setIsScrollbarVisible(true);
    scrollHideTimerRef.current = window.setTimeout(() => {
      setIsScrollbarVisible(false);
      scrollHideTimerRef.current = null;
    }, 700);
  };

  useEffect(() => {
    const updateScrollbarThumb = () => {
      const track = paginationTrackRef.current;
      const scrollbar = paginationScrollbarRef.current;

      if (!track || !scrollbar) {
        return;
      }

      const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
      const isScrollable = maxScrollLeft > 0;

      if (!isScrollable) {
        clearScrollbarHideTimer();
        setIsScrollbarVisible(false);
        setScrollbarThumbStyle({
          width: scrollbar.clientWidth,
          offset: 0,
          isScrollable: false,
        });
        return;
      }

      const thumbWidth = Math.max(
        (track.clientWidth / track.scrollWidth) * scrollbar.clientWidth,
        72,
      );
      const maxThumbOffset = Math.max(scrollbar.clientWidth - thumbWidth, 0);
      const thumbOffset =
        maxScrollLeft === 0
          ? 0
          : (track.scrollLeft / maxScrollLeft) * maxThumbOffset;

      setScrollbarThumbStyle({
        width: thumbWidth,
        offset: thumbOffset,
        isScrollable: true,
      });
    };

    const frameId = window.requestAnimationFrame(updateScrollbarThumb);
    const resizeObserver = new ResizeObserver(updateScrollbarThumb);

    if (paginationTrackRef.current) {
      resizeObserver.observe(paginationTrackRef.current);
    }

    if (paginationScrollbarRef.current) {
      resizeObserver.observe(paginationScrollbarRef.current);
    }

    window.addEventListener("resize", updateScrollbarThumb);

    return () => {
      clearScrollbarHideTimer();
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollbarThumb);
    };
  }, [pages.length, currentSpreadIndex]);

  useEffect(() => {
    if (!isScrollbarDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const track = paginationTrackRef.current;
      const scrollbar = paginationScrollbarRef.current;
      const dragState = dragStateRef.current;

      if (!track || !scrollbar || !dragState) {
        return;
      }

      const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
      const maxThumbOffset = Math.max(
        scrollbar.clientWidth - scrollbarThumbStyle.width,
        0,
      );

      if (maxScrollLeft === 0 || maxThumbOffset === 0) {
        return;
      }

      const deltaX = event.clientX - dragState.startClientX;
      const nextScrollLeft =
        dragState.startScrollLeft + (deltaX / maxThumbOffset) * maxScrollLeft;

      track.scrollLeft = Math.max(0, Math.min(nextScrollLeft, maxScrollLeft));
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      setIsScrollbarDragging(false);
      showScrollbarTemporarily();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isScrollbarDragging, scrollbarThumbStyle.width]);

  const handlePaginationScroll = () => {
    const track = paginationTrackRef.current;
    const scrollbar = paginationScrollbarRef.current;

    if (!track || !scrollbar) {
      return;
    }

    const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
    const thumbWidth = Math.max(
      (track.clientWidth / track.scrollWidth) * scrollbar.clientWidth,
      72,
    );
    const maxThumbOffset = Math.max(scrollbar.clientWidth - thumbWidth, 0);
    const isScrollable = maxScrollLeft > 0;

    if (isScrollable) {
      showScrollbarTemporarily();
    } else {
      clearScrollbarHideTimer();
      setIsScrollbarVisible(false);
    }

    setScrollbarThumbStyle({
      width: thumbWidth,
      offset:
        maxScrollLeft === 0
          ? 0
          : (track.scrollLeft / maxScrollLeft) * maxThumbOffset,
      isScrollable,
    });
  };

  const handleScrollbarTrackPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!scrollbarThumbStyle.isScrollable) {
      return;
    }

    if ((event.target as HTMLElement).closest(".editor-pagination__scrollbar-thumb")) {
      return;
    }

    const track = paginationTrackRef.current;
    const scrollbar = paginationScrollbarRef.current;

    if (!track || !scrollbar) {
      return;
    }

    const rect = scrollbar.getBoundingClientRect();
    const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
    const maxThumbOffset = Math.max(
      scrollbar.clientWidth - scrollbarThumbStyle.width,
      0,
    );
    const clickedOffset = Math.max(
      0,
      Math.min(
        event.clientX - rect.left - scrollbarThumbStyle.width / 2,
        maxThumbOffset,
      ),
    );

    track.scrollLeft =
      maxThumbOffset === 0 ? 0 : (clickedOffset / maxThumbOffset) * maxScrollLeft;
  };

  const handleScrollbarThumbPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!scrollbarThumbStyle.isScrollable) {
      return;
    }

    const track = paginationTrackRef.current;

    if (!track) {
      return;
    }

    event.preventDefault();
    clearScrollbarHideTimer();
    setIsScrollbarVisible(true);
    dragStateRef.current = {
      startClientX: event.clientX,
      startScrollLeft: track.scrollLeft,
    };
    setIsScrollbarDragging(true);
  };

  return (
    <div className="editor-footer">
      {/* ページネーション */}
      <div className="editor-pagination">
        <div
          ref={paginationTrackRef}
          className="editor-pagination__track"
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

        <div
          ref={paginationScrollbarRef}
          className={`editor-pagination__scrollbar ${
            isScrollbarDragging ? "editor-pagination__scrollbar--dragging" : ""
          } ${scrollbarThumbStyle.isScrollable && isScrollbarVisible ? "" : "editor-pagination__scrollbar--hidden"}`}
          aria-hidden="true"
          onPointerDown={handleScrollbarTrackPointerDown}
        >
          <div
            className="editor-pagination__scrollbar-thumb"
            style={{
              width: `${scrollbarThumbStyle.width}px`,
              transform: `translateX(${scrollbarThumbStyle.offset}px)`,
            }}
            onPointerDown={handleScrollbarThumbPointerDown}
          />
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
