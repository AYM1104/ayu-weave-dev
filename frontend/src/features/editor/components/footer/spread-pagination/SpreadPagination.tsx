import type { AlbumPage, LayoutTemplate } from "../../../types/editor";
import SpreadThumbnail from "./SpreadThumbnail";
import usePaginationScrollbar from "./usePaginationScrollbar";

/**
 * SpreadPagination — 見開きサムネイル一覧
 *
 * pages を見開き単位の配列に整形し、
 * SpreadThumbnail の一覧とスクロールバー UI を描画する。
 * スクロールバーの操作ロジックは usePaginationScrollbar に委譲する。
 */

interface SpreadPaginationProps {
  /** エディターが持つ全ページデータ */
  pages: AlbumPage[];
  /** レイアウト情報。各サムネイル描画で利用する */
  layouts: LayoutTemplate[];
  /** 現在表示中の見開き番号 */
  currentSpreadIndex: number;
  /** サムネイルクリック時に見開きを切り替える */
  goToSpread: (index: number) => void;
}

// ページ配列を「表紙 + 本文の見開き一覧」に変換する。
// spreadIndex はフッター内で使う見開き番号。
function buildSpreads(pages: AlbumPage[]) {
  const spreads: {
    leftPage: number | null;
    rightPage: number | null;
    spreadIndex: number;
  }[] = [];

  // 先頭は表紙。左ページは存在しないので null を入れる。
  spreads.push({ leftPage: null, rightPage: 0, spreadIndex: 0 });

  // 本文は 2 ページずつ見開きとしてまとめる。
  for (let pageIndex = 1; pageIndex < pages.length; pageIndex += 2) {
    spreads.push({
      leftPage: pageIndex,
      rightPage: pageIndex + 1 < pages.length ? pageIndex + 1 : null,
      spreadIndex: Math.ceil(pageIndex / 2),
    });
  }

  return spreads;
}

export default function SpreadPagination({
  pages,
  layouts,
  currentSpreadIndex,
  goToSpread,
}: SpreadPaginationProps) {
  // 描画用に pages を見開き単位へ整形する。
  const spreads = buildSpreads(pages);

  // usePaginationScrollbar が返す ref・状態・イベントハンドラを受け取る。
  const {
    paginationTrackRef,
    paginationScrollbarRef,
    isScrollbarDragging,
    isScrollbarVisible,
    scrollbarThumbStyle,
    handlePaginationScroll,
    handleScrollbarTrackPointerDown,
    handleScrollbarThumbPointerDown,
  } = usePaginationScrollbar({
    currentSpreadIndex,
    pageCount: pages.length,
  });

  return (
    <div className="editor-pagination">
      {/* 見開きサムネイルの横スクロール領域 */}
      <div
        ref={paginationTrackRef}
        className="editor-pagination__track"
        onScroll={handlePaginationScroll}
      >
        {/* 左端のフェード */}
        <div className="editor-pagination__fade-left" />

        {/* 見開きごとにサムネイルを並べる */}
        {spreads.map((spread) => (
          <SpreadThumbnail
            key={spread.spreadIndex}
            leftPage={spread.leftPage}
            rightPage={spread.rightPage}
            spreadIndex={spread.spreadIndex}
            pages={pages}
            layouts={layouts}
            isActive={spread.spreadIndex === currentSpreadIndex}
            onClick={() => goToSpread(spread.spreadIndex)}
          />
        ))}

        {/* 右端のフェード */}
        <div className="editor-pagination__fade-right" />
      </div>

      {/* サムネイル列と同期して動くカスタムスクロールバー */}
      <div
        ref={paginationScrollbarRef}
        className={`editor-pagination__scrollbar ${
          isScrollbarDragging ? "editor-pagination__scrollbar--dragging" : ""
        } ${
          scrollbarThumbStyle.isScrollable && isScrollbarVisible
            ? ""
            : "editor-pagination__scrollbar--hidden"
        }`}
        aria-hidden="true"
        onPointerDown={handleScrollbarTrackPointerDown}
      >
        {/* ドラッグ可能なスクロールバーのつまみ */}
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
  );
}
