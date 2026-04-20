"use client";

import type {
  DragEventHandler,
  KeyboardEventHandler,
} from "react";
import PlusIcon from "@/shared/icons/PlusIcon";
import styles from "./RightSidebar.module.css";

interface RightSidebarEmptyStateProps {
  isLoading: boolean;
  onOpenFileDialog: () => void;
  onDrop: DragEventHandler<HTMLElement>;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
}

export default function RightSidebarEmptyState({
  isLoading,
  onOpenFileDialog,
  onDrop,
  onKeyDown,
}: RightSidebarEmptyStateProps) {
  if (isLoading) {
    return (
      <div className={styles.uploadArea} aria-busy="true">
        <div className={styles.uploadAreaBody}>
          <div className={styles.uploadAreaText}>
            <span>アップロード済み写真を確認中です</span>
          </div>
          <div className={styles.uploadAreaHint}>
            右サイドバーの写真ライブラリを読み込んでいます
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.uploadArea}
      role="button"
      tabIndex={0}
      aria-label="写真をアップロードする"
      onClick={onOpenFileDialog}
      onKeyDown={onKeyDown}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div className={styles.uploadAreaBody}>
        <div className={styles.uploadAreaIcon} aria-hidden="true">
          <PlusIcon />
        </div>
        <div className={styles.uploadAreaText}>
          <span>ドラッグ&ドロップ</span>
          <br />
          <span>または</span>
          <br />
          <span className={styles.uploadAreaTextBold}>ファイルを開く</span>
        </div>
        <div className={styles.uploadAreaHint}>
          アップロード可能フォーマット：
          <br />
          JPG, PNG
          <br />
          1回のアップロードで50MBまで
        </div>
      </div>

      <div className={styles.qrArea}>
        <img
          className={styles.qrAreaCode}
          src="/images/qr-code-sample.png"
          alt="スマホアップロード用QRコード"
        />
        <div className={styles.qrAreaText}>
          スマホから
          <br />
          アップロードもできます
        </div>
      </div>
    </div>
  );
}
