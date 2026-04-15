import type { LayoutCategory } from "../types";
import {
  spread1photoFull,
  spread1photoBleed,
  spread1photoHero,
  spread1photoBottomWide,
} from "./spread-1photo";
import {
  spread2photoCols,
  spread2photoGrid,
  spread2photoFeatureRight,
} from "./spread-2photo";
import { spread4photoGrid }                    from "./spread-4photo";

const layouts = [
  spread1photoFull,
  spread1photoBleed,
  spread1photoHero,
  spread1photoBottomWide,
  spread2photoCols,
  spread2photoGrid,
  spread2photoFeatureRight,
  spread4photoGrid,
];

export const spreadCategory: LayoutCategory = {
  id: "spread",
  name: "見開き",
  count: layouts.length,
  layouts,
};
