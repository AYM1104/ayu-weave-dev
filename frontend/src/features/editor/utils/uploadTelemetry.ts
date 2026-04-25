"use client";

type UploadStage = "initialize" | "put" | "complete" | "poll_ready";

type NetworkInformationLike = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
};

type NavigatorWithNetwork = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
  deviceMemory?: number;
};

export interface UploadBatchTelemetryContext {
  batchId: string;
  albumId?: string;
  startedAtMs: number;
  totalFiles: number;
  totalBytes: number;
  browser: {
    userAgent?: string;
    language?: string;
    hardwareConcurrency?: number;
    deviceMemoryGb?: number;
  };
  network: {
    effectiveType?: string;
    downlinkMbps?: number;
    rttMs?: number;
    saveData?: boolean;
  };
}

export interface UploadItemTelemetryContext {
  batchId: string;
  clientUploadId: string;
  albumId?: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  startedAtMs: number;
  mediaId?: string;
  stageStartedAtMs: Partial<Record<UploadStage, number>>;
  previewAvailableAtMs?: number;
  previewRenderedAtMs?: number;
}

// 完了直後もしばらく item context を保持し、preview URL の解決や
// 画像 onLoad のような後続 UI イベントも同じアップロードに紐付ける。
const activeUploads = new Map<string, UploadItemTelemetryContext>();
const cleanupTimers = new Map<string, number>();
const CLEANUP_DELAY_MS = 5 * 60 * 1000;

function isUploadTelemetryEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_UPLOAD_TELEMETRY === "true"
  );
}

function createTelemetryId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readNowMs() {
  return Date.now();
}

function readClockMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return readNowMs();
}

function toIsoString(timestampMs: number) {
  return new Date(timestampMs).toISOString();
}

function computeDurationMs(startedAtMs?: number) {
  if (startedAtMs == null) {
    return undefined;
  }

  return Math.round((readClockMs() - startedAtMs) * 100) / 100;
}

function logUploadEvent(event: string, payload: Record<string, unknown>) {
  if (!isUploadTelemetryEnabled()) {
    return;
  }

  // 手動検証で DevTools からそのまま絞り込み・転記しやすいように、
  // frontend 側はフラットな structured payload を console に出す。
  console.info("[upload-telemetry]", {
    source: "frontend",
    event,
    recorded_at: toIsoString(readNowMs()),
    ...payload,
  });
}

function toErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
    };
  }

  return {
    error_name: "UnknownError",
    error_message: String(error),
  };
}

function toItemPayload(context: UploadItemTelemetryContext) {
  return {
    batch_id: context.batchId,
    client_upload_id: context.clientUploadId,
    album_id: context.albumId,
    media_id: context.mediaId,
    file_name: context.fileName,
    mime_type: context.mimeType,
    byte_size: context.byteSize,
  };
}

function scheduleCleanup(context: UploadItemTelemetryContext) {
  const activeTimerId = cleanupTimers.get(context.clientUploadId);
  if (activeTimerId != null) {
    window.clearTimeout(activeTimerId);
  }

  const timerId = window.setTimeout(() => {
    activeUploads.delete(context.clientUploadId);
    cleanupTimers.delete(context.clientUploadId);
  }, CLEANUP_DELAY_MS);

  cleanupTimers.set(context.clientUploadId, timerId);
}

function clearCleanupTimer(clientUploadId: string) {
  const timerId = cleanupTimers.get(clientUploadId);
  if (timerId != null) {
    window.clearTimeout(timerId);
    cleanupTimers.delete(clientUploadId);
  }
}

function readEnvironment() {
  if (typeof navigator === "undefined") {
    return {
      browser: {},
      network: {},
    };
  }

  const browserNavigator = navigator as NavigatorWithNetwork;
  const connection =
    browserNavigator.connection ??
    browserNavigator.mozConnection ??
    browserNavigator.webkitConnection;

  return {
    browser: {
      userAgent: browserNavigator.userAgent,
      language: browserNavigator.language,
      hardwareConcurrency: browserNavigator.hardwareConcurrency,
      deviceMemoryGb: browserNavigator.deviceMemory,
    },
    network: {
      effectiveType: connection?.effectiveType,
      downlinkMbps: connection?.downlink,
      rttMs: connection?.rtt,
      saveData: connection?.saveData,
    },
  };
}

