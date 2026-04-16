"use client";

/**
 * CanvasArea — エディター中央キャンバス領域
 *
 * 見開きビュー（ページ送りボタン付き）を含むメインエリア。
 * ControlBar・EditorFooter は親の EditorLayout（editor-center）に配置。
 */

import { useEditorStore } from "../../store/editorStore";
import SpreadView from "./SpreadView";
import PageNavButton from "./PageNavButton";

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
        <PageNavButton direction="prev" onClick={prevSpread} disabled={isFirst} />
        <SpreadView zoomLevel={zoomLevel} />
        <PageNavButton direction="next" onClick={nextSpread} disabled={isLast} />
      </div>
    </div>
  );
}
