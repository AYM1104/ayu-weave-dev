/**
 * EditorButton — エディター専用テキストボタン
 *
 * variant:
 *  - "ghost"   : 半透明塗り（プレビューなど）
 *  - "primary" : ソリッド塗り（カートに入れるなど）
 */

import { ButtonHTMLAttributes } from "react";

type Variant = "ghost" | "primary";

interface EditorButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export default function EditorButton({
  variant = "primary",
  className,
  children,
  ...rest
}: EditorButtonProps) {
  const baseClass =
    variant === "ghost" ? "editor-btn-ghost" : "editor-btn-primary";

  return (
    <button className={[baseClass, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}
