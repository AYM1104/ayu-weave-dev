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
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <header style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
            <h1>Weave</h1>
          </header>
          <main style={{ flex: 1, padding: '1rem' }}>
            {children}
          </main>
          <footer style={{ padding: '1rem', borderTop: '1px solid #ccc', textAlign: 'center' }}>
            &copy; 2026 Weave
          </footer>
        </div>
      </body>
    </html>
  );
}
