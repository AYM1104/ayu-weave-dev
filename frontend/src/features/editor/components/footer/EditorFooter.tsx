"use client";

/**
 * EditorFooter — エディターフッター
 *
 * ページネーション（サムネイル横スクロール）+
 * ページコントロール（ズーム、ページカウンター、グリッド表示切り替え）
 */

import { useEditorStore } from "../../store/editorStore";
import GridIcon from "@/shared/icons/GridIcon";
import SpreadPagination from "./spread-pagination/SpreadPagination";
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
  const maxSpread = Math.ceil((pages.length - 1) / 2);

  return (
    <div className="editor-footer">
      <SpreadPagination
        pages={pages}
        layouts={layouts}
        currentSpreadIndex={currentSpreadIndex}
        goToSpread={goToSpread}
      />

      {/* ページコントロール */}
      <div className="editor-page-control">
        {/* ズームスライダー */}
        <ZoomSlider value={zoomLevel} onChange={setZoom} />

        {/* ページカウンター */}
        <span className="editor-page-counter">
          {currentSpreadIndex === 0 ? "表紙" : currentSpreadIndex} / {maxSpread}
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
