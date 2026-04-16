/**
 * エディター専用 Zustand Store
 *
 * エディター画面に閉じた状態を管理する。
 * グローバルな store/ ではなく features/editor/ 配下に配置。
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  AlbumPage,
  UploadedPhoto,
  ViewMode,
} from "../types/editor";
import type { LayoutTemplate } from "@/lib/layouts/types";
import { ALL_LAYOUTS } from "@/lib/layouts/registry";
import { mockPages, mockPhotos } from "../data/mockData";
import {
  resolveSelectedPageIndex,
  type EditablePageSide,
} from "../utils/pageSelection";

interface EditorState {
  /* ─── データ ─── */
  pages: AlbumPage[];
  layouts: LayoutTemplate[];
  photos: UploadedPhoto[];

  /* ─── UI 状態 ─── */
  currentSpreadIndex: number;
  selectedPageSide: EditablePageSide;
  selectedSlotId: string | null;
  selectedSlotPageIndex: number | null;
  selectedLayoutCategory: string;
  zoomLevel: number;
  viewMode: ViewMode;

  /* ─── アクション ─── */
  goToSpread: (index: number) => void;
  nextSpread: () => void;
  prevSpread: () => void;
  setSelectedPageSide: (side: EditablePageSide) => void;
  setSelectedSlot: (pageIndex: number | null, slotId: string | null) => void;
  setLayoutCategory: (category: string) => void;
  applyLayout: (pageIndex: number, layoutId: string) => void;
  setZoom: (level: number) => void;
  setViewMode: (mode: ViewMode) => void;
  upsertPhoto: (photo: UploadedPhoto) => void;
  patchPhoto: (photoId: string, patch: Partial<UploadedPhoto>) => void;
  removePhoto: (photoId: string) => void;
  placePhotoInSelectedSlot: (photoId: string) => void;
}

/** 見開き単位でのページ数 */
function getMaxSpreadIndex(pages: AlbumPage[]): number {
  // 表紙(0) + 本文ページを2ページずつ見開きにする
  // 表紙=spread0, page1-2=spread1, page3-4=spread2...
  return Math.ceil((pages.length - 1) / 2);
}

function cloneLayoutSlots(layout: LayoutTemplate) {
  return layout.slots.map((slot) => ({ ...slot }));
}

function getSpreadPageIndexes(pageIndex: number) {
  if (pageIndex <= 0) {
    return [pageIndex] as const;
  }

  const leftIndex = pageIndex % 2 === 0 ? pageIndex - 1 : pageIndex;
  return [leftIndex, leftIndex + 1] as const;
}

function getCurrentEditablePageIndex(state: Pick<
  EditorState,
  "currentSpreadIndex" | "selectedPageSide" | "pages"
>) {
  return resolveSelectedPageIndex(
    state.currentSpreadIndex,
    state.selectedPageSide,
    state.pages.length,
  );
}

function isSpreadLayout(state: Pick<EditorState, "pages" | "layouts">, pageIndex: number) {
  const page = state.pages[pageIndex];
  if (!page) {
    return false;
  }

  return (
    state.layouts.find((layout) => layout.id === page.layoutId)?.category ===
    "見開き"
  );
}

function getPhotoSourcePageIndex(
  state: Pick<EditorState, "pages" | "layouts">,
  pageIndex: number,
) {
  if (!isSpreadLayout(state, pageIndex) || pageIndex <= 0) {
    return pageIndex;
  }

  return pageIndex % 2 === 0 ? pageIndex - 1 : pageIndex;
}

function syncSpreadPageSlot(
  state: Pick<EditorState, "pages" | "layouts">,
  pageIndex: number,
  slotId: string,
  photoId: string | null,
) {
  if (!isSpreadLayout(state, pageIndex) || pageIndex <= 0) {
    return;
  }

  const [leftIndex, rightIndex] = getSpreadPageIndexes(pageIndex);
  const leftPage = state.pages[leftIndex];
  const rightPage = state.pages[rightIndex];
  const leftSlot = leftPage?.slots.find((slot) => slot.id === slotId);
  const rightSlot = rightPage?.slots.find((slot) => slot.id === slotId);

  if (leftSlot) {
    leftSlot.photoId = photoId;
  }

  if (rightSlot) {
    rightSlot.photoId = photoId;
  }
}

