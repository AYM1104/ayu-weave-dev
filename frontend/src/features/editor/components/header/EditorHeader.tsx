"use client";

/**
 * EditorHeader — エディター画面のヘッダーコンポーネント
 *
 * menu ボタンなどグローバルなナビゲーション要素を管理する。
 */

import MenuIcon from "@/components/icons/MenuIcon";

export default function EditorHeader() {
  return (
    <header className="editor-header">
      {/* menu ボタン */}
      <button className="editor-header__menu-btn">
        menu
        <MenuIcon />
      </button>
    </header>
  );
}
