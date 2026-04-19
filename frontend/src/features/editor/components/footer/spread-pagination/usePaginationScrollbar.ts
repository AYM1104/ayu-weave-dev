import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * usePaginationScrollbar — ページネーション用スクロールバー制御
 *
 * サムネイル列に対するスクロール位置の同期、
 * スクロールバー表示制御、ドラッグ操作をまとめて扱う。
 */

interface ScrollbarThumbStyle {
  width: number;
  offset: number;
  isScrollable: boolean;
}

interface PaginationScrollbarOptions {
  currentSpreadIndex: number;
  pageCount: number;
}

function getScrollbarThumbMetrics(
  track: HTMLDivElement,
  scrollbar: HTMLDivElement,
): ScrollbarThumbStyle {
  const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
  const isScrollable = maxScrollLeft > 0;

  if (!isScrollable) {
    return {
      width: scrollbar.clientWidth,
      offset: 0,
      isScrollable: false,
    };
  }

  const thumbWidth = Math.max(
    (track.clientWidth / track.scrollWidth) * scrollbar.clientWidth,
    72,
  );
  const maxThumbOffset = Math.max(scrollbar.clientWidth - thumbWidth, 0);
  const thumbOffset =
    maxScrollLeft === 0 ? 0 : (track.scrollLeft / maxScrollLeft) * maxThumbOffset;

  return {
    width: thumbWidth,
    offset: thumbOffset,
    isScrollable: true,
  };
}

export default function usePaginationScrollbar({
  currentSpreadIndex,
  pageCount,
}: PaginationScrollbarOptions) {
  const paginationTrackRef = useRef<HTMLDivElement | null>(null);
  const paginationScrollbarRef = useRef<HTMLDivElement | null>(null);
  const scrollHideTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    startClientX: number;
    startScrollLeft: number;
  } | null>(null);
  const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const [scrollbarThumbStyle, setScrollbarThumbStyle] =
    useState<ScrollbarThumbStyle>({
      width: 0,
      offset: 0,
      isScrollable: false,
    });

  const clearScrollbarHideTimer = useCallback(() => {
    if (scrollHideTimerRef.current !== null) {
      window.clearTimeout(scrollHideTimerRef.current);
      scrollHideTimerRef.current = null;
    }
  }, []);

  const showScrollbarTemporarily = useCallback(() => {
    clearScrollbarHideTimer();
    setIsScrollbarVisible(true);
    scrollHideTimerRef.current = window.setTimeout(() => {
      setIsScrollbarVisible(false);
      scrollHideTimerRef.current = null;
    }, 700);
  }, [clearScrollbarHideTimer]);

  useEffect(() => {
    const updateScrollbarThumb = () => {
      const track = paginationTrackRef.current;
      const scrollbar = paginationScrollbarRef.current;

      if (!track || !scrollbar) {
        return;
      }

      const nextThumbStyle = getScrollbarThumbMetrics(track, scrollbar);

      if (!nextThumbStyle.isScrollable) {
        clearScrollbarHideTimer();
        setIsScrollbarVisible(false);
      }

      setScrollbarThumbStyle(nextThumbStyle);
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
  }, [clearScrollbarHideTimer, currentSpreadIndex, pageCount]);

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
  }, [isScrollbarDragging, scrollbarThumbStyle.width, showScrollbarTemporarily]);

  const handlePaginationScroll = useCallback(() => {
    const track = paginationTrackRef.current;
    const scrollbar = paginationScrollbarRef.current;

    if (!track || !scrollbar) {
      return;
    }

    const nextThumbStyle = getScrollbarThumbMetrics(track, scrollbar);

    if (nextThumbStyle.isScrollable) {
      showScrollbarTemporarily();
    } else {
      clearScrollbarHideTimer();
      setIsScrollbarVisible(false);
    }

    setScrollbarThumbStyle(nextThumbStyle);
  }, [clearScrollbarHideTimer, showScrollbarTemporarily]);

  const handleScrollbarTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!scrollbarThumbStyle.isScrollable) {
        return;
      }

      if (
        (event.target as HTMLElement).closest(
          ".editor-pagination__scrollbar-thumb",
        )
      ) {
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
        maxThumbOffset === 0
          ? 0
          : (clickedOffset / maxThumbOffset) * maxScrollLeft;
    },
    [scrollbarThumbStyle.isScrollable, scrollbarThumbStyle.width],
  );

  const handleScrollbarThumbPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
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
    },
    [clearScrollbarHideTimer, scrollbarThumbStyle.isScrollable],
  );

  return {
    paginationTrackRef,
    paginationScrollbarRef,
    isScrollbarDragging,
    isScrollbarVisible,
    scrollbarThumbStyle,
    handlePaginationScroll,
    handleScrollbarTrackPointerDown,
    handleScrollbarThumbPointerDown,
  };
}
