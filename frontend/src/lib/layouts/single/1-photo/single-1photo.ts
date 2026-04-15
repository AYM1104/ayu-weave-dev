import type { LayoutTemplate } from "../../types";
import { MARGIN, INNER_W, INNER_H } from "../../shared";

/** 単ページ 1枚: 全面（ヌリタシなし） */
export const single1Full: LayoutTemplate = {
  id: "single-1photo-full",
  name: "全面",
  category: "1枚",
  slots: [
    { id: "s1", x: 0, y: 0, width: 1, height: 1, photoId: null },
  ],
};

/** 単ページ 1枚: 余白つき中央 */
export const single1Center: LayoutTemplate = {
  id: "single-1photo-center",
  name: "中央",
  category: "1枚",
  slots: [
    { id: "s1", x: MARGIN, y: MARGIN, width: INNER_W, height: INNER_H, photoId: null },
  ],
};

/** 単ページ 1枚: 中央縦長（元SVG比率） */
export const single1TallCenter: LayoutTemplate = {
  id: "single-1photo-tall-center",
  name: "中央縦長",
  category: "1枚",
  slots: [
    { id: "s1", x: 16 / 182, y: 0, width: 150 / 182, height: 1, photoId: null },
  ],
};

/** 単ページ 1枚: 上部配置（テキスト余白あり） */
export const single1Top: LayoutTemplate = {
  id: "single-1photo-top",
  name: "上部",
  category: "1枚",
  slots: [
    { id: "s1", x: MARGIN, y: MARGIN, width: INNER_W, height: 0.65, photoId: null },
  ],
};

/** 単ページ 1枚: 上部全面（元SVG比率） */
export const single1TopFullWidth: LayoutTemplate = {
  id: "single-1photo-top-full-width",
  name: "上部全面",
  category: "1枚",
  slots: [
    { id: "s1", x: 0, y: 0, width: 1, height: 196 / 257, photoId: null },
  ],
};

/** 単ページ 1枚: 下部配置（テキスト余白あり） */
export const single1Bottom: LayoutTemplate = {
  id: "single-1photo-bottom",
  name: "下部",
  category: "1枚",
  slots: [
    { id: "s1", x: MARGIN, y: 0.3, width: INNER_W, height: 0.65, photoId: null },
  ],
};

/** 単ページ 1枚: 中央横長（元SVG比率） */
export const single1WideCenter: LayoutTemplate = {
  id: "single-1photo-wide-center",
  name: "中央横長",
  category: "1枚",
  slots: [
    { id: "s1", x: 8 / 182, y: 78 / 257, width: 166 / 182, height: 102 / 257, photoId: null },
  ],
};

/** 単ページ 1枚: 中央横長小（元SVG比率） */
export const single1WideCenterSmall: LayoutTemplate = {
  id: "single-1photo-wide-center-small",
  name: "中央横長小",
  category: "1枚",
  slots: [
    { id: "s1", x: 18 / 182, y: 83 / 257, width: 145 / 182, height: 91 / 257, photoId: null },
  ],
};

/** 単ページ 1枚: 中央大（元SVG比率） */
export const single1CenterLarge: LayoutTemplate = {
  id: "single-1photo-center-large",
  name: "中央大",
  category: "1枚",
  slots: [
    { id: "s1", x: 28 / 182, y: 61 / 257, width: 126 / 182, height: 120 / 257, photoId: null },
  ],
};

/** 単ページ 1枚: 中央縦長中（元SVG比率） */
export const single1CenterPortrait: LayoutTemplate = {
  id: "single-1photo-center-portrait",
  name: "中央縦長中",
  category: "1枚",
  slots: [
    { id: "s1", x: 37 / 182, y: 53 / 257, width: 107 / 182, height: 151 / 257, photoId: null },
  ],
};

/** 単ページ 1枚: 左上寄せ（元SVG比率） */
export const single1TopLeftLarge: LayoutTemplate = {
  id: "single-1photo-top-left-large",
  name: "左上寄せ",
  category: "1枚",
  slots: [
    { id: "s1", x: 0, y: 0, width: 155 / 182, height: 225 / 257, photoId: null },
  ],
};

/** 単ページ 1枚: 右下寄せ（元SVG比率） */
export const single1BottomRight: LayoutTemplate = {
  id: "single-1photo-bottom-right",
  name: "右下寄せ",
  category: "1枚",
  slots: [
    { id: "s1", x: 56 / 182, y: 80 / 257, width: 108 / 182, height: 159 / 257, photoId: null },
  ],
};

/** 単ページ 1枚: 余白小（元SVG比率） */
export const single1InsetSmall: LayoutTemplate = {
  id: "single-1photo-inset-sm",
  name: "余白小",
  category: "1枚",
  slots: [
    { id: "s1", x: 9 / 182, y: 10 / 257, width: 164 / 182, height: 237 / 257, photoId: null },
  ],
};

/** 単ページ 1枚: 丸型中央 */
export const single1Circle: LayoutTemplate = {
  id: "single-1photo-circle",
  name: "丸型",
  category: "1枚",
  slots: [
    { id: "s1", x: 0.15, y: 0.1, width: 0.7, height: 0.8, borderRadius: 50, photoId: null },
  ],
};
