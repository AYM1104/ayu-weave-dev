"use client";

import styles from "./RightSidebar.module.css";
import RightSidebarEmptyState from "./RightSidebarEmptyState";
import RightSidebarLoadingState from "./RightSidebarLoadingState";
import RightSidebarPhotoLibrary from "./RightSidebarPhotoLibrary";
import { useRightSidebarController } from "./useRightSidebarController";

/**
 * RightSidebar — エディター右サイドバー
 *
 * エディターの右側に表示する、写真パネル用のコンポーネント。
 * 写真があるときは写真ライブラリを表示し、
 * 初回読込中は loading、写真がまだないときは empty state を表示する。
 * 写真の取得やアップロードなどの処理は `useRightSidebarController` が担当する。
 */

export default function RightSidebar() {
  // 右サイドバーの状態管理とイベント処理は controller hook に集約し、
  // この component は「どの UI を出すか」に専念する。
  const {
    inputRef,
    viewState,
    photoFilter,
    setPhotoFilter,
    photoSections,
    openSections,
    loadedImageUrls,
    uploadSummary,
    openFileDialog,
    markImageLoaded,
    toggleSection,
    cancelUploads,
    handleInputChange,
    handleDrop,
    handleKeyDown,
    placePhotoInSelectedSlot,
  } = useRightSidebarController();

  let content = null;

  switch (viewState) {
    case "library":
      content = (
        <RightSidebarPhotoLibrary
          // ライブラリ側は見た目とユーザー操作の受け口。
          // 実際のフィルタリング・アップロード・配置処理は controller が持つ。
          photoFilter={photoFilter}
          photoSections={photoSections}
          openSections={openSections}
          loadedImageUrls={loadedImageUrls}
          uploadSummary={uploadSummary}
          onPhotoFilterChange={setPhotoFilter}
          onOpenFileDialog={openFileDialog}
          onToggleSection={toggleSection}
          onImageLoad={markImageLoaded}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          onCancelUploads={cancelUploads}
          onPhotoSelect={placePhotoInSelectedSlot}
        />
      );
      break;
    case "loading":
      content = <RightSidebarLoadingState />;
      break;
    case "empty":
      content = (
        <RightSidebarEmptyState
          onOpenFileDialog={openFileDialog}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
        />
      );
      break;
    default:
      content = null;
  }

  return (
    <div className={styles.sidebarRight}>
      {/*
        ・ファイル選択ダイアログを起動する
        ・JPG / JPEG / PNG の画像のみ受け付ける
        ・複数ファイルを選べる
        ・ファイルが選ばれたときに、handleInputChange を実行する
      */}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        multiple
        hidden    // 画面には表示しない
        onChange={handleInputChange}
      />
      {/* 表示状態に応じて library / loading / empty を切り替える。 */}
      {content}
    </div>
  );
}
