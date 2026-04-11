"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function AlbumInfoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <div>
      <h1>アルバム情報の入力</h1>
      <p>アルバム ID: {id}</p>
      <p>ウィザード Step 2 — お日にちとお名前を入力してください。</p>
    </div>
  );
}

export default function AlbumInfoPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AlbumInfoContent />
    </Suspense>
  );
}
