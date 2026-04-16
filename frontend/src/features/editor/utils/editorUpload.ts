"use client";

import type {
  UploadedPhoto,
  UploadedPhotoSource,
  UploadedPhotoStatus,
} from "../types/editor";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";
const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
const API_V1_BASE = DEFAULT_API_BASE ? `${DEFAULT_API_BASE}/api/v1` : "";
const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 1200;

type UploadInitResponse = {
  data: {
    id: string;
    upload_url: string;
    upload_headers?: Record<string, string>;
  };
};

type MediaSummary = {
  id: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  status: "pending" | "processing" | "ready" | "failed" | "deleted";
  preview_url: string | null;
  created_at: string;
};

type CompleteResponse = {
  data: MediaSummary;
};

type MediaListResponse = {
  data: {
    items: MediaSummary[];
  };
};

export interface UploadPhotoOptions {
  albumId?: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface UploadPhotoResult {
  source: UploadedPhotoSource;
  mediaId?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  progress: number;
  status: UploadedPhotoStatus;
}

export interface PhotoImageMetadata {
  width: number;
  height: number;
  aspectRatioLabel: string;
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    throwIfAborted(signal);

    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId);
      reject(createAbortError());
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function getContentType(file: File) {
  return file.type || DEFAULT_CONTENT_TYPE;
}

function mapRemoteStatus(status: MediaSummary["status"]): UploadedPhotoStatus {
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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

async function uploadFileToPresignedUrl(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
) {
  await new Promise<void>((resolve, reject) => {
    throwIfAborted(signal);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const progress = Math.min(
        100,
        Math.round((event.loaded / event.total) * 100),
      );
      onProgress?.(progress);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      reject(new Error(`Upload failed (${xhr.status})`));
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error while uploading file"));
    });

    const handleAbort = () => {
      xhr.abort();
      reject(createAbortError());
    };

    signal?.addEventListener("abort", handleAbort, { once: true });

    xhr.send(file);
  });
}

async function pollMediaUntilReady(
  albumId: string,
  mediaId: string,
  signal?: AbortSignal,
) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS, signal);

    const response = await requestJson<MediaListResponse>(
      `${API_V1_BASE}/albums/${albumId}/media?limit=100`,
      { signal },
    );
    const current = response.data.items.find((item) => item.id === mediaId);

    if (!current) {
      continue;
    }

    if (current.status === "ready" || current.status === "failed") {
      return current;
    }
  }

  return null;
}

async function uploadPhotoViaApi(
  file: File,
  albumId: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<UploadPhotoResult> {
  throwIfAborted(signal);
  const contentType = getContentType(file);
  const initResponse = await requestJson<UploadInitResponse>(
    `${API_V1_BASE}/albums/${albumId}/media/uploads`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_name: file.name,
        mime_type: contentType,
        byte_size: file.size,
      }),
      signal,
    },
  );

  await uploadFileToPresignedUrl(
    initResponse.data.upload_url,
    file,
    initResponse.data.upload_headers?.["content-type"]
      ? initResponse.data.upload_headers
      : {
          ...(initResponse.data.upload_headers ?? {}),
          "content-type": contentType,
        },
    onProgress,
    signal,
  );

  const completeResponse = await requestJson<CompleteResponse>(
    `${API_V1_BASE}/albums/${albumId}/media/${initResponse.data.id}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
      signal,
    },
  );

  let currentMedia = completeResponse.data;

  if (!currentMedia.preview_url && currentMedia.status === "processing") {
    const readyMedia = await pollMediaUntilReady(
      albumId,
      currentMedia.id,
      signal,
    );
    if (readyMedia) {
      currentMedia = readyMedia;
    }
  }

  return {
    source: "api",
    mediaId: currentMedia.id,
    previewUrl: currentMedia.preview_url ?? undefined,
    thumbnailUrl: currentMedia.preview_url ?? undefined,
    progress: 100,
    status: mapRemoteStatus(currentMedia.status),
  };
}

async function uploadPhotoViaDemo(
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<UploadPhotoResult> {
  const progressSteps = [18, 44, 72, 100];

  for (const progress of progressSteps) {
    await sleep(180, signal);
    onProgress?.(progress);
  }

  return {
    source: "demo",
    progress: 100,
    status: "ready",
  };
}

export function isApiUploadEnabled(albumId?: string) {
  return Boolean(API_V1_BASE && albumId);
}

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

export async function uploadPhotoFile(
  file: File,
  options: UploadPhotoOptions,
): Promise<UploadPhotoResult> {
  if (isApiUploadEnabled(options.albumId)) {
    return uploadPhotoViaApi(
      file,
      options.albumId!,
      options.onProgress,
      options.signal,
    );
  }

  return uploadPhotoViaDemo(options.onProgress, options.signal);
}

export async function fetchAlbumPhotos(albumId?: string): Promise<UploadedPhoto[]> {
  if (!isApiUploadEnabled(albumId)) {
    return [];
  }

  const response = await requestJson<MediaListResponse>(
    `${API_V1_BASE}/albums/${albumId}/media?limit=100`,
  );

  return response.data.items
    .filter((item) => item.status !== "deleted")
    .map((item) => ({
      id: item.id,
      mediaId: item.id,
      thumbnailUrl: item.preview_url ?? "",
      previewUrl: item.preview_url ?? undefined,
      fileName: item.file_name,
      mimeType: item.mime_type,
      byteSize: item.byte_size,
      progress: item.status === "pending" ? 0 : 100,
      status: mapRemoteStatus(item.status),
      source: "api",
      used: false,
      error: item.status === "failed" ? "画像処理に失敗しました" : undefined,
      createdAt: Date.parse(item.created_at) || Date.now(),
    }));
}
