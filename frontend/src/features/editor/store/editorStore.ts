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

interface EditorState {
  /* ─── データ ─── */
  pages: AlbumPage[];
  layouts: LayoutTemplate[];
  photos: UploadedPhoto[];

  /* ─── UI 状態 ─── */
  currentSpreadIndex: number;
  selectedLayoutCategory: string;
  zoomLevel: number;
  viewMode: ViewMode;

  /* ─── アクション ─── */
  goToSpread: (index: number) => void;
  nextSpread: () => void;
  prevSpread: () => void;
  setLayoutCategory: (category: string) => void;
  applyLayout: (pageIndex: number, layoutId: string) => void;
  setZoom: (level: number) => void;
  setViewMode: (mode: ViewMode) => void;
}

/** 見開き単位でのページ数 */
function getMaxSpreadIndex(pages: AlbumPage[]): number {
  // 表紙(0) + 本文ページを2ページずつ見開きにする
  // 表紙=spread0, page1-2=spread1, page3-4=spread2...
  return Math.ceil((pages.length - 1) / 2);
}

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    /* ─── 初期値（モックデータ） ─── */
    pages: mockPages,
    layouts: ALL_LAYOUTS,
    photos: mockPhotos,

    currentSpreadIndex: 1, // 最初の見開き（表紙の次）
    selectedLayoutCategory: "全て",
    zoomLevel: 70,
    viewMode: "spread",

    /* ─── アクション ─── */
    goToSpread: (index) =>
      set((state) => {
        const max = getMaxSpreadIndex(state.pages);
        state.currentSpreadIndex = Math.max(0, Math.min(index, max));
      }),

    nextSpread: () =>
      set((state) => {
        const max = getMaxSpreadIndex(state.pages);
        if (state.currentSpreadIndex < max) {
          state.currentSpreadIndex += 1;
        }
      }),

    prevSpread: () =>
      set((state) => {
        if (state.currentSpreadIndex > 0) {
          state.currentSpreadIndex -= 1;
        }
      }),

    setLayoutCategory: (category) =>
      set((state) => {
        state.selectedLayoutCategory = category;
      }),

    applyLayout: (pageIndex, layoutId) =>
      set((state) => {
        const layout = state.layouts.find((l) => l.id === layoutId);
        if (!layout || !state.pages[pageIndex]) return;
        state.pages[pageIndex].layoutId = layoutId;
        state.pages[pageIndex].slots = layout.slots.map((s) => ({ ...s }));
      }),

    setZoom: (level) =>
      set((state) => {
        state.zoomLevel = Math.max(30, Math.min(150, level));
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
      }),
  })),
);
