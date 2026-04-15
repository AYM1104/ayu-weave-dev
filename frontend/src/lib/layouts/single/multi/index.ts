import type { LayoutCategory } from "../../types";
import {
  singleMulti6InsetGrid,
  singleMulti5Step,
} from "./single-multi";

const layouts = [
  singleMulti6InsetGrid,
  singleMulti5Step,
];

export const singleMultiCategory: LayoutCategory = {
  id: "single-multi",
  name: "多枚数",
  count: layouts.length,
  layouts,
};
