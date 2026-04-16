/**
 * エディター用モックデータ
 *
 * デモ画面用のダミーデータ。バックエンド連携前のUI検証に使用する。
 * レイアウトテンプレートは src/lib/layouts/ で管理。
 */
import type { AlbumPage, UploadedPhoto } from "../types/editor";
import { ALL_LAYOUTS } from "@/lib/layouts/registry";

/* ─── モックページデータ（15ページ） ─── */

function createMockPage(pageNumber: number, layoutId: string): AlbumPage {
  const layout = ALL_LAYOUTS.find((l) => l.id === layoutId) ?? ALL_LAYOUTS[0];
  return {
    id: `page-${pageNumber}`,
    pageNumber,
    layoutId: layout.id,
    slots: layout.slots.map((slot) => ({ ...slot })),
  };
}

export const mockPages: AlbumPage[] = [
  // 表紙
  createMockPage(0, "single-1photo-full"),

  // 本文ページ
  createMockPage(1, "spread-1photo-full"),
  createMockPage(2, "spread-2photo-cols"),
  createMockPage(3, "single-2photo-center-stack"),
  createMockPage(4, "single-1photo-bottom-right"),
  createMockPage(5, "spread-1photo-hero"),
  createMockPage(6, "single-3photo-top-hero-inset"),
  createMockPage(7, "single-multi-6inset-grid"),
  createMockPage(8, "spread-4photo-grid"),
  createMockPage(9, "single-text-photo-caption"),
  createMockPage(10, "single-1photo-wide-center"),
  createMockPage(11, "spread-1photo-full"),
  createMockPage(12, "single-2photo-rows-inset"),
  createMockPage(13, "single-multi-5step"),
  createMockPage(14, "single-1photo-top-full-width"),
  createMockPage(15, "spread-2photo-cols"),
  createMockPage(16, "single-2photo-center-stack"),
  createMockPage(17, "single-1photo-bottom-right"),
  createMockPage(18, "spread-1photo-hero"),
  createMockPage(19, "single-3photo-top-hero-inset"),
  createMockPage(20, "single-multi-6inset-grid"),
  createMockPage(21, "spread-4photo-grid"),
  createMockPage(22, "single-text-photo-caption"),
  createMockPage(23, "single-1photo-wide-center"),
  createMockPage(24, "spread-1photo-full"),
  createMockPage(25, "single-2photo-rows-inset"),
  createMockPage(26, "single-multi-5step"),
  createMockPage(27, "single-1photo-top-full-width"),
  createMockPage(28, "spread-1photo-full"),
  createMockPage(29, "spread-2photo-cols"),

  // 背表紙
  createMockPage(30, "single-1photo-full"),
];

/* ─── モック写真データ ─── */

export const mockPhotos: UploadedPhoto[] = [];
// Array.from({ length: 8 }, (_, i) => ({
//   id: `photo-${i + 1}`,
//   thumbnailUrl: `https://picsum.photos/seed/weave${i + 1}/200/200`,
//   fileName: `wedding_${String(i + 1).padStart(3, "0")}.jpg`,
//   used: false,
// }));
