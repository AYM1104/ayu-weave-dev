"use client";

/**
 * LayoutThumbnail — レイアウトのサムネイル表示
 *
 * レイアウトテンプレートのスロット配置をプレビューとして描画。
 */

import type { LayoutTemplate } from "../../types/editor";

interface LayoutThumbnailProps {
  layout: LayoutTemplate;
  variant: "spread" | "square";
  isSelected?: boolean;
  onClick?: () => void;
}

export default function LayoutThumbnail({
  layout,
  variant,
  isSelected = false,
  onClick,
}: LayoutThumbnailProps) {
  const className = [
    "editor-layout-thumb",
    `editor-layout-thumb--${variant}`,
    isSelected ? "editor-layout-thumb--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} onClick={onClick} title={layout.name}>
      {layout.slots.map((slot) => (
        <div
          key={slot.id}
          className="editor-layout-thumb__slot"
          style={{
            left: `${slot.x * 100}%`,
            top: `${slot.y * 100}%`,
            width: `${slot.width * 100}%`,
            height: `${slot.height * 100}%`,
            borderRadius: slot.borderRadius
              ? `${Math.min(slot.borderRadius, 50)}%`
              : undefined,
          }}
        />
      ))}
    </div>
  );
}
