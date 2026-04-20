"use client";

/**
 * ControlBar — エディター上部のコントロールバー
 *
 * Undo / Redo ボタン + プレビュー / カートに入れるボタン
 */

import { useEditorStore } from "../../store/editorStore";
import UndoIcon from "@/shared/icons/UndoIcon";
import RedoIcon from "@/shared/icons/RedoIcon";
import EditorButton from "./EditorButton";

export default function ControlBar() {
  const currentSpreadIndex = useEditorStore((s) => s.currentSpreadIndex);
  const pages = useEditorStore((s) => s.pages);

  return (
    <div className="editor-controlbar">
      {/* 左: Undo / Redo */}
      <div className="editor-controlbar__left">
        <button
          className="editor-icon-btn"
          title="元に戻す"
          disabled
          aria-label="Undo"
        >
          <UndoIcon />
        </button>
        <button
          className="editor-icon-btn"
          title="やり直す"
          disabled
          aria-label="Redo"
        >
          <RedoIcon />
        </button>
      </div>

      {/* 右: プレビュー + カートに入れる */}
      <div className="editor-controlbar__right">
        <EditorButton variant="ghost">プレビュー</EditorButton>
        <EditorButton variant="primary">カートに入れる</EditorButton>
      </div>
    </div>
  );
}
