"use client";

/**
 * EditorHeader — エディター画面のヘッダーコンポーネント
 *
 * menu ボタンからグローバルメニューを開閉する。
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import CloseIcon from "@/components/icons/CloseIcon";
import EditIcon from "@/components/icons/EditIcon";
import ExternalLinkIcon from "@/components/icons/ExternalLinkIcon";
import AddIcon from "@/components/icons/AddIcon";
import MenuIcon from "@/components/icons/MenuIcon";
import styles from "./EditorHeader.module.css";

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
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-haspopup="dialog"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className={styles.menuButtonLabel}>menu</span>
          <span className={styles.menuButtonIcon} aria-hidden="true">
            {isOpen ? <CloseIcon /> : <MenuIcon />}
          </span>
        </button>

        {isOpen ? (
          <div id={menuId} className={styles.panel} role="dialog" aria-modal="true">
            <nav aria-label="エディターメニュー">
              <ul className={styles.menuList}>
                <li>
                  <Link
                    href="/album/upload"
                    className={styles.menuItem}
                    onClick={closeMenu}
                  >
                    <span className={styles.menuItemLabel}>新規アルバム</span>
                    <span className={styles.menuItemIcon} aria-hidden="true">
                      <AddIcon />
                    </span>
                  </Link>
                </li>

                <li>
                  <Link
                    href="/dashboard"
                    className={styles.menuItem}
                    onClick={closeMenu}
                  >
                    <span className={styles.menuItemLabel}>下書き</span>
                    <span className={styles.menuItemIcon} aria-hidden="true">
                      <EditIcon />
                    </span>
                  </Link>
                </li>

                <li>
                  <Link
                    href="/account/orders"
                    className={styles.menuItem}
                    onClick={closeMenu}
                  >
                    <span className={styles.menuItemLabel}>注文履歴</span>
                    <span className={styles.menuItemIcon} aria-hidden="true">
                      <ExternalLinkIcon />
                    </span>
                  </Link>
                </li>

                <li className={styles.menuItemWithDivider}>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={handleLogout}
                  >
                    <span className={styles.menuItemLabel}>ログアウト</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