export function createUploadBatchTelemetryContext(
  files: File[],
  albumId?: string,
): UploadBatchTelemetryContext {
  const environment = readEnvironment();

  return {
    batchId: createTelemetryId("upload-batch"),
    albumId,
    startedAtMs: readNowMs(),
    totalFiles: files.length,
    totalBytes: files.reduce((total, file) => total + file.size, 0),
    browser: environment.browser,
    network: environment.network,
  };
}

export function logUploadBatchStarted(context: UploadBatchTelemetryContext) {
  logUploadEvent("upload_batch_started", {
    batch_id: context.batchId,
    album_id: context.albumId,
    total_files: context.totalFiles,
    total_bytes: context.totalBytes,
    batch_started_at: toIsoString(context.startedAtMs),
    browser: context.browser,
    network: context.network,
  });
}

export function logUploadBatchCompleted(
  context: UploadBatchTelemetryContext,
  counts: {
    successCount: number;
    failureCount: number;
    cancelledCount: number;
    processingCount?: number;
  },
) {
  const finishedAtMs = readNowMs();

  logUploadEvent("upload_batch_completed", {
    batch_id: context.batchId,
    album_id: context.albumId,
    total_files: context.totalFiles,
    total_bytes: context.totalBytes,
    batch_started_at: toIsoString(context.startedAtMs),
    batch_finished_at: toIsoString(finishedAtMs),
    batch_duration_ms: finishedAtMs - context.startedAtMs,
    success_count: counts.successCount,
    failure_count: counts.failureCount,
    cancelled_count: counts.cancelledCount,
    processing_count: counts.processingCount ?? 0,
  });
}

export function createUploadItemTelemetryContext(args: {
  batchId: string;
  clientUploadId: string;
  albumId?: string;
  file: File;
}): UploadItemTelemetryContext {
  const context: UploadItemTelemetryContext = {
    batchId: args.batchId,
    clientUploadId: args.clientUploadId,
    albumId: args.albumId,
    fileName: args.file.name,
    mimeType: args.file.type || "application/octet-stream",
    byteSize: args.file.size,
    startedAtMs: readNowMs(),
    stageStartedAtMs: {},
  };

  // initialize 失敗時も含めて同じ client-side ID で追えるように、
  // 最初の network call より前に context を登録しておく。
  activeUploads.set(context.clientUploadId, context);
  clearCleanupTimer(context.clientUploadId);
  return context;
}

export function markUploadItemStarted(
  context: UploadItemTelemetryContext | undefined,
) {
  if (!context) {
    return;
  }

  logUploadEvent("upload_item_started", {
    ...toItemPayload(context),
    item_started_at: toIsoString(context.startedAtMs),
  });
}

export function markUploadStageStarted(
  context: UploadItemTelemetryContext | undefined,
  stage: UploadStage,
  extra?: Record<string, unknown>,
) {
  if (!context) {
    return;
  }

  context.stageStartedAtMs[stage] = readClockMs();

  logUploadEvent(`upload_item_${stage}_started`, {
    ...toItemPayload(context),
    stage,
    stage_started_at: toIsoString(readNowMs()),
    ...extra,
  });
}

export function markUploadStageCompleted(
  context: UploadItemTelemetryContext | undefined,
  stage: UploadStage,
  extra?: Record<string, unknown>,
) {
  if (!context) {
    return;
  }

  logUploadEvent(`upload_item_${stage}_completed`, {
    ...toItemPayload(context),
    stage,
    stage_completed_at: toIsoString(readNowMs()),
    stage_duration_ms: computeDurationMs(context.stageStartedAtMs[stage]),
    ...extra,
  });
}

