import { type ClassValue, clsx } from "clsx";

/**
 * className ユーティリティ
 * clsx で条件付きクラスを結合する
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
