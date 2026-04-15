import type { LayoutTemplate } from "../types";
import { GAP, MARGIN, INNER_W, INNER_H } from "../shared";

const COL_W = (INNER_W - GAP) / 2;
const ROW_H = (INNER_H - GAP) / 2;

/** 見開き: 4分割（2×2グリッド） */
export const spread4photoGrid: LayoutTemplate = {
  id: "spread-4photo-grid",
  name: "4枚グリッド",
  category: "見開き",
  slots: [
    { id: "s1", x: MARGIN,           y: MARGIN,           width: COL_W, height: ROW_H, photoId: null },
    { id: "s2", x: MARGIN + COL_W + GAP, y: MARGIN,       width: COL_W, height: ROW_H, photoId: null },
    { id: "s3", x: MARGIN,           y: MARGIN + ROW_H + GAP, width: COL_W, height: ROW_H, photoId: null },
    { id: "s4", x: MARGIN + COL_W + GAP, y: MARGIN + ROW_H + GAP, width: COL_W, height: ROW_H, photoId: null },
  ],
};
