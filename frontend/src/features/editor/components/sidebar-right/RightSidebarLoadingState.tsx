"use client";

import styles from "./RightSidebar.module.css";

export default function RightSidebarLoadingState() {
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
