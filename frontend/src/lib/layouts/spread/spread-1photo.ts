import type { LayoutTemplate } from "../types";
import { GAP, MARGIN, INNER_W, INNER_H } from "../shared";

/** 見開き: 全面1枚 */
export const spread1photoFull: LayoutTemplate = {
  id: "spread-1photo-full",
  name: "全面1枚",
  category: "見開き",
  slots: [
    { id: "s1", x: MARGIN, y: MARGIN, width: INNER_W, height: INNER_H, photoId: null },
  ],
};

/** 見開き: 余白なし全面 */
export const spread1photoBleed: LayoutTemplate = {
  id: "spread-1photo-bleed",
  name: "余白なし全面",
  category: "見開き",
  slots: [
    { id: "s1", x: 0, y: 0, width: 1, height: 1, photoId: null },
  ],
};

/** 見開き: 上下2分割 */
export const spread1photoHero: LayoutTemplate = {
  id: "spread-1photo-hero",
  name: "ヒーロー1枚",
  category: "見開き",
  slots: [
    { id: "s1", x: MARGIN, y: 0.07, width: INNER_W, height: 0.86, photoId: null },
  ],
};

/** 見開き: 下寄せワイド（元SVG比率） */
export const spread1photoBottomWide: LayoutTemplate = {
  id: "spread-1photo-bottom-wide",
  name: "下寄せワイド",
  category: "見開き",
  slots: [
    { id: "s1", x: 13 / 364, y: 79 / 257, width: 284 / 364, height: 160 / 257, photoId: null },
  ],
};
