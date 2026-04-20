import type {
  CoverMaterialId,
  CoverPageOptionId,
  CoverThemeId,
} from "../types/editor";

export interface CoverThemeOption {
  id: CoverThemeId;
  label: string;
  surface: string;
  surfaceStrong: string;
  backdrop: string;
  ink: string;
  spine: string;
  monogram: string;
  shadow: string;
  swatch: string;
}

export interface CoverPageOption {
  id: CoverPageOptionId;
  title: string;
  detail: string;
  priceLabel?: string;
}

export interface CoverMaterialOption {
  id: CoverMaterialId;
  label: string;
}

export const COVER_THEME_OPTIONS: CoverThemeOption[] = [
  {
    id: "ivory",
    label: "ホワイト",
    surface: "#f5f0e8",
    surfaceStrong: "#f0e8dc",
    backdrop:
      "radial-gradient(circle at top, rgba(255,255,255,0.92), rgba(245, 240, 232, 0.88) 42%, rgba(237, 229, 219, 0.94) 100%)",
    ink: "#4a4030",
    spine: "rgba(234, 226, 216, 0.92)",
    monogram: "rgba(74, 64, 48, 0.12)",
    shadow: "rgba(92, 77, 54, 0.12)",
    swatch:
      "linear-gradient(135deg, #fffdf8 0%, #f2eadf 58%, #e2d8c9 100%)",
  },
  {
    id: "blush",
    label: "ローズ",
    surface: "#f7ebe7",
    surfaceStrong: "#f0ddd6",
    backdrop:
      "radial-gradient(circle at top, rgba(255,255,255,0.92), rgba(247, 235, 231, 0.9) 44%, rgba(235, 213, 205, 0.96) 100%)",
    ink: "#5b4039",
    spine: "rgba(237, 214, 206, 0.9)",
    monogram: "rgba(91, 64, 57, 0.13)",
    shadow: "rgba(104, 74, 67, 0.13)",
    swatch:
      "linear-gradient(135deg, #fce9e4 0%, #eaa0a3 52%, #cd6e7d 100%)",
  },
  {
    id: "rose",
    label: "ピンク",
    surface: "#f5e5eb",
    surfaceStrong: "#edd3dc",
    backdrop:
      "radial-gradient(circle at top, rgba(255,255,255,0.9), rgba(245, 229, 235, 0.88) 42%, rgba(231, 203, 215, 0.95) 100%)",
    ink: "#5d3d4b",
    spine: "rgba(232, 209, 218, 0.92)",
    monogram: "rgba(93, 61, 75, 0.14)",
    shadow: "rgba(99, 68, 80, 0.13)",
    swatch:
      "linear-gradient(135deg, #f8d2de 0%, #d57a9d 54%, #b3487f 100%)",
  },
  {
    id: "mist",
    label: "ブルー",
    surface: "#eaf0f4",
    surfaceStrong: "#d9e5ed",
    backdrop:
      "radial-gradient(circle at top, rgba(255,255,255,0.92), rgba(234, 240, 244, 0.9) 44%, rgba(210, 225, 236, 0.96) 100%)",
    ink: "#364651",
    spine: "rgba(219, 229, 237, 0.92)",
    monogram: "rgba(54, 70, 81, 0.12)",
    shadow: "rgba(68, 86, 98, 0.12)",
    swatch:
      "linear-gradient(135deg, #d7ebf6 0%, #89adc2 55%, #587990 100%)",
  },
  {
    id: "sage",
    label: "グリーン",
    surface: "#e8eee6",
    surfaceStrong: "#d7e0d4",
    backdrop:
      "radial-gradient(circle at top, rgba(255,255,255,0.92), rgba(232, 238, 230, 0.9) 44%, rgba(212, 223, 208, 0.96) 100%)",
    ink: "#404b3c",
    spine: "rgba(217, 225, 213, 0.92)",
    monogram: "rgba(64, 75, 60, 0.12)",
    shadow: "rgba(70, 81, 67, 0.12)",
    swatch:
      "linear-gradient(135deg, #dce7d7 0%, #91a38d 55%, #5b6c59 100%)",
  },
];

export const COVER_PAGE_OPTIONS: CoverPageOption[] = [
  {
    id: "standard",
    title: "基本的なアルバム",
    detail: "30ページ",
  },
  {
    id: "volume",
    title: "かなりたっぷり入る",
    detail: "50ページ",
    priceLabel: "+70,000",
  },
];

export const COVER_MATERIAL_OPTIONS: CoverMaterialOption[] = [
  { id: "leather", label: "革" },
  { id: "matte", label: "マット" },
  { id: "rough", label: "ざらざら" },
  { id: "soft-matte", label: "ソフトマット" },
];

export function getCoverThemeOption(themeId: CoverThemeId) {
  return (
    COVER_THEME_OPTIONS.find((theme) => theme.id === themeId) ??
    COVER_THEME_OPTIONS[0]
  );
}
