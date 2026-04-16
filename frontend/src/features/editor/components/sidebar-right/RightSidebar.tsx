"use client";

/**
 * RightSidebar — エディター右パネル
 *
 * 写真アップロード領域 + アップロード済み写真ライブラリ
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import PlusIcon from "@/components/icons/PlusIcon";
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

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png"];  
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const ASPECT_RATIO_ORDER = ["1:1", "4:3", "3:2", "16:9", "その他"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

type PhotoFilter = "all" | "unused" | "used";
type UploadBatchState = {
  total: number;
  activeIds: string[];
};

function hasAcceptedExtension(fileName: string) {
  const lowerCaseName = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lowerCaseName.endsWith(extension));
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

function getPhotoStatusLabel(photo: UploadedPhoto) {
  switch (photo.status) {
    case "uploading":
      return "アップロード中";
    case "processing":
      return "画像処理中";
    case "error":
      return "エラー";
    default:
      return "";
  }
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

function getPlaceholderCount(photoCount: number) {
  if (photoCount === 0) {
    return 4;
  }

  return photoCount % 2 === 0 ? 2 : 1;
}

function getSectionSortWeight(label: string) {
  const presetIndex = ASPECT_RATIO_ORDER.indexOf(label);
  return presetIndex >= 0 ? presetIndex : ASPECT_RATIO_ORDER.length;
}

export default function RightSidebar() {
  const searchParams = useSearchParams();
  const albumId = searchParams.get("id") ?? undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  const metadataRequestsRef = useRef(new Set<string>());
  const photos = useEditorStore((s) => s.photos);
  const upsertPhoto = useEditorStore((s) => s.upsertPhoto);
  const patchPhoto = useEditorStore((s) => s.patchPhoto);
  const removePhoto = useEditorStore((s) => s.removePhoto);
  const placePhotoInSelectedSlot = useEditorStore((s) => s.placePhotoInSelectedSlot);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("all");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [uploadBatch, setUploadBatch] = useState<UploadBatchState | null>(null);
  const apiUploadEnabled = isApiUploadEnabled(albumId);
  const hasPhotos = photos.length > 0;

  useEffect(() => {
    if (!apiUploadEnabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const existingPhotos = await fetchAlbumPhotos(albumId);
        if (cancelled || existingPhotos.length === 0) {
          return;
        }

        existingPhotos.forEach((photo) => upsertPhoto(photo));
      } catch (error) {
        console.error("Failed to fetch album media", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [albumId, apiUploadEnabled, upsertPhoto]);

  useEffect(() => {
    photos.forEach((photo) => {
      if (photo.aspectRatioLabel || !photo.thumbnailUrl) {
        return;
      }

      if (metadataRequestsRef.current.has(photo.id)) {
        return;
      }

      metadataRequestsRef.current.add(photo.id);

      void (async () => {
        try {
          const metadata = photo.source === "api"
            ? await extractImageMetadataFromUrl(photo.previewUrl ?? photo.thumbnailUrl)
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

  const uploadSummary = useMemo(() => {
    if (!uploadBatch || uploadBatch.activeIds.length === 0) {
      return null;
    }

    const progressLookup = new Map(
      photos.map((photo) => [photo.id, Math.max(0, Math.min(photo.progress, 100))]),
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

  useEffect(() => {
    if (uploadBatch && uploadBatch.activeIds.length === 0) {
      setUploadBatch(null);
    }
  }, [uploadBatch]);

  const openFileDialog = () => {
    inputRef.current?.click();
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

    const drafts = validFiles.map((file) => ({
      file,
      draft: createPhotoDraft(file, apiUploadEnabled ? "api" : "demo"),
    }));

    drafts.forEach(({ draft }) => upsertPhoto(draft));
    registerUploadBatch(drafts.map(({ draft }) => draft.id));

    drafts.forEach(({ file, draft }) => {
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
          const result = await uploadPhotoFile(file, {
            albumId,
            signal: abortController.signal,
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
        } catch (error) {
          if (isAbortError(error)) {
            removePhoto(draft.id);
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
          window.alert(message);
        } finally {
          uploadControllersRef.current.delete(draft.id);
          settleUpload(draft.id);
        }
      })();
    });
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList && fileList.length > 0) {
      handleFiles(Array.from(fileList));
    }

    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFileDialog();
    }
  };

  return (
    <div className="editor-sidebar-right">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        multiple
        hidden
        onChange={handleInputChange}
      />

      {hasPhotos ? (
        <div
          className="editor-photo-library"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="editor-photo-library__toolbar">
            <label className="editor-photo-library__filter-label">
              <select
                className="editor-photo-library__filter"
                aria-label="写真の絞り込み"
                value={photoFilter}
                onChange={(event) =>
                  setPhotoFilter(event.target.value as PhotoFilter)
                }
              >
                <option value="all">すべての写真</option>
                <option value="unused">未使用の写真</option>
                <option value="used">使用中の写真</option>
              </select>
            </label>
          </div>

          <div className="editor-photo-library__sections">
            {photoSections.length > 0 ? (
              photoSections.map((section) => {
                const isOpen = openSections[section.label] ?? true;

                return (
                  <section
                    key={section.label}
                    className="editor-photo-section"
                  >
                    <button
                      type="button"
                      className="editor-photo-section__header"
                      onClick={() => toggleSection(section.label)}
                    >
                      <span
                        className={`editor-photo-section__chevron ${isOpen ? "editor-photo-section__chevron--open" : ""}`}
                        aria-hidden="true"
                      >
                        ⌄
                      </span>
                      <span className="editor-photo-section__title">
                        {section.label}
                      </span>
                      <span className="editor-photo-section__count">
                        ({section.items.length})
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="editor-photo-section__grid">
                        {section.items.map((photo) => {
                          const isDisabled =
                            photo.status === "error" || !photo.thumbnailUrl;
                          const statusLabel = getPhotoStatusLabel(photo);

                          return (
                            <button
                              key={photo.id}
                              type="button"
                              className={`editor-photo-card ${photo.used ? "editor-photo-card--used" : ""}`}
                              title={photo.fileName}
                              disabled={isDisabled}
                              onClick={() => placePhotoInSelectedSlot(photo.id)}
                            >
                              {photo.thumbnailUrl ? (
                                <img
                                  className="editor-photo-card__image"
                                  src={photo.thumbnailUrl}
                                  alt={photo.fileName}
                                  loading="lazy"
                                />
                              ) : null}
                              {statusLabel ? (
                                <span className="editor-photo-card__status">
                                  {statusLabel}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}

                        {Array.from({
                          length: getPlaceholderCount(section.items.length),
                        }).map((_, index) => (
                          <button
                            key={`${section.label}-placeholder-${index}`}
                            type="button"
                            className="editor-photo-card editor-photo-card--placeholder"
                            aria-label="写真を追加する"
                            onClick={openFileDialog}
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })
            ) : (
              <div
                className="editor-photo-library__empty"
                role="button"
                tabIndex={0}
                onClick={openFileDialog}
                onKeyDown={handleKeyDown}
              >
                表示できる写真がまだありません
              </div>
            )}
          </div>

          {uploadSummary ? (
            <div className="editor-upload-footer">
              <div className="editor-upload-footer__meta">
                <span className="editor-upload-footer__label">
                  アップロード中...
                </span>
                <span className="editor-upload-footer__count">
                  {uploadSummary.completedCount}/{uploadSummary.total}
                </span>
              </div>
              <div
                className="editor-upload-footer__bar"
                aria-label={`アップロード進捗 ${uploadSummary.progress}%`}
              >
                <span
                  className="editor-upload-footer__bar-fill"
                  style={{ width: `${uploadSummary.progress}%` }}
                />
              </div>
              <button
                type="button"
                className="editor-upload-footer__cancel"
                onClick={cancelUploads}
              >
                アップロードを中止
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="editor-upload-area"
          role="button"
          tabIndex={0}
          aria-label="写真をアップロードする"
          onClick={openFileDialog}
          onKeyDown={handleKeyDown}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="editor-upload-area__body">
            <div className="editor-upload-area__icon" aria-hidden="true">
              <PlusIcon />
            </div>
            <div className="editor-upload-area__text">
              <span>ドラッグ&ドロップ</span>
              <br />
              <span>または</span>
              <br />
              <span className="editor-upload-area__text--bold">
                ファイルを開く
              </span>
            </div>
            <div className="editor-upload-area__hint">
              アップロード可能フォーマット：
              <br />
              JPG, PNG
              <br />
              1回のアップロードで50MBまで
            </div>
          </div>

          <div className="editor-qr-area">
            <img
              className="editor-qr-area__code"
              src="/images/qr-code-sample.png"
              alt="スマホアップロード用QRコード"
            />
            <div className="editor-qr-area__text">
              スマホから
              <br />
              アップロードもできます
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
