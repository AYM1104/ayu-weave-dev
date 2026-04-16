"use client";

/**
 * LayoutSelector — レイアウト選択パネル
 *
 * カテゴリ別のアコーディオン + レイアウトサムネイルグリッド
 */

import { useState } from "react";
import { useEditorStore } from "../../store/editorStore";
import {
  resolveSelectedPageIndex,
  resolveSelectedPageSide,
} from "../../utils/pageSelection";
import { LAYOUT_CATEGORIES } from "@/lib/layouts/registry";
import LayoutThumbnail from "./LayoutThumbnail";

export default function LayoutSelector() {
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(LAYOUT_CATEGORIES.map((c) => c.name)),
  );
  const pages = useEditorStore((s) => s.pages);
  const currentSpreadIndex = useEditorStore((s) => s.currentSpreadIndex);
  const selectedPageSide = useEditorStore((s) => s.selectedPageSide);
  const applyLayout = useEditorStore((s) => s.applyLayout);
  const selectedLayoutCategory = useEditorStore(
    (s) => s.selectedLayoutCategory,
  );
  const setLayoutCategory = useEditorStore((s) => s.setLayoutCategory);

  const currentPageIndex = resolveSelectedPageIndex(
    currentSpreadIndex,
    selectedPageSide,
    pages.length,
  );
  const currentEditableSide = resolveSelectedPageSide(
    currentSpreadIndex,
    selectedPageSide,
    pages.length,
  );
  const currentLayoutId = pages[currentPageIndex]?.layoutId ?? "";
  const currentTargetLabel =
    currentSpreadIndex === 0
      ? "表紙"
      : currentEditableSide === "left"
        ? "左ページ"
        : "右ページ";

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleSelectLayout = (layoutId: string) => {
    applyLayout(currentPageIndex, layoutId);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* セレクトボックス */}
      <select
        className="editor-layout-select"
        value={selectedLayoutCategory}
        onChange={(e) => setLayoutCategory(e.target.value)}
      >
        <option value="全て">全てのレイアウト</option>
        {LAYOUT_CATEGORIES.map((cat) => (
          <option key={cat.name} value={cat.name}>
            {cat.name}
          </option>
        ))}
      </select>

      <div
        style={{
          fontSize: 12,
          color: "var(--editor-primary-80)",
          fontWeight: 600,
        }}
      >
        編集対象: {currentTargetLabel}
      </div>

      {/* カテゴリ別アコーディオン */}
      {LAYOUT_CATEGORIES
        .filter(
          (cat) =>
            selectedLayoutCategory === "全て" ||
            cat.name === selectedLayoutCategory,
        )
        .map((category) => {
          const isOpen = openCategories.has(category.name);
          const variant = category.id === "spread" ? "spread" : "square";

          return (
            <div key={category.name} className="editor-accordion">
              <button
                className="editor-accordion__trigger"
                onClick={() => toggleCategory(category.name)}
              >
                <svg
                  className={`editor-accordion__chevron ${isOpen ? "editor-accordion__chevron--open" : "editor-accordion__chevron--closed"}`}
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="editor-accordion__label">
                  {category.name}
                </span>
                <span className="editor-accordion__count">
                  ({category.count})
                </span>
              </button>

              {isOpen && (
                <div
                  className={`editor-layout-grid ${variant === "square" ? "editor-layout-grid--square" : ""}`}
                >
                  {category.layouts.map((layout) => (
                    <LayoutThumbnail
                      key={layout.id}
                      layout={layout}
                      variant={variant}
                      isSelected={layout.id === currentLayoutId}
                      onClick={() => handleSelectLayout(layout.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
