import type { LayoutCategory } from "../../types";
import { singleTextQuote, singleTextPhotoCaption } from "./single-text";

const layouts = [singleTextQuote, singleTextPhotoCaption];

export const singleTextCategory: LayoutCategory = {
  id: "single-text",
  name: "テキスト",
  count: layouts.length,
  layouts,
};
