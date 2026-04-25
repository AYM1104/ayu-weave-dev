"use client";

import {
  buildUploadTelemetryHeaders,
  type UploadItemTelemetryContext,
} from "../uploadTelemetry";

const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
const API_V1_BASE = DEFAULT_API_BASE ? `${DEFAULT_API_BASE}/api/v1` : "";

export type MediaSummary = {
  id: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  status: "pending" | "processing" | "ready" | "failed" | "deleted";
  preview_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

type UploadInitResponse = {
  data: {
    id: string;
    upload_url: string;
    upload_headers?: Record<string, string>;
  };
};

type CompleteResponse = {
  data: MediaSummary;
};

type MediaListResponse = {
  data: {
    items: MediaSummary[];
  };
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let detail = "";

    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") {
        detail = payload.detail;
      } else if (payload.detail != null) {
        detail = JSON.stringify(payload.detail);
      }
    } catch {
      detail = await response.text().catch(() => "");
    }

    throw new Error(
      detail
        ? `Request failed (${response.status}): ${detail}`
        : `Request failed (${response.status})`,
    );
  }

  return (await response.json()) as T;
}

export async function uploadFileToPresignedUrl(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
) {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

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

export function isApiUploadEnabled(albumId?: string) {
  return Boolean(API_V1_BASE && albumId);
}

export async function initializeMediaUpload(args: {
  albumId: string;
  file: File;
  contentType: string;
  telemetry?: UploadItemTelemetryContext;
  signal?: AbortSignal;
}) {
  return requestJson<UploadInitResponse>(
    `${API_V1_BASE}/albums/${args.albumId}/media/uploads`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildUploadTelemetryHeaders(args.telemetry),
      },
      body: JSON.stringify({
        file_name: args.file.name,
        mime_type: args.contentType,
        byte_size: args.file.size,
      }),
      signal: args.signal,
    },
  );
}

export async function completeMediaUpload(args: {
  albumId: string;
  mediaId: string;
  telemetry?: UploadItemTelemetryContext;
  signal?: AbortSignal;
}) {
  return requestJson<CompleteResponse>(
    `${API_V1_BASE}/albums/${args.albumId}/media/${args.mediaId}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildUploadTelemetryHeaders(args.telemetry),
      },
      body: "{}",
      signal: args.signal,
    },
  );
}

export async function listAlbumMedia(
  albumId: string,
  options?: {
    signal?: AbortSignal;
    telemetry?: UploadItemTelemetryContext;
  },
) {
  const response = await requestJson<MediaListResponse>(
    `${API_V1_BASE}/albums/${albumId}/media?limit=100`,
    {
      headers: buildUploadTelemetryHeaders(options?.telemetry),
      signal: options?.signal,
    },
  );

  return response.data.items;
}
function createAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}
