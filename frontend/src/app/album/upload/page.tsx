"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function AlbumUploadContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <div>
      <h1>写真のアップロード</h1>
      <p>アルバム ID: {id}</p>
      <p>ウィザード Step 1 — 写真データをアップロードしてください。</p>
    </div>
  );
}

export default function AlbumUploadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AlbumUploadContent />
    </Suspense>
  );
}
