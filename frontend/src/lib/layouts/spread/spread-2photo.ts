import type { LayoutTemplate } from "../types";
import { GAP, MARGIN, INNER_W } from "../shared";

const ROW_H = (1 - MARGIN * 2 - GAP) / 2;

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
