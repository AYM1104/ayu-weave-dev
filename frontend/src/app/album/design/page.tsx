"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function AlbumDesignContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <div>
      <h1>デザインの選択</h1>
      <p>アルバム ID: {id}</p>
      <p>ウィザード Step 3 — レイアウトテンプレートを選択してください。</p>
    </div>
  );
}

export default function AlbumDesignPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AlbumDesignContent />
    </Suspense>
  );
}
