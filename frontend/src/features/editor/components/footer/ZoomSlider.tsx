"use client";

/**
 * ZoomSlider — ズームスライダー
 *
 * ズームレベルの変更と現在の値（%表示）を提供する。
 */

import type { CSSProperties } from "react";
import styles from "./ZoomSlider.module.css";

const ZOOM_MIN = 30;
const ZOOM_MAX = 150;

interface ZoomSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function ZoomSlider({ value, onChange }: ZoomSliderProps) {
  // thumb の位置を 0–100% で CSS 変数として渡す
  const pct = ((value - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100;

  return (
    <div className={styles.root}>
      <input
        type="range"
        className={styles.slider}
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        value={value}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className={styles.label}>{value}%</span>
    </div>
  );
}
