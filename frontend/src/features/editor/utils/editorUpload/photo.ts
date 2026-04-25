"use client";

import type { UploadedPhoto, UploadedPhotoStatus, UploadedPhotoSource } from "../../types/editor";
import type { MediaSummary } from "./client";
import type { PhotoImageMetadata } from "./types";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export function createPhotoDraft(
  file: File,
  source: UploadedPhotoSource,
): UploadedPhoto {
  return {
    id: createClientId(),
    thumbnailUrl: URL.createObjectURL(file),
    fileName: file.name,
    mimeType: getContentType(file),
    byteSize: file.size,
    progress: 0,
    status: "uploading",
    source,
    used: false,
    createdAt: Date.now(),
  };
}

export async function extractImageMetadataFromFile(file: File) {
  const { width, height } = await loadImageDimensions(file);
  return {
    width,
    height,
    aspectRatioLabel: getAspectRatioLabel(width, height),
  } satisfies PhotoImageMetadata;
}

export async function extractImageMetadataFromUrl(url: string) {
  const { width, height } = await loadImageDimensions(url);
  return {
    width,
    height,
    aspectRatioLabel: getAspectRatioLabel(width, height),
  } satisfies PhotoImageMetadata;
}

export function getContentType(file: File) {
  return file.type || DEFAULT_CONTENT_TYPE;
}

export function mapRemoteStatus(status: MediaSummary["status"]): UploadedPhotoStatus {
  switch (status) {
    case "ready":
      return "ready";
    case "failed":
    case "deleted":
      return "error";
    default:
      return "processing";
  }
}

export function toUploadedPhoto(item: MediaSummary): UploadedPhoto {
  return {
    id: item.id,
    mediaId: item.id,
    thumbnailUrl: item.thumbnail_url ?? item.preview_url ?? "",
    previewUrl: item.preview_url ?? item.thumbnail_url ?? undefined,
    fileName: item.file_name,
    mimeType: item.mime_type,
    byteSize: item.byte_size,
    progress: item.status === "pending" ? 0 : 100,
    status: mapRemoteStatus(item.status),
    source: "api",
    used: false,
    error: item.status === "failed" ? "画像処理に失敗しました" : undefined,
    createdAt: Date.parse(item.created_at) || Date.now(),
  };
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getAspectRatioLabel(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return "その他";
  }

  const normalizedRatio = Math.max(width, height) / Math.min(width, height);
  const buckets = [
    { label: "1:1", ratio: 1 },
    { label: "4:3", ratio: 4 / 3 },
    { label: "3:2", ratio: 3 / 2 },
    { label: "16:9", ratio: 16 / 9 },
  ] as const;

  const closestBucket = buckets.reduce((closest, bucket) => {
    const currentDistance = Math.abs(bucket.ratio - normalizedRatio);
    const closestDistance = Math.abs(closest.ratio - normalizedRatio);
    return currentDistance < closestDistance ? bucket : closest;
  });

  return Math.abs(closestBucket.ratio - normalizedRatio) <= 0.18
    ? closestBucket.label
    : "その他";
}

async function loadImageDimensions(source: string | File): Promise<{
  width: number;
  height: number;
}> {
  const objectUrl =
    typeof source === "string" ? null : URL.createObjectURL(source);
  const src = typeof source === "string" ? source : (objectUrl ?? "");

  try {
    return await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve({
            width: image.naturalWidth,
            height: image.naturalHeight,
          });
        };
        image.onerror = () => {
          reject(new Error("Failed to load image metadata"));
        };
        image.src = src;
      },
    );
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
