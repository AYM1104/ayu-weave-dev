export default function AlbumDesignPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>デザインの選択</h1>
      <p>アルバム ID: {params.id}</p>
      <p>ウィザード Step 3 — レイアウトテンプレートを選択してください。</p>
    </div>
  );
}
