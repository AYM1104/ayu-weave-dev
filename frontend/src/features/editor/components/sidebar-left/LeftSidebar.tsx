"use client";

/**
 * LeftSidebar — エディター左パネル
 *
 * テンプレート使用ボタン + レイアウト選択パネル
 */

import LayoutSelector from "./LayoutSelector";

export default function LeftSidebar() {
  return (
    <div className="editor-sidebar-left">
      {/* テンプレート使用ボタン */}
      <button className="editor-template-btn">
        <span className="editor-template-btn__title">テンプレートを使用</span>
        <span className="editor-template-btn__sub">全3タイプ</span>
      </button>

      {/* レイアウト選択 */}
      <LayoutSelector />
    </div>
  );
}
