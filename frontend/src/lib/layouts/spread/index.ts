import type { LayoutCategory } from "../types";
import {
  spread1photoBleed,
  spread1photoBottomWide,
} from "./spread-1photo";
import {
  spread2photoFeatureRight,
} from "./spread-2photo";

const layouts = [
  spread1photoBleed,
  spread1photoBottomWide,
  spread2photoFeatureRight,
];

export const spreadCategory: LayoutCategory = {
  id: "spread",
  name: "見開き",
  count: layouts.length,
  layouts,
};
