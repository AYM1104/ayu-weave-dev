import type { LayoutTemplate } from "../types";
import { GAP, MARGIN, INNER_W } from "../shared";

const ROW_H = (1 - MARGIN * 2 - GAP) / 2;

/** 見開き: 左右2分割 */
export const spread2photoCols: LayoutTemplate = {
  id: "spread-2photo-cols",
  name: "左右2枚",
  category: "見開き",
  slots: [
    { id: "s1", x: MARGIN,                   y: MARGIN, width: (INNER_W - GAP) / 2, height: 1 - MARGIN * 2, photoId: null },
    { id: "s2", x: MARGIN + (INNER_W - GAP) / 2 + GAP, y: MARGIN, width: (INNER_W - GAP) / 2, height: 1 - MARGIN * 2, photoId: null },
  ],
};

/** 見開き: 4分割（2×2グリッド） */
export const spread2photoGrid: LayoutTemplate = {
  id: "spread-2photo-grid",
  name: "上下2枚",
  category: "見開き",
  slots: [
    { id: "s1", x: MARGIN, y: MARGIN,           width: INNER_W, height: ROW_H, photoId: null },
    { id: "s2", x: MARGIN, y: MARGIN + ROW_H + GAP, width: INNER_W, height: ROW_H, photoId: null },
  ],
};

/** 見開き: 左大+右小（元SVG比率） */
export const spread2photoFeatureRight: LayoutTemplate = {
  id: "spread-2photo-feature-right",
  name: "左大+右小",
  category: "見開き",
  slots: [
    { id: "s1", x: 46 / 364,  y: 68 / 257, width: 206 / 364, height: 120 / 257, photoId: null },
    { id: "s2", x: 264 / 364, y: 68 / 257, width: 82 / 364,  height: 120 / 257, photoId: null },
  ],
};
