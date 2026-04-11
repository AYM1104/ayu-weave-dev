export default function AlbumUploadPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>写真のアップロード</h1>
      <p>アルバム ID: {params.id}</p>
      <p>ウィザード Step 1 — 写真データをアップロードしてください。</p>
    </div>
  );
}
