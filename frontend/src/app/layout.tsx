import './globals.css';

export const metadata = {
  title: 'Weave MVP',
  description: 'Weave MVP Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
