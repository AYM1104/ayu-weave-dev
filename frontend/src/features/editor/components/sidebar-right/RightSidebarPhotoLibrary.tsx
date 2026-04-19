"use client";

import type {
  DragEventHandler,
  KeyboardEventHandler,
} from "react";
import { cn } from "@/lib/cn";
import styles from "./RightSidebar.module.css";
import RightSidebarPhotoCard from "./RightSidebarPhotoCard";
import type {
  PhotoFilter,
  PhotoSection,
  UploadSummary,
} from "./useRightSidebarController";

interface RightSidebarPhotoLibraryProps {
  photoFilter: PhotoFilter;
  photoSections: PhotoSection[];
  openSections: Record<string, boolean>;
  loadedImageUrls: Record<string, boolean>;
  uploadSummary: UploadSummary | null;
  onPhotoFilterChange: (filter: PhotoFilter) => void;
  onOpenFileDialog: () => void;
  onToggleSection: (label: string) => void;
  onImageLoad: (url: string) => void;
  onDrop: DragEventHandler<HTMLElement>;
  onKeyDown: KeyboardEventHandler<HTMLElement>;
  onCancelUploads: () => void;
  onPhotoSelect: (photoId: string) => void;
}

export default function RightSidebarPhotoLibrary({
  photoFilter,
  photoSections,
  openSections,
  loadedImageUrls,
  uploadSummary,
  onPhotoFilterChange,
  onOpenFileDialog,
  onToggleSection,
  onImageLoad,
  onDrop,
  onKeyDown,
  onCancelUploads,
  onPhotoSelect,
}: RightSidebarPhotoLibraryProps) {
  return (
    <div
      className={styles.photoLibrary}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div className={styles.photoLibraryToolbar}>
        <label className={styles.photoLibraryFilterLabel}>
          <select
            className={styles.photoLibraryFilter}
            aria-label="写真の絞り込み"
            value={photoFilter}
            onChange={(event) =>
              onPhotoFilterChange(event.target.value as PhotoFilter)
            }
          >
            <option value="all">すべての写真</option>
            <option value="unused">未使用の写真</option>
            <option value="used">使用中の写真</option>
          </select>
        </label>
      </div>

      <div className={styles.photoLibrarySections}>
        {photoSections.length > 0 ? (
          photoSections.map((section) => {
            const isOpen = openSections[section.label] ?? true;

            return (
              <section key={section.label} className={styles.photoSection}>
                <button
                  type="button"
                  className={styles.photoSectionHeader}
                  onClick={() => onToggleSection(section.label)}
                >
                  <span
                    className={cn(
                      styles.photoSectionChevron,
                      isOpen && styles.photoSectionChevronOpen,
                    )}
                    aria-hidden="true"
                  >
                    ⌄
                  </span>
                  <span className={styles.photoSectionTitle}>
                    {section.label}
                  </span>
                  <span className={styles.photoSectionCount}>
                    ({section.items.length})
                  </span>
                </button>

                {isOpen ? (
                  <div className={styles.photoSectionGrid}>
                    {section.items.map((photo) => {
                      const imageUrl = photo.thumbnailUrl || photo.previewUrl || "";
                      const isImageLoaded = imageUrl
                        ? Boolean(loadedImageUrls[imageUrl])
                        : false;

                      return (
                        <RightSidebarPhotoCard
                          key={photo.id}
                          photo={photo}
                          isImageLoaded={isImageLoaded}
                          onImageLoad={onImageLoad}
                          onPhotoSelect={onPhotoSelect}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })
        ) : (
          <div
            className={styles.photoLibraryEmpty}
            role="button"
            tabIndex={0}
            onClick={onOpenFileDialog}
            onKeyDown={onKeyDown}
          >
            表示できる写真がまだありません
          </div>
        )}
      </div>

      {uploadSummary ? (
        <div className={styles.uploadFooter}>
          <div className={styles.uploadFooterMeta}>
            <span className={styles.uploadFooterLabel}>アップロード中...</span>
            <span className={styles.uploadFooterCount}>
              {uploadSummary.completedCount}/{uploadSummary.total}
            </span>
          </div>
          <div
            className={styles.uploadFooterBar}
            role="progressbar"
            aria-label={`アップロード進捗 ${uploadSummary.progress}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadSummary.progress}
          >
            <span
              className={styles.uploadFooterBarFill}
              style={{ width: `${uploadSummary.progress}%` }}
            />
          </div>
          <button
            type="button"
            className={styles.uploadFooterCancel}
            onClick={onCancelUploads}
          >
            アップロードを中止
          </button>
        </div>
      ) : (
        <div className={styles.photoLibraryAction}>
          <button
            type="button"
            className={styles.photoLibraryUploadButton}
            onClick={onOpenFileDialog}
          >
            画像をアップロード
          </button>
        </div>
      )}
    </div>
  );
}
