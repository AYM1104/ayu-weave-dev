export default function AlbumEditPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>エディタ</h1>
      <p>アルバム ID: {params.id}</p>
      <p>3ペイン構成のアルバム編集画面です。</p>
    </div>
  );
}
