"use client";

import type { UploadedPhoto } from "../../types/editor";
import {
  assignUploadMediaId,
  markUploadCancelled,
  markUploadItemCompleted,
  markUploadItemStarted,
  markUploadStageCompleted,
  markUploadStageFailed,
  markUploadStageStarted,
} from "../uploadTelemetry";
import {
  completeMediaUpload,
  initializeMediaUpload,
  isApiUploadEnabled,
  listAlbumMedia,
  uploadFileToPresignedUrl,
} from "./client";
import { getContentType, mapRemoteStatus, toUploadedPhoto } from "./photo";
import type { UploadPhotoOptions, UploadPhotoResult } from "./types";

const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 1200;

async function pollMediaUntilReady(
  albumId: string,
  mediaId: string,
  signal?: AbortSignal,
  telemetry?: UploadPhotoOptions["telemetry"],
) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS, signal);

    const items = await listAlbumMedia(albumId, { signal, telemetry });
    const current = items.find((item) => item.id === mediaId);

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
  telemetry?: UploadPhotoOptions["telemetry"],
): Promise<UploadPhotoResult> {
  markUploadItemStarted(telemetry);
  const contentType = getContentType(file);
  let currentStage: "initialize" | "put" | "complete" | "poll_ready" =
    "initialize";

  try {
    throwIfAborted(signal);

    markUploadStageStarted(telemetry, "initialize");
    const initResponse = await initializeMediaUpload({
      albumId,
      file,
      contentType,
      telemetry,
      signal,
    });
    assignUploadMediaId(telemetry, initResponse.data.id);
    markUploadStageCompleted(telemetry, "initialize", {
      media_id: initResponse.data.id,
    });

    currentStage = "put";
    markUploadStageStarted(telemetry, "put");
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
    markUploadStageCompleted(telemetry, "put");

    currentStage = "complete";
    markUploadStageStarted(telemetry, "complete");
    const completeResponse = await completeMediaUpload({
      albumId,
      mediaId: initResponse.data.id,
      telemetry,
      signal,
    });
    markUploadStageCompleted(telemetry, "complete", {
      remote_status: completeResponse.data.status,
    });

    let currentMedia = completeResponse.data;

    if (
      currentMedia.status === "processing" &&
      (!currentMedia.preview_url || !currentMedia.thumbnail_url)
    ) {
      currentStage = "poll_ready";
      markUploadStageStarted(telemetry, "poll_ready");
      const readyMedia = await pollMediaUntilReady(
        albumId,
        currentMedia.id,
        signal,
        telemetry,
      );
      if (readyMedia) {
        currentMedia = readyMedia;
      }
      markUploadStageCompleted(telemetry, "poll_ready", {
        poll_result: readyMedia?.status ?? null,
      });
    }

    const status = mapRemoteStatus(currentMedia.status);
    markUploadItemCompleted(telemetry, status);

    return {
      source: "api",
      mediaId: currentMedia.id,
      previewUrl:
        currentMedia.preview_url ?? currentMedia.thumbnail_url ?? undefined,
      thumbnailUrl:
        currentMedia.thumbnail_url ?? currentMedia.preview_url ?? undefined,
      progress: 100,
      status,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      markUploadCancelled(telemetry, currentStage);
      throw error;
    }

    markUploadStageFailed(telemetry, currentStage, error);
    throw error;
  }
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
      options.telemetry,
    );
  }

  return uploadPhotoViaDemo(options.onProgress, options.signal);
}

export async function fetchAlbumPhotos(albumId?: string): Promise<UploadedPhoto[]> {
  if (!isApiUploadEnabled(albumId)) {
    return [];
  }

  const items = await listAlbumMedia(albumId);
  return items
    .filter((item) => item.status !== "deleted")
    .map(toUploadedPhoto);
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
