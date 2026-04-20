"use client";

/**
 * EditorLayout — エディター画面の全体レイアウト
 *
 * ヘッダー（全幅）
 * + メイン: 左サイドバー | 中央カラム（キャンバス + フッター + コントロールバー）| 右サイドバー
 *
 * フッターとコントロールバーはサイドバー間の中央カラムに収まる。
 * 各パネルは features/editor/components/ 配下の子コンポーネントで構成される。
 */

import "../styles/editor.css";
import { useEditorStore } from "../store/editorStore";
import EditorHeader from "./header/EditorHeader";
import LeftSidebar from "./sidebar-left/LeftSidebar";
import CoverSidebar from "./sidebar-left/CoverSidebar";
import CanvasArea from "./canvas/CanvasArea";
import RightSidebar from "./sidebar-right/RightSidebar";
import EditorFooter from "./footer/EditorFooter";
import ControlBar from "./control-bar/ControlBar";

export default function EditorLayout() {
  const currentSpreadIndex = useEditorStore((s) => s.currentSpreadIndex);

  return (
    <div className="editor-root">
      {/* ヘッダー（全幅） */}
      <EditorHeader />

      {/* メイン: 左サイドバー | 中央カラム | 右サイドバー */}
      <div className="editor-main">
        {currentSpreadIndex === 0 ? <CoverSidebar /> : <LeftSidebar />}

        {/* 中央カラム: コントロールバー + キャンバス + フッター */}
        <div className="editor-center">
          <ControlBar />
          <CanvasArea />
          <EditorFooter />
        </div>

        <RightSidebar />
      </div>
    </div>
  );
}
