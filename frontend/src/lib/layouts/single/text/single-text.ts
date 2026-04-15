import type { LayoutTemplate } from "../../types";

/**
 * テキスト主体レイアウト
 *
 * slots は空（写真なし）。将来テキストスロット型が追加された際に拡張する。
 * 現時点ではサムネイル表示用にダミーのスロット1つを持つ。
 */

/** 単ページ テキスト: 引用テキスト（中央余白） */
export const singleTextQuote: LayoutTemplate = {
  id: "single-text-quote",
  name: "引用テキスト",
  category: "テキスト",
  slots: [],
};

/** 単ページ テキスト: 写真＋テキスト下部 */
export const singleTextPhotoCaption: LayoutTemplate = {
  id: "single-text-photo-caption",
  name: "写真+キャプション",
  category: "テキスト",
  slots: [
    { id: "s1", x: 0.1, y: 0.35, width: 0.8, height: 0.55, photoId: null },
  ],
};
