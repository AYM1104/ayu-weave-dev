import CloseIcon from "@/shared/icons/CloseIcon";   // バツアイコン
import MenuIcon from "@/shared/icons/MenuIcon";   // ハンバーガーアイコン
import styles from "./EditorHeaderMenuButton.module.css";

// propsの型定義
type EditorHeaderMenuButtonProps = {
  isOpen: boolean;   // メニューが開いているか
  menuId: string;    // メニューのID
  onToggle: () => void;  // メニューを開閉する関数
};

// メニューボタンコンポーネント
export default function EditorHeaderMenuButton({
  isOpen,
  menuId,
  onToggle,
}: EditorHeaderMenuButtonProps) {

  return (
    <button
      type="button"
      className={styles.menuButton}
      aria-expanded={isOpen}  // メニューが開いているか
      aria-controls={menuId}  // メニューのID
      aria-haspopup="dialog"  // メニューのタイプ
      onClick={onToggle}  // メニューを開閉する関数
    >
      <span className={styles.menuButtonLabel}>menu</span>
      <span className={styles.menuButtonIcon} aria-hidden="true">
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </span>
    </button>
  );
}