export function markUploadStageFailed(
  context: UploadItemTelemetryContext | undefined,
  stage: UploadStage,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  if (!context) {
    return;
  }

  logUploadEvent(`upload_item_${stage}_failed`, {
    ...toItemPayload(context),
    stage,
    stage_failed_at: toIsoString(readNowMs()),
    stage_duration_ms: computeDurationMs(context.stageStartedAtMs[stage]),
    ...toErrorPayload(error),
    ...extra,
  });
}

export function markUploadCancelled(
  context: UploadItemTelemetryContext | undefined,
  stage: UploadStage,
) {
  if (!context) {
    return;
  }

  logUploadEvent("upload_item_cancelled", {
    ...toItemPayload(context),
    stage,
    cancelled_at: toIsoString(readNowMs()),
    stage_duration_ms: computeDurationMs(context.stageStartedAtMs[stage]),
    total_duration_ms: readNowMs() - context.startedAtMs,
  });

  activeUploads.delete(context.clientUploadId);
  clearCleanupTimer(context.clientUploadId);
}

export function assignUploadMediaId(
  context: UploadItemTelemetryContext | undefined,
  mediaId: string,
) {
  if (!context) {
    return;
  }

  context.mediaId = mediaId;
}

export function markUploadItemCompleted(
  context: UploadItemTelemetryContext | undefined,
  status: string,
) {
  if (!context) {
    return;
  }

  logUploadEvent("upload_item_completed", {
    ...toItemPayload(context),
    status,
    completed_at: toIsoString(readNowMs()),
    total_duration_ms: readNowMs() - context.startedAtMs,
  });

  if (status === "ready" || status === "processing") {
    scheduleCleanup(context);
    return;
  }

  activeUploads.delete(context.clientUploadId);
  clearCleanupTimer(context.clientUploadId);
}

export function markUploadPreviewAvailable(
  clientUploadId: string,
  extra?: Record<string, unknown>,
) {
  const context = activeUploads.get(clientUploadId);
  if (!context || context.previewAvailableAtMs != null) {
    return;
  }

  context.previewAvailableAtMs = readNowMs();

  // ここでいう preview available は「描画可能な asset URL が store に入った」
  // 状態を指す。実際に画面へ描画された時刻は onLoad 側で別に測る。
  logUploadEvent("upload_item_preview_available", {
    ...toItemPayload(context),
    preview_available_at: toIsoString(context.previewAvailableAtMs),
    preview_available_duration_ms: context.previewAvailableAtMs - context.startedAtMs,
    ...extra,
  });

  scheduleCleanup(context);
}

export function markUploadPreviewRendered(
  clientUploadId: string,
  imageUrl: string,
) {
  const context = activeUploads.get(clientUploadId);
  if (!context || context.previewRenderedAtMs != null) {
    return;
  }

  context.previewRenderedAtMs = readNowMs();

  // アップロード開始から sidebar 上で実際に画像が描画されるまでを閉じる計測で、
  // 耐性検証ではこの値をユーザー体感の遅延として見る。
  logUploadEvent("upload_item_preview_rendered", {
    ...toItemPayload(context),
    image_url: imageUrl,
    preview_rendered_at: toIsoString(context.previewRenderedAtMs),
    preview_render_duration_ms: context.previewRenderedAtMs - context.startedAtMs,
    preview_wait_after_available_ms:
      context.previewAvailableAtMs == null
        ? undefined
        : context.previewRenderedAtMs - context.previewAvailableAtMs,
  });

  activeUploads.delete(context.clientUploadId);
  clearCleanupTimer(context.clientUploadId);
}

export function buildUploadTelemetryHeaders(
  context?: UploadItemTelemetryContext,
) {
  if (!context) {
    return {};
  }

  return {
    "X-Upload-Batch-Id": context.batchId,
    "X-Upload-Client-Id": context.clientUploadId,
  };
}
