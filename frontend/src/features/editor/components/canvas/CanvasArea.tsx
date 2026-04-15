"use client";

/**
 * CanvasArea — エディター中央キャンバス領域
 *
 * 見開きビュー（ページ送りボタン付き）を含むメインエリア。
 * ControlBar・EditorFooter は親の EditorLayout（editor-center）に配置。
 */

import { useEditorStore } from "../../store/editorStore";
import SpreadView from "./SpreadView";

export default function CanvasArea() {
  const currentSpreadIndex = useEditorStore((s) => s.currentSpreadIndex);
  const pages = useEditorStore((s) => s.pages);
  const zoomLevel = useEditorStore((s) => s.zoomLevel);
  const nextSpread = useEditorStore((s) => s.nextSpread);
  const prevSpread = useEditorStore((s) => s.prevSpread);

  const maxSpread = Math.ceil((pages.length - 1) / 2);
  const isFirst = currentSpreadIndex <= 0;
  const isLast = currentSpreadIndex >= maxSpread;

  return (
    <div className="editor-canvas-area">
      {/* キャンバス（見開き + 前後ボタン） */}
      <div className="editor-canvas-wrapper">
        {/* ← 前ページ */}
        <button
          className="editor-page-nav"
          onClick={prevSpread}
          disabled={isFirst}
          aria-label="前のページ"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* 見開きビュー */}
        <SpreadView zoomLevel={zoomLevel} />

        {/* → 次ページ */}
        <button
          className="editor-page-nav"
          onClick={nextSpread}
          disabled={isLast}
          aria-label="次のページ"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M7.5 5L12.5 10L7.5 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
