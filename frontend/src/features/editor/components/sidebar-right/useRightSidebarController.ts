"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type DragEventHandler,
  type KeyboardEventHandler,
} from "react";
import { useSearchParams } from "next/navigation";
import { useEditorStore } from "../../store/editorStore";
import type { UploadedPhoto } from "../../types/editor";
import {
  createPhotoDraft,
  extractImageMetadataFromFile,
  extractImageMetadataFromUrl,
  fetchAlbumPhotos,
  isApiUploadEnabled,
  uploadPhotoFile,
} from "../../utils/editorUpload";
import {
  createUploadBatchTelemetryContext,
  createUploadItemTelemetryContext,
  logUploadBatchCompleted,
  logUploadBatchStarted,
  markUploadPreviewAvailable,
  markUploadPreviewRendered,
} from "../../utils/uploadTelemetry";

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const ASPECT_RATIO_ORDER = ["1:1", "4:3", "3:2", "16:9", "その他"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const PROCESSING_POLL_INTERVAL_MS = 2000;

type SidebarViewState = "loading" | "empty" | "library";
type UploadBatchState = {
  total: number;
  activeIds: string[];
};

export type PhotoFilter = "all" | "unused" | "used";

export interface PhotoSection {
  label: string;
  items: UploadedPhoto[];
}

export interface UploadSummary {
  total: number;
  completedCount: number;
  progress: number;
}

function hasAcceptedExtension(fileName: string) {
  const lowerCaseName = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) =>
    lowerCaseName.endsWith(extension)
  );
}

function validateFiles(files: File[]) {
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    const isAcceptedType =
      ACCEPTED_MIME_TYPES.has(file.type) || hasAcceptedExtension(file.name);

    if (!isAcceptedType) {
      errors.push(`${file.name}: JPG / PNG のみアップロードできます。`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`${file.name}: 50MB を超えるファイルはアップロードできません。`);
      return;
    }

    validFiles.push(file);
  });

  return { validFiles, errors };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function matchesPhotoFilter(photo: UploadedPhoto, filter: PhotoFilter) {
  if (filter === "used") {
    return photo.used;
  }

  if (filter === "unused") {
    return !photo.used;
  }

  return true;
}

function getSectionSortWeight(label: string) {
  const presetIndex = ASPECT_RATIO_ORDER.indexOf(label);
  return presetIndex >= 0 ? presetIndex : ASPECT_RATIO_ORDER.length;
}

