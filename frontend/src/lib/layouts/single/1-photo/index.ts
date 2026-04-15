import type { LayoutCategory, LayoutTemplate } from "../../types";
import * as single1Layouts from "./single-1photo";

const layoutOrder = [
  "single-1photo-full",
  "single-1photo-tall-center",
  "single-1photo-top-full-width",
  "single-1photo-wide-center",
  "single-1photo-wide-center-small",
  "single-1photo-center-large",
  "single-1photo-center-portrait",
  "single-1photo-top-left-large",
  "single-1photo-bottom-right",
  "single-1photo-inset-sm",
];

const isLayoutTemplate = (value: unknown): value is LayoutTemplate =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "slots" in value;

const layouts = layoutOrder
  .map((id) =>
    Object.values(single1Layouts).find(
      (layout): layout is LayoutTemplate => isLayoutTemplate(layout) && layout.id === id,
    ),
  )
  .filter((layout): layout is LayoutTemplate => layout !== undefined);

export const single1Category: LayoutCategory = {
  id: "single-1",
  name: "1枚",
  count: layouts.length,
  layouts,
};
