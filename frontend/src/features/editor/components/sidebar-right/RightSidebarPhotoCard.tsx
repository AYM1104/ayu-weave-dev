"use client";

import { cn } from "@/lib/cn";
import type { UploadedPhoto } from "../../types/editor";
import styles from "./RightSidebar.module.css";

function getPhotoStatusLabel(photo: UploadedPhoto) {
  switch (photo.status) {
    case "processing":
      return "画像処理中";
    case "error":
      return "エラー";
    default:
      return "";
  }
}

function getPhotoCardImageUrl(photo: UploadedPhoto) {
  return photo.thumbnailUrl || photo.previewUrl || "";
}

interface RightSidebarPhotoCardProps {
  photo: UploadedPhoto;
  isImageLoaded: boolean;
  onImageLoad: (url: string) => void;
  onPhotoSelect: (photoId: string) => void;
}

export default function RightSidebarPhotoCard({
  photo,
  isImageLoaded,
  onImageLoad,
  onPhotoSelect,
}: RightSidebarPhotoCardProps) {
  const imageUrl = getPhotoCardImageUrl(photo);
  const showSkeleton =
    photo.status !== "error" &&
    (
      photo.status === "uploading" ||
      photo.status === "processing" ||
      (!!imageUrl && !isImageLoaded)
    );
  const isDisabled =
    photo.status === "error" || (!photo.thumbnailUrl && !photo.previewUrl);
  const statusLabel = getPhotoStatusLabel(photo);

  return (
    <button
      type="button"
      className={cn(styles.photoCard, photo.used && styles.photoCardUsed)}
      title={photo.fileName}
      disabled={isDisabled}
      onClick={() => onPhotoSelect(photo.id)}
    >
      {imageUrl ? (
        <img
          className={cn(
            styles.photoCardImage,
            !isImageLoaded && styles.photoCardImageHidden,
          )}
          src={imageUrl}
          alt={photo.fileName}
          loading="lazy"
          onLoad={() => onImageLoad(imageUrl)}
        />
      ) : null}
      {showSkeleton ? (
        <span className={styles.photoCardSkeleton} aria-hidden="true" />
      ) : null}
      {statusLabel ? (
        <span className={styles.photoCardStatus}>{statusLabel}</span>
      ) : null}
    </button>
  );
}