function recomputePhotoUsage(state: Pick<EditorState, "pages" | "photos">) {
  const usedPhotoIds = new Set(
    state.pages.flatMap((page) =>
      page.slots
        .map((slot) => slot.photoId)
        .filter((photoId): photoId is string => photoId !== null),
    ),
  );

  state.photos.forEach((photo) => {
    photo.used = usedPhotoIds.has(photo.id);
  });
}

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    /* ─── 初期値（モックデータ） ─── */
    pages: mockPages,
    layouts: ALL_LAYOUTS,
    photos: mockPhotos,

    currentSpreadIndex: 1, // 最初の見開き（表紙の次）
    selectedPageSide: "right",
    selectedSlotId: null,
    selectedSlotPageIndex: null,
    selectedLayoutCategory: "全て",
    zoomLevel: 70,
    viewMode: "spread",

    /* ─── アクション ─── */
    goToSpread: (index) =>
      set((state) => {
        const max = getMaxSpreadIndex(state.pages);
        state.currentSpreadIndex = Math.max(0, Math.min(index, max));
        state.selectedSlotId = null;
        state.selectedSlotPageIndex = null;
      }),

    nextSpread: () =>
      set((state) => {
        const max = getMaxSpreadIndex(state.pages);
        if (state.currentSpreadIndex < max) {
          state.currentSpreadIndex += 1;
        }
        state.selectedSlotId = null;
        state.selectedSlotPageIndex = null;
      }),

    prevSpread: () =>
      set((state) => {
        if (state.currentSpreadIndex > 0) {
          state.currentSpreadIndex -= 1;
        }
        state.selectedSlotId = null;
        state.selectedSlotPageIndex = null;
      }),

    setSelectedPageSide: (side) =>
      set((state) => {
        state.selectedPageSide = side;
        state.selectedSlotId = null;
        state.selectedSlotPageIndex = null;
      }),

    setSelectedSlot: (pageIndex, slotId) =>
      set((state) => {
        state.selectedSlotPageIndex = pageIndex;
        state.selectedSlotId = slotId;
      }),

    setLayoutCategory: (category) =>
      set((state) => {
        state.selectedLayoutCategory = category;
      }),

    applyLayout: (pageIndex, layoutId) =>
      set((state) => {
        const layout = state.layouts.find((l) => l.id === layoutId);
        if (!layout || !state.pages[pageIndex]) return;

        if (layout.category === "見開き" && pageIndex > 0) {
          const [leftIndex, rightIndex] = getSpreadPageIndexes(pageIndex);

          if (state.pages[leftIndex]) {
            state.pages[leftIndex].layoutId = layoutId;
            state.pages[leftIndex].slots = cloneLayoutSlots(layout);
          }

          if (state.pages[rightIndex]) {
            state.pages[rightIndex].layoutId = layoutId;
            state.pages[rightIndex].slots = cloneLayoutSlots(layout);
          }

          state.selectedSlotId = null;
          state.selectedSlotPageIndex = null;
          recomputePhotoUsage(state);
          return;
        }

        state.pages[pageIndex].layoutId = layoutId;
        state.pages[pageIndex].slots = cloneLayoutSlots(layout);
        state.selectedSlotId = null;
        state.selectedSlotPageIndex = null;
        recomputePhotoUsage(state);
      }),

    setZoom: (level) =>
      set((state) => {
        state.zoomLevel = Math.max(30, Math.min(150, level));
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
      }),

    upsertPhoto: (photo) =>
      set((state) => {
        const existingIndex = state.photos.findIndex(
          (item) =>
            item.id === photo.id ||
            (!!photo.mediaId && item.mediaId === photo.mediaId),
        );

        if (existingIndex >= 0) {
          const existing = state.photos[existingIndex];
          state.photos[existingIndex] = {
            ...existing,
            ...photo,
            id: existing.id,
            used: existing.used,
          };
        } else {
          state.photos.unshift(photo);
        }

        recomputePhotoUsage(state);
      }),

    patchPhoto: (photoId, patch) =>
      set((state) => {
        const photo = state.photos.find((item) => item.id === photoId);
        if (!photo) {
          return;
        }

        Object.assign(photo, patch);
      }),

    removePhoto: (photoId) =>
      set((state) => {
        state.photos = state.photos.filter((photo) => photo.id !== photoId);

        state.pages.forEach((page) => {
          page.slots.forEach((slot) => {
            if (slot.photoId === photoId) {
              slot.photoId = null;
            }
          });
        });

        recomputePhotoUsage(state);
      }),

    placePhotoInSelectedSlot: (photoId) =>
      set((state) => {
        const preferredPageIndex =
          state.selectedSlotPageIndex ?? getCurrentEditablePageIndex(state);
        const targetPageIndex = getPhotoSourcePageIndex(state, preferredPageIndex);
        const page = state.pages[targetPageIndex];
        if (!page || page.slots.length === 0) {
          return;
        }

        const selectedSlotIndex =
          state.selectedSlotId !== null
            ? page.slots.findIndex((slot) => slot.id === state.selectedSlotId)
            : -1;
        const emptySlotIndex = page.slots.findIndex((slot) => slot.photoId === null);
        const targetSlotIndex =
          selectedSlotIndex >= 0
            ? selectedSlotIndex
            : emptySlotIndex >= 0
              ? emptySlotIndex
              : 0;

        const targetSlot = page.slots[targetSlotIndex];
        if (!targetSlot) {
          return;
        }

        targetSlot.photoId = photoId;
        syncSpreadPageSlot(state, targetPageIndex, targetSlot.id, photoId);
        state.selectedSlotPageIndex = targetPageIndex;
        state.selectedSlotId = targetSlot.id;
        recomputePhotoUsage(state);
      }),
  })),
);
