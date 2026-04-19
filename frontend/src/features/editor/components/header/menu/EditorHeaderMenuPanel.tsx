import Link from "next/link";
import AddIcon from "@/components/icons/AddIcon";
import EditIcon from "@/components/icons/EditIcon";
import ExternalLinkIcon from "@/components/icons/ExternalLinkIcon";
import styles from "./EditorHeaderMenuPanel.module.css";

type EditorHeaderMenuPanelProps = {
  menuId: string;
  onClose: () => void;
  onLogout: () => void;
};

export default function EditorHeaderMenuPanel({
  menuId,
  onClose,
  onLogout,
}: EditorHeaderMenuPanelProps) {
  
  return (
    <div id={menuId} className={styles.panel} role="dialog" aria-modal="true">
      <nav aria-label="エディターメニュー">
        <ul className={styles.menuList}>
          <li>
            <Link
              href="/album/upload"
              className={styles.menuItem}
              onClick={onClose}
            >
              <span className={styles.menuItemLabel}>新規アルバム</span>
              <span className={styles.menuItemIcon} aria-hidden="true">
                <AddIcon />
              </span>
            </Link>
          </li>

          <li>
            <Link
              href="/dashboard"
              className={styles.menuItem}
              onClick={onClose}
            >
              <span className={styles.menuItemLabel}>下書き</span>
              <span className={styles.menuItemIcon} aria-hidden="true">
                <EditIcon />
              </span>
            </Link>
          </li>

          <li>
            <Link
              href="/account/orders"
              className={styles.menuItem}
              onClick={onClose}
            >
              <span className={styles.menuItemLabel}>注文履歴</span>
              <span className={styles.menuItemIcon} aria-hidden="true">
                <ExternalLinkIcon />
              </span>
            </Link>
          </li>

          <li className={styles.menuItemWithDivider}>
            <button
              type="button"
              className={styles.menuItem}
              onClick={onLogout}
            >
              <span className={styles.menuItemLabel}>ログアウト</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
