/**
 * エディター機能の型定義
 *
 * レイアウト関連の型（PhotoSlot / LayoutTemplate / LayoutCategory）は
 * src/lib/layouts/types.ts で管理し、ここから再エクスポートする。
 */

import type { PhotoSlot } from "@/lib/layouts/types";

export type { PhotoSlot, LayoutTemplate, LayoutCategory } from "@/lib/layouts/types";

/** アルバムのページ */
export interface AlbumPage {
  id: string;
  /** ページ番号（0始まり、表紙=0） */
  pageNumber: number;
  /** 適用中のレイアウトテンプレートID */
  layoutId: string;
  /** スロットと写真の紐付け（テンプレートのslotIdをキーに上書き） */
  slots: PhotoSlot[];
}

/** アップロード済みの写真 */
export interface UploadedPhoto {
  id: string;
  /** 表示用のURL（ObjectURL or サムネイルURL） */
  thumbnailUrl: string;
  /** ファイル名 */
  fileName: string;
  /** 使用済みフラグ（いずれかのページに配置済みか） */
  used: boolean;
}

/** Undo/Redo 用のアクション記録 */
export interface EditorAction {
  type: string;
  payload: unknown;
  /** 元に戻すための逆操作データ */
  inverse: unknown;
}

/** ビュー表示モード */
export type ViewMode = "spread" | "grid";
