import type { LayoutCategory } from "../../types";
import {
  single2CenterStack,
  single2DiagonalWide,
  single2RowsInset,
} from "./single-2photo";

const layouts = [
  single2CenterStack,
  single2DiagonalWide,
  single2RowsInset,
];

export const single2Category: LayoutCategory = {
  id: "single-2",
  name: "2枚",
  count: layouts.length,
  layouts,
};
