/**
 * デモページ用レイアウト
 *
 * 通常のヘッダー/フッターを表示せず、フルスクリーンで表示する。
 * エディターデモなど、独自のレイアウトを持つページ向け。
 */
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
