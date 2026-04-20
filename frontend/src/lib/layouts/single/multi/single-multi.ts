import type { LayoutTemplate } from "../../types";

/** 単ページ 多枚数: 中央6枚グリッド（元SVG比率） */
export const singleMulti6InsetGrid: LayoutTemplate = {
  id: "single-multi-6inset-grid",
  name: "中央6枚",
  category: "多枚数",
  slots: [
    { id: "s1", x: 16 / 182,  y: 63 / 257,  width: 44 / 182, height: 63 / 257, photoId: null },
    { id: "s2", x: 69 / 182,  y: 63 / 257,  width: 44 / 182, height: 63 / 257, photoId: null },
    { id: "s3", x: 122 / 182, y: 63 / 257,  width: 44 / 182, height: 63 / 257, photoId: null },
    { id: "s4", x: 16 / 182,  y: 131 / 257, width: 44 / 182, height: 63 / 257, photoId: null },
    { id: "s5", x: 69 / 182,  y: 131 / 257, width: 44 / 182, height: 63 / 257, photoId: null },
    { id: "s6", x: 122 / 182, y: 131 / 257, width: 44 / 182, height: 63 / 257, photoId: null },
  ],
};

/** 単ページ 多枚数: 上中央+中段3枚+下左（元SVG比率） */
export const singleMulti5Step: LayoutTemplate = {
  id: "single-multi-5step",
  name: "5枚ステップ",
  category: "多枚数",
  slots: [
    { id: "s1", x: 79 / 182,  y: 3 / 257,   width: 50 / 182, height: 76 / 257, photoId: null },
    { id: "s2", x: 26 / 182,  y: 82 / 257,  width: 50 / 182, height: 76 / 257, photoId: null },
    { id: "s3", x: 79 / 182,  y: 82 / 257,  width: 50 / 182, height: 76 / 257, photoId: null },
    { id: "s4", x: 132 / 182, y: 82 / 257,  width: 50 / 182, height: 76 / 257, photoId: null },
    { id: "s5", x: 26 / 182,  y: 161 / 257, width: 50 / 182, height: 76 / 257, photoId: null },
  ],
};
