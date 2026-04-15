import type { LayoutCategory } from "../../types";
import {
  single3CenterStack,
  single3TopHeroInset,
} from "./single-3photo";

const layouts = [
  single3CenterStack,
  single3TopHeroInset,
];

export const single3Category: LayoutCategory = {
  id: "single-3",
  name: "3枚",
  count: layouts.length,
  layouts,
};
