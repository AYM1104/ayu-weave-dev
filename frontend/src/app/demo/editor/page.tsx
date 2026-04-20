"use client";

/**
 * エディターデモページ
 *
 * /demo/editor でアクセス可能。
 * 本番の /album/[id]/edit とは独立した、UI検証用のデモ画面。
 */

import EditorLayout from "@/features/editor/components/EditorLayout";

export default function EditorDemoPage() {
  return <EditorLayout />;
}
