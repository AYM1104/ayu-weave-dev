/**
 * レイアウトカテゴリ レジストリ
 *
 * すべてのカテゴリをまとめて export する唯一の入口。
 * LayoutSelector はこのファイルだけを import する。
 *
 * カテゴリを追加する手順:
 * 1. 対応するフォルダ（single/N-photo/）にレイアウトファイルを追加
 * 2. そのフォルダの index.ts でカテゴリオブジェクトを組み立て
 * 3. このファイルの LAYOUT_CATEGORIES 配列に追記
 */

import { spreadCategory }     from "./spread";
import { single1Category }    from "./single/1-photo";
import { single2Category }    from "./single/2-photo";
import { single3Category }    from "./single/3-photo";
import { single4Category }    from "./single/4-photo";
import { singleMultiCategory } from "./single/multi";
import { singleTextCategory }  from "./single/text";
import type { LayoutCategory } from "./types";

export const LAYOUT_CATEGORIES: LayoutCategory[] = [
  spreadCategory,
  single1Category,
  single2Category,
  single3Category,
  single4Category,
  singleMultiCategory,
  singleTextCategory,
].filter((category) => category.layouts.length > 0);

/** 全レイアウトをフラットに並べた配列（editorStore の layouts に使用） */
export const ALL_LAYOUTS = LAYOUT_CATEGORIES.flatMap((cat) => cat.layouts);
