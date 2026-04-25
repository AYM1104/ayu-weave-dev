"use client";

import "@/features/editor/styles/editor.css";
import EditorHeader from "@/features/editor/components/header/EditorHeader";
import CoverSidebar from "@/features/editor/components/sidebar-left/CoverSidebar";
import LeftSidebar from "@/features/editor/components/sidebar-left/LeftSidebar";
import ControlBar from "@/features/editor/components/control-bar/ControlBar";
import CanvasArea from "@/features/editor/components/canvas/CanvasArea";
import EditorFooter from "@/features/editor/components/footer/EditorFooter";
import RightSidebar from "@/features/editor/components/sidebar-right/RightSidebar";
import { useEditorStore } from "@/features/editor/store/editorStore";

export default function AlbumEditPage() {
  const currentSpreadIndex = useEditorStore((s) => s.currentSpreadIndex);

  return (
    <div className="editor-root">

      {/* ヘッダー */}
      <EditorHeader />

      {/* メインコンテンツ */}
      <div className="editor-main">

        {/* 左サイドバー */}
        {currentSpreadIndex === 0 ? <CoverSidebar /> : <LeftSidebar />}

        {/* 中央コンテンツ */}
        <div className="editor-center">
          <ControlBar />
          <CanvasArea />
          <EditorFooter />
        </div>

        {/* 右サイドバー */}
        <RightSidebar />
        
      </div>
    </div>
  );
}
