import type { LayoutTemplate } from "../../types";

/** 単ページ 3枚: 中央3連（元SVG比率） */
export const single3CenterStack: LayoutTemplate = {
  id: "single-3photo-center-stack",
  name: "中央3連",
  category: "3枚",
  slots: [
    { id: "s1", x: 62 / 182, y: 31 / 257,  width: 58 / 182, height: 58 / 257, photoId: null },
    { id: "s2", x: 62 / 182, y: 91 / 257,  width: 58 / 182, height: 58 / 257, photoId: null },
    { id: "s3", x: 62 / 182, y: 151 / 257, width: 58 / 182, height: 58 / 257, photoId: null },
  ],
};

/** 単ページ 3枚: 上大+下2余白（元SVG比率） */
export const single3TopHeroInset: LayoutTemplate = {
  id: "single-3photo-top-hero-inset",
  name: "上大+下2余白",
  category: "3枚",
  slots: [
    { id: "s1", x: 18 / 182, y: 25 / 257,  width: 146 / 182, height: 102 / 257, photoId: null },
    { id: "s2", x: 18 / 182, y: 131 / 257, width: 71 / 182,  height: 101 / 257, photoId: null },
    { id: "s3", x: 93 / 182, y: 131 / 257, width: 71 / 182,  height: 101 / 257, photoId: null },
  ],
};
