/**
 * エディター機能の型定義
 *
 * レイアウト関連の型（PhotoSlot / LayoutTemplate / LayoutCategory）は
 * src/lib/layouts/types.ts で管理し、ここから再エクスポートする。
 */

import type { PhotoSlot } from "@/lib/layouts/types";

export type { PhotoSlot, LayoutTemplate, LayoutCategory } from "@/lib/layouts/types";

export type CoverThemeId = "ivory" | "blush" | "rose" | "mist" | "sage";

export type CoverMaterialId = "leather" | "matte" | "rough" | "soft-matte";

export type CoverPageOptionId = "standard" | "volume";

export interface CoverDesign {
  themeId: CoverThemeId;
  materialId: CoverMaterialId;
  pageOptionId: CoverPageOptionId;
  title: string;
  subtitle: string;
  spineLabel: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
}

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
export type UploadedPhotoStatus =
  | "uploading"
  | "processing"
  | "ready"
  | "error";

export type UploadedPhotoSource = "demo" | "api";

export interface UploadedPhoto {
  id: string;
  /** API 上の media ID */
  mediaId?: string;
  /** 表示用のURL（ObjectURL or サムネイルURL） */
  thumbnailUrl: string;
  /** サーバー生成済み preview URL */
  previewUrl?: string;
  /** ファイル名 */
  fileName: string;
  /** MIME type */
  mimeType: string;
  /** バイト数 */
  byteSize: number;
  /** 元画像の幅 */
  width?: number;
  /** 元画像の高さ */
  height?: number;
  /** 比率グルーピング用ラベル */
  aspectRatioLabel?: string;
  /** アップロード進捗 (0-100) */
  progress: number;
  /** アップロード状態 */
  status: UploadedPhotoStatus;
  /** どの経路で追加されたか */
  source: UploadedPhotoSource;
  /** 使用済みフラグ（いずれかのページに配置済みか） */
  used: boolean;
  /** エラー表示用メッセージ */
  error?: string;
  /** 追加日時 */
  createdAt: number;
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
