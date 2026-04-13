"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function AlbumEditContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <div>
      <h1>エディタ</h1>
      <p>アルバム ID: {id}</p>
      <p>3ペイン構成のアルバム編集画面です。</p>
    </div>
  );
}

export default function AlbumEditPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AlbumEditContent />
    </Suspense>
  );
}
