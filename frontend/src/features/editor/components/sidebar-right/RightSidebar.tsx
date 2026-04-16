"use client";

/**
 * RightSidebar — エディター右パネル
 *
 * 写真アップロード領域 + アップロード済み写真一覧
 */

import PlusIcon from "@/components/icons/PlusIcon";
import { useEditorStore } from "../../store/editorStore";

export default function RightSidebar() {
  const photos = useEditorStore((s) => s.photos);
  const hasPhotos = photos.length > 0;

  return (
    <div className="editor-sidebar-right">
      {hasPhotos ? (
        <>
          <div className="editor-photo-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="editor-photo-thumb" draggable>
                <img
                  className="editor-photo-thumb__img"
                  src={photo.thumbnailUrl}
                  alt={photo.fileName}
                  loading="lazy"
                />
                {photo.used && (
                  <span className="editor-photo-thumb__used">使用中</span>
                )}
              </div>
            ))}
          </div>

          <div className="editor-qr-area editor-qr-area--standalone">
            <img
              className="editor-qr-area__code"
              src="/images/qr-code-sample.png"
              alt="スマホアップロード用QRコード"
            />
            <div className="editor-qr-area__text">
              スマホから
              <br />
              アップロードもできます
            </div>
          </div>
        </>
      ) : (
        <div className="editor-upload-area">
          <div className="editor-upload-area__body">
            <div className="editor-upload-area__icon" aria-hidden="true">
              <PlusIcon />
            </div>
            <div className="editor-upload-area__text">
              <span>ドラッグ&ドロップ</span>
              <br />
              <span>または</span>
              <br />
              <span className="editor-upload-area__text--bold">
                ファイルを開く
              </span>
            </div>
            <div className="editor-upload-area__hint">
              アップロード可能フォーマット：
              <br />
              JPG, PNG
              <br />
              1回のアップロードで50MBまで
            </div>
          </div>

          <div className="editor-qr-area">
            <img
              className="editor-qr-area__code"
              src="/images/qr-code-sample.png"
              alt="スマホアップロード用QRコード"
            />
            <div className="editor-qr-area__text">
              スマホから
              <br />
              アップロードもできます
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
