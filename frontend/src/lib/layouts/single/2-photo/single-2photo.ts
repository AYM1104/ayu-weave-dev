import type { LayoutTemplate } from "../../types";

/** 単ページ 2枚: 中央上下（元SVG比率） */
export const single2CenterStack: LayoutTemplate = {
  id: "single-2photo-center-stack",
  name: "中央上下",
  category: "2枚",
  slots: [
    { id: "s1", x: 50 / 182, y: 44 / 257,  width: 82 / 182, height: 82 / 257, photoId: null },
    { id: "s2", x: 50 / 182, y: 131 / 257, width: 82 / 182, height: 82 / 257, photoId: null },
  ],
};

/** 単ページ 2枚: 斜め横長（元SVG比率） */
export const single2DiagonalWide: LayoutTemplate = {
  id: "single-2photo-diagonal-wide",
  name: "斜め横長",
  category: "2枚",
  slots: [
    { id: "s1", x: 14 / 182, y: 43 / 257,  width: 130 / 182, height: 85 / 257, photoId: null },
    { id: "s2", x: 45 / 182, y: 139 / 257, width: 130 / 182, height: 85 / 257, photoId: null },
  ],
};

/** 単ページ 2枚: 上下横長余白（元SVG比率） */
export const single2RowsInset: LayoutTemplate = {
  id: "single-2photo-rows-inset",
  name: "上下横長余白",
  category: "2枚",
  slots: [
    { id: "s1", x: 18 / 182, y: 35 / 257,  width: 146 / 182, height: 89 / 257, photoId: null },
    { id: "s2", x: 18 / 182, y: 133 / 257, width: 146 / 182, height: 89 / 257, photoId: null },
  ],
};
