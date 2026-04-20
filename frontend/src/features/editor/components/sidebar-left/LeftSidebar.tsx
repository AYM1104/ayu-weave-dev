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
      {/* テンプレート情報 */}
      <div className="editor-template-info">
        <span className="editor-template-info__title">テンプレートを使用</span>
        <span className="editor-template-info__sub">全3タイプ</span>
      </div>

      {/* レイアウト選択 */}
      <LayoutSelector />
    </div>
  );
}
