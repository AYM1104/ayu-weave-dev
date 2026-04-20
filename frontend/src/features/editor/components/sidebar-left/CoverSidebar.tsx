"use client";

import CoverSpreadPreview from "../cover/CoverSpreadPreview";
import {
  COVER_MATERIAL_OPTIONS,
  COVER_PAGE_OPTIONS,
  COVER_THEME_OPTIONS,
} from "../../constants/coverOptions";
import { useEditorStore } from "../../store/editorStore";

export default function CoverSidebar() {
  const coverDesign = useEditorStore((s) => s.coverDesign);
  const patchCoverDesign = useEditorStore((s) => s.patchCoverDesign);

  return (
    <div className="editor-sidebar-left editor-sidebar-left--cover">
      <div className="editor-cover-sidebar__hero">
        <span className="editor-cover-sidebar__eyebrow">表紙デザイン</span>
        <h2 className="editor-cover-sidebar__title">アルバムの顔を整える</h2>
        <p className="editor-cover-sidebar__description">
          表紙を選んでいる間だけ、ここから色味と装丁をまとめて調整できます。
        </p>
      </div>

      <div className="editor-cover-sidebar__preview-card">
        <CoverSpreadPreview
          design={coverDesign}
          variant="sidebar"
          scale={232 / 918}
        />
      </div>

      <section className="editor-cover-sidebar__section">
        <h3 className="editor-cover-sidebar__section-title">ページ数</h3>
        <div className="editor-cover-sidebar__option-list">
          {COVER_PAGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`editor-cover-sidebar__page-option ${
                coverDesign.pageOptionId === option.id
                  ? "editor-cover-sidebar__page-option--active"
                  : ""
              }`}
              onClick={() => patchCoverDesign({ pageOptionId: option.id })}
            >
              <div>
                <div className="editor-cover-sidebar__option-title">
                  {option.title}
                </div>
                <div className="editor-cover-sidebar__option-detail">
                  {option.detail}
                </div>
              </div>
              {option.priceLabel ? (
                <span className="editor-cover-sidebar__option-price">
                  {option.priceLabel}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="editor-cover-sidebar__section">
        <h3 className="editor-cover-sidebar__section-title">
          カラー・{COVER_THEME_OPTIONS.find((option) => option.id === coverDesign.themeId)?.label}
        </h3>
        <div className="editor-cover-sidebar__swatches">
          {COVER_THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`editor-cover-sidebar__swatch ${
                coverDesign.themeId === option.id
                  ? "editor-cover-sidebar__swatch--active"
                  : ""
              }`}
              style={{ background: option.swatch }}
              aria-label={`${option.label} を選択`}
              onClick={() => patchCoverDesign({ themeId: option.id })}
            />
          ))}
        </div>
      </section>

      <section className="editor-cover-sidebar__section">
        <h3 className="editor-cover-sidebar__section-title">装丁仕上げ</h3>
        <div className="editor-cover-sidebar__material-list">
          {COVER_MATERIAL_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`editor-cover-sidebar__material ${
                coverDesign.materialId === option.id
                  ? "editor-cover-sidebar__material--active"
                  : ""
              }`}
              onClick={() => patchCoverDesign({ materialId: option.id })}
            >
              <span className="editor-cover-sidebar__material-indicator" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
