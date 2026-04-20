"use client";

import CoverSpreadPreview from "../cover/CoverSpreadPreview";
import { useEditorStore } from "../../store/editorStore";

interface CoverCanvasProps {
  zoomLevel: number;
}

export default function CoverCanvas({ zoomLevel }: CoverCanvasProps) {
  const coverDesign = useEditorStore((s) => s.coverDesign);

  return (
    <div className="editor-cover-canvas">
      <div className="editor-cover-canvas__backdrop" aria-hidden="true" />
      <CoverSpreadPreview
        design={coverDesign}
        variant="canvas"
        scale={zoomLevel / 100}
      />
    </div>
  );
}
