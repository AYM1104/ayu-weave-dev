"use client";

/**
 * EditorHeader — エディター画面のヘッダーコンポーネント
 *
 * menu ボタンからグローバルメニューを開閉する。
 */

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import styles from "./EditorHeader.module.css";
import EditorHeaderMenuButton from "./menu/EditorHeaderMenuButton";
import EditorHeaderMenuPanel from "./menu/EditorHeaderMenuPanel";

export default function EditorHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    closeMenu();
    router.push("/login");
  };

  return (
    <header className={styles.root}>
      {isOpen ? (
        <button
          type="button"
          className={styles.scrim}
          aria-label="メニューを閉じる"
          onClick={closeMenu}
        />
      ) : null}

      <div className={styles.anchor}>
        <EditorHeaderMenuButton
          isOpen={isOpen}
          menuId={menuId}
          onToggle={() => setIsOpen((open) => !open)}
        />

        {isOpen ? (
          <EditorHeaderMenuPanel
            menuId={menuId}
            onClose={closeMenu}
            onLogout={handleLogout}
          />
        ) : null}
      </div>
    </header>
  );
}