export function useRightSidebarController() {
  const searchParams = useSearchParams();
  const albumId = searchParams.get("id") ?? undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  const metadataRequestsRef = useRef(new Set<string>());
  const photos = useEditorStore((state) => state.photos);
  const upsertPhoto = useEditorStore((state) => state.upsertPhoto);
  const patchPhoto = useEditorStore((state) => state.patchPhoto);
  const removePhoto = useEditorStore((state) => state.removePhoto);
  const placePhotoInSelectedSlot = useEditorStore(
    (state) => state.placePhotoInSelectedSlot,
  );
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("all");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [loadedImageUrls, setLoadedImageUrls] = useState<Record<string, boolean>>(
    {},
  );
  const [uploadBatch, setUploadBatch] = useState<UploadBatchState | null>(null);
  const [isLoadingInitialPhotos, setIsLoadingInitialPhotos] = useState(
    isApiUploadEnabled(albumId),
  );
  const apiUploadEnabled = isApiUploadEnabled(albumId);
  const hasPhotos = photos.length > 0;
  const hasProcessingPhotos =
    apiUploadEnabled &&
    photos.some(
      (photo) => photo.source === "api" && photo.status === "processing",
    );

  useEffect(() => {
    if (!apiUploadEnabled) {
      setIsLoadingInitialPhotos(false);
      return;
    }

    let cancelled = false;
    setIsLoadingInitialPhotos(true);

    void (async () => {
      try {
        const existingPhotos = await fetchAlbumPhotos(albumId);
        if (cancelled || existingPhotos.length === 0) {
          return;
        }

        existingPhotos.forEach((photo) => upsertPhoto(photo));
      } catch (error) {
        console.error("Failed to fetch album media", error);
      } finally {
        if (!cancelled) {
          setIsLoadingInitialPhotos(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [albumId, apiUploadEnabled, upsertPhoto]);

  useEffect(() => {
    photos.forEach((photo) => {
      if (
        photo.source === "api" &&
        (photo.previewUrl || photo.thumbnailUrl)
      ) {
        // store に描画可能な asset URL が入った時点を拾う。
        // 実際の <img> onLoad より早い段階なので別指標として残す。
        markUploadPreviewAvailable(photo.id, {
          media_id: photo.mediaId,
          photo_status: photo.status,
          preview_source: photo.previewUrl ? "preview_url" : "thumbnail_url",
        });
      }

      if (photo.aspectRatioLabel || !photo.thumbnailUrl) {
        return;
      }

      if (metadataRequestsRef.current.has(photo.id)) {
        return;
      }

      metadataRequestsRef.current.add(photo.id);

      void (async () => {
        try {
          const metadata =
            photo.source === "api"
              ? await extractImageMetadataFromUrl(
                  photo.previewUrl ?? photo.thumbnailUrl,
                )
              : await extractImageMetadataFromUrl(photo.thumbnailUrl);
          patchPhoto(photo.id, metadata);
        } catch (error) {
          console.error("Failed to resolve photo metadata", error);
          patchPhoto(photo.id, { aspectRatioLabel: "その他" });
        } finally {
          metadataRequestsRef.current.delete(photo.id);
        }
      })();
    });
  }, [patchPhoto, photos]);

  useEffect(() => {
    return () => {
      uploadControllersRef.current.forEach((controller) => controller.abort());
      uploadControllersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!hasProcessingPhotos) {
      return;
    }

    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const existingPhotos = await fetchAlbumPhotos(albumId);
          if (cancelled) {
            return;
          }

          existingPhotos.forEach((photo) => upsertPhoto(photo));
        } catch (error) {
          console.error("Failed to refresh processing media", error);
        }
      })();
    }, PROCESSING_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [albumId, hasProcessingPhotos, upsertPhoto]);

  const photoSections = useMemo(() => {
    const filteredPhotos = photos.filter((photo) =>
      matchesPhotoFilter(photo, photoFilter),
    );
    const groupedPhotos = new Map<string, UploadedPhoto[]>();

    filteredPhotos.forEach((photo) => {
      const label = photo.aspectRatioLabel ?? "その他";
      const current = groupedPhotos.get(label);
      if (current) {
        current.push(photo);
        return;
      }

      groupedPhotos.set(label, [photo]);
    });

    return Array.from(groupedPhotos.entries())
      .map(([label, items]) => ({ label, items }))
      .sort((left, right) => {
        const weightDiff =
          getSectionSortWeight(left.label) - getSectionSortWeight(right.label);
        if (weightDiff !== 0) {
          return weightDiff;
        }

        return left.label.localeCompare(right.label, "ja");
      });
  }, [photoFilter, photos]);

  const uploadSummary = useMemo<UploadSummary | null>(() => {
    if (!uploadBatch || uploadBatch.activeIds.length === 0) {
      return null;
    }

    const progressLookup = new Map(
      photos.map((photo) => [
        photo.id,
        Math.max(0, Math.min(photo.progress, 100)),
      ]),
    );
    const activeProgress = uploadBatch.activeIds.reduce((total, photoId) => {
      return total + (progressLookup.get(photoId) ?? 0);
    }, 0);
    const completedCount = Math.max(0, uploadBatch.total - uploadBatch.activeIds.length);
    const progress = Math.round(
      (completedCount * 100 + activeProgress) / uploadBatch.total,
    );

    return {
      total: uploadBatch.total,
      completedCount,
      progress: Math.max(0, Math.min(progress, 100)),
    };
  }, [photos, uploadBatch]);

  const viewState: SidebarViewState = hasPhotos
    ? "library"
    : isLoadingInitialPhotos
      ? "loading"
      : "empty";

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  const markImageLoaded = (photoId: string, url: string) => {
    setLoadedImageUrls((current) => {
      if (current[url]) {
        return current;
      }

      return {
        ...current,
        [url]: true,
      };
    });

    markUploadPreviewRendered(photoId, url);
  };

  const toggleSection = (label: string) => {
    setOpenSections((current) => ({
      ...current,
      [label]: !(current[label] ?? true),
    }));
  };

  const registerUploadBatch = (photoIds: string[]) => {
    setUploadBatch((current) => {
      if (!current || current.activeIds.length === 0) {
        return {
          total: photoIds.length,
          activeIds: photoIds,
        };
      }

      return {
        total: current.total + photoIds.length,
        activeIds: [...current.activeIds, ...photoIds],
      };
    });
  };

  const settleUpload = (photoId: string) => {
    setUploadBatch((current) => {
      if (!current || !current.activeIds.includes(photoId)) {
        return current;
      }

      const nextActiveIds = current.activeIds.filter((id) => id !== photoId);
      if (nextActiveIds.length === 0) {
        return null;
      }

      return {
        ...current,
        activeIds: nextActiveIds,
      };
    });
  };

  const cancelUploads = () => {
    uploadControllersRef.current.forEach((controller) => controller.abort());
    uploadControllersRef.current.clear();
    setUploadBatch(null);
  };

  const handleFiles = (candidateFiles: File[]) => {
    const files = candidateFiles.filter((file) => file.name !== ".DS_Store");
    const { validFiles, errors } = validateFiles(files);

    if (errors.length > 0) {
      window.alert(errors[0]);
    }

    if (validFiles.length === 0) {
      return;
    }

    // batch は 1 回の picker / drop 操作に対応させ、
    // 後から件数・総バイト数と結果をまとめて照合できるようにする。
    const batchTelemetry = createUploadBatchTelemetryContext(validFiles, albumId);
    logUploadBatchStarted(batchTelemetry);
    let remainingCount = validFiles.length;
    const batchCounts = {
      successCount: 0,
      failureCount: 0,
      cancelledCount: 0,
      processingCount: 0,
    };

    const settleBatchTelemetry = (
      outcome: keyof typeof batchCounts,
    ) => {
      batchCounts[outcome] += 1;
      remainingCount -= 1;

      if (remainingCount === 0) {
        logUploadBatchCompleted(batchTelemetry, batchCounts);
      }
    };

    const drafts = validFiles.map((file) => ({
      file,
      draft: createPhotoDraft(file, apiUploadEnabled ? "api" : "demo"),
    }));

    drafts.forEach(({ draft }) => upsertPhoto(draft));
    registerUploadBatch(drafts.map(({ draft }) => draft.id));

    drafts.forEach(({ file, draft }) => {
      const telemetry = createUploadItemTelemetryContext({
        batchId: batchTelemetry.batchId,
        clientUploadId: draft.id,
        albumId,
        file,
      });

      void extractImageMetadataFromFile(file)
        .then((metadata) => {
          patchPhoto(draft.id, metadata);
        })
        .catch((error) => {
          console.error("Failed to extract photo metadata", error);
          patchPhoto(draft.id, { aspectRatioLabel: "その他" });
        });

      const abortController = new AbortController();
      uploadControllersRef.current.set(draft.id, abortController);

      void (async () => {
        try {
          // draft ID を安定した client-side key として使い、
          // UI 状態・frontend telemetry・後続の media_id をつなぐ。
          const result = await uploadPhotoFile(file, {
            albumId,
            signal: abortController.signal,
            telemetry,
            onProgress: (progress) => {
              patchPhoto(draft.id, {
                progress,
                status: "uploading",
                error: undefined,
              });
            },
          });

          patchPhoto(draft.id, {
            mediaId: result.mediaId,
            previewUrl: result.previewUrl,
            thumbnailUrl: result.thumbnailUrl ?? draft.thumbnailUrl,
            progress: result.progress,
            status: result.status,
            source: result.source,
            error: undefined,
          });
          settleBatchTelemetry(
            result.status === "error"
              ? "failureCount"
              : result.status === "processing"
                ? "processingCount"
                : "successCount",
          );
        } catch (error) {
          if (isAbortError(error)) {
            removePhoto(draft.id);
            settleBatchTelemetry("cancelledCount");
            return;
          }

          const message =
            error instanceof Error ? error.message : "アップロードに失敗しました。";

          console.error("Failed to upload photo", error);
          patchPhoto(draft.id, {
            progress: 0,
            status: "error",
            error: message,
          });
          settleBatchTelemetry("failureCount");
          window.alert(message);
        } finally {
          uploadControllersRef.current.delete(draft.id);
          settleUpload(draft.id);
        }
      })();
    });
  };

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      handleFiles(Array.from(fileList));
    }

    event.target.value = "";
  };

  const handleDrop: DragEventHandler<HTMLElement> = (event) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFileDialog();
    }
  };

  return {
    inputRef,
    viewState,
    photoFilter,
    photoSections,
    openSections,
    loadedImageUrls,
    uploadSummary,
    setPhotoFilter,
    openFileDialog,
    markImageLoaded,
    toggleSection,
    cancelUploads,
    handleInputChange,
    handleDrop,
    handleKeyDown,
    placePhotoInSelectedSlot,
  };
}
