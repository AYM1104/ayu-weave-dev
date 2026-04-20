"use client";

/**
 * CanvasArea — エディター中央キャンバス領域
 *
 * 見開きビュー（ページ送りボタン付き）を含むメインエリア。
 * ControlBar・EditorFooter は親の EditorLayout（editor-center）に配置。
 */

import { useEditorStore } from "../../store/editorStore";
import CoverCanvas from "./CoverCanvas";
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
  const isCover = currentSpreadIndex === 0;

  return (
    <div className="editor-canvas-area">
      {/* キャンバス（見開き + 前後ボタン） */}
      <div
        className={`editor-canvas-wrapper ${isCover ? "editor-canvas-wrapper--cover" : ""}`}
      >
        <PageNavButton direction="prev" onClick={prevSpread} disabled={isFirst} />
        {isCover ? <CoverCanvas zoomLevel={zoomLevel} /> : <SpreadView zoomLevel={zoomLevel} />}
        <PageNavButton direction="next" onClick={nextSpread} disabled={isLast} />
      </div>
    </div>
  );
}
