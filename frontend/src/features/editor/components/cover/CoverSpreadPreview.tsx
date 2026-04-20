"use client";

import type { CSSProperties } from "react";
import { getCoverThemeOption } from "../../constants/coverOptions";
import type { CoverDesign } from "../../types/editor";

interface CoverSpreadPreviewProps {
  design: CoverDesign;
  variant?: "canvas" | "sidebar" | "thumbnail";
  scale?: number;
  className?: string;
}

function renderMultilineText(text: string) {
  return text.split("\n").map((line, index) => (
    <span key={`${line}-${index}`}>{line}</span>
  ));
}

export default function CoverSpreadPreview({
  design,
  variant = "canvas",
  scale = 1,
  className = "",
}: CoverSpreadPreviewProps) {
  const theme = getCoverThemeOption(design.themeId);
  const sizeStyle = {
    width: `${918 * scale}px`,
    height: `${620 * scale}px`,
  } as CSSProperties;
  const scaledStyle =
    scale !== 1
      ? ({
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        } as CSSProperties)
      : undefined;
  const themeStyle = {
    "--cover-paper": theme.surface,
    "--cover-paper-strong": theme.surfaceStrong,
    "--cover-backdrop": theme.backdrop,
    "--cover-ink": theme.ink,
    "--cover-spine": theme.spine,
    "--cover-monogram": theme.monogram,
    "--cover-shadow": theme.shadow,
  } as CSSProperties;

  return (
    <div
      className={`editor-cover-preview editor-cover-preview--${variant} ${className}`.trim()}
      style={{ ...themeStyle, ...sizeStyle }}
      data-material={design.materialId}
    >
      <div className="editor-cover-preview__scaled" style={scaledStyle}>
        <div className="editor-cover-preview__spread">
          <div className="editor-cover-preview__page editor-cover-preview__page--back">
            <div
              className="editor-cover-preview__texture editor-cover-preview__texture--back"
              aria-hidden="true"
            />
            <div className="editor-cover-preview__back-panel" aria-hidden="true">
              <svg viewBox="0 0 160 160" fill="none">
                <circle cx="82" cy="24" r="8" fill="currentColor" opacity={0.12} />
                <path
                  d="M82 31C79 48 79 66 82 84C85 104 89 122 93 138"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  opacity={0.34}
                />
                <path
                  d="M82 52C70 49 61 41 54 31"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  opacity={0.28}
                />
                <path
                  d="M54 31C66 34 75 42 81 52C69 50 60 43 54 31Z"
                  fill="currentColor"
                  opacity={0.14}
                />
                <path
                  d="M82 68C94 64 104 56 112 45"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  opacity={0.26}
                />
                <path
                  d="M112 45C101 49 91 57 84 68C96 66 105 58 112 45Z"
                  fill="currentColor"
                  opacity={0.12}
                />
                <path
                  d="M83 84C70 84 59 89 49 98"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  opacity={0.26}
                />
                <path
                  d="M49 98C61 98 72 93 81 86C68 86 58 90 49 98Z"
                  fill="currentColor"
                  opacity={0.12}
                />
                <path
                  d="M84 96C97 96 108 103 115 113"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  opacity={0.26}
                />
                <path
                  d="M115 113C104 112 94 107 86 98C98 99 108 104 115 113Z"
                  fill="currentColor"
                  opacity={0.11}
                />
                <path
                  d="M90 118C100 120 107 126 112 135"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity={0.2}
                />
              </svg>
            </div>
          </div>

          <div className="editor-cover-preview__spine">
            <div className="editor-cover-preview__texture" aria-hidden="true" />
            <span>{design.spineLabel}</span>
          </div>

          <div className="editor-cover-preview__page editor-cover-preview__page--front">
            <div className="editor-cover-preview__texture" aria-hidden="true" />
            <div className="editor-cover-preview__title">
              {renderMultilineText(design.title)}
            </div>
            <div className="editor-cover-preview__subtitle">
              {renderMultilineText(design.subtitle)}
            </div>
            <div className="editor-cover-preview__footer">
              <span>{design.footerLeft}</span>
              <span>{design.footerCenter}</span>
              <span>{design.footerRight}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
