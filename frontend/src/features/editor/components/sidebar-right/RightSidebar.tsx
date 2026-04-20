"use client";

import styles from "./RightSidebar.module.css";
import RightSidebarEmptyState from "./RightSidebarEmptyState";
import RightSidebarPhotoLibrary from "./RightSidebarPhotoLibrary";
import { useRightSidebarController } from "./useRightSidebarController";

export default function RightSidebar() {
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

  return (
    <div className={styles.sidebarRight}>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        multiple
        hidden
        onChange={handleInputChange}
      />

      {viewState === "library" ? (
        <RightSidebarPhotoLibrary
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
      ) : (
        <RightSidebarEmptyState
          isLoading={viewState === "loading"}
          onOpenFileDialog={openFileDialog}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
        />
      )}
    </div>
  );
}
