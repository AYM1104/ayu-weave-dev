/**
 * レイアウトテンプレートの型定義
 *
 * features/editor/ に依存しない純粋な型。
 * 座標系はすべて 0〜1 の相対値。
 */

/** 写真スロット — ページ内の写真配置枠 */
export interface PhotoSlot {
  id: string;
  /** ページ左端からの相対位置 (0〜1) */
  x: number;
  /** ページ上端からの相対位置 (0〜1) */
  y: number;
  /** スロット幅（相対値） */
  width: number;
  /** スロット高さ（相対値） */
  height: number;
  /** 角丸。0〜50 の % 値。50 で円形。 */
  borderRadius?: number;
  /** 配置済み写真 ID（未配置は null） */
  photoId: string | null;
}

/** レイアウトテンプレート */
export interface LayoutTemplate {
  id: string;
  /** サイドバー表示名 */
  name: string;
  /** 所属カテゴリ名（"見開き" / "1枚" / "2枚" など） */
  category: string;
  /** スロット配置定義 */
  slots: PhotoSlot[];
}

/** サイドバーに表示するカテゴリグループ */
export interface LayoutCategory {
  /** プログラム内識別子 */
  id: string;
  /** サイドバー表示名 */
  name: string;
  /** レイアウト数（表示用） */
  count: number;
  /** このカテゴリに属するテンプレート一覧 */
  layouts: LayoutTemplate[];
}
