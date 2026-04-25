"use client";

import type {
  UploadedPhotoSource,
  UploadedPhotoStatus,
} from "../../types/editor";
import type { UploadItemTelemetryContext } from "../uploadTelemetry";

export interface UploadPhotoOptions {
  albumId?: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  telemetry?: UploadItemTelemetryContext;
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
