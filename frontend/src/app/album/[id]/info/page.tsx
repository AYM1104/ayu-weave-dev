export default function AlbumInfoPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>アルバム情報の入力</h1>
      <p>アルバム ID: {params.id}</p>
      <p>ウィザード Step 2 — お日にちとお名前を入力してください。</p>
    </div>
  );
}
