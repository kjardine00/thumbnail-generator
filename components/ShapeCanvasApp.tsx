"use client";

import { CanvasStage } from "@/components/CanvasStage";
import { Sidebar } from "@/components/Sidebar";
import {
  downloadBlob,
  exportCanvasPng,
  exportFilename,
} from "@/lib/exportPng";
import { generateShapes, shuffleShapes, totalQuantity } from "@/lib/placement";
import { canvasPixelSize } from "@/lib/scale";
import type { AppConfig, ShapeInstance } from "@/lib/types";
import { DEFAULT_CONFIG, STROKE_WIDTH_IN } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

function applyStyle(shapes: ShapeInstance[], config: AppConfig): ShapeInstance[] {
  return shapes.map((s) => ({
    ...s,
    strokeColor: config.style.strokeColor,
    strokeWidthIn: STROKE_WIDTH_IN,
  }));
}

export function ShapeCanvasApp() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [shapes, setShapes] = useState<ShapeInstance[]>([]);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const pixelKeyRef = useRef("");

  // Generate initial layout on the client only (avoids SSR/hydration RNG mismatch).
  useEffect(() => {
    const initial = generateShapes(DEFAULT_CONFIG);
    setShapes(initial);
    const { widthPx, heightPx } = canvasPixelSize(DEFAULT_CONFIG.canvas);
    pixelKeyRef.current = `${widthPx}x${heightPx}`;
    setReady(true);
  }, []);

  // When physical canvas pixel size changes, regenerate so coords stay valid.
  useEffect(() => {
    if (!ready) return;
    const { widthPx, heightPx } = canvasPixelSize(config.canvas);
    const key = `${widthPx}x${heightPx}`;
    if (key === pixelKeyRef.current) return;
    pixelKeyRef.current = key;
    setShapes(applyStyle(generateShapes(config), config));
  }, [config, ready]);

  const handleConfigChange = (next: AppConfig) => {
    setConfig(next);
    setExportError(null);
    // Live-update stroke without reshuffling positions.
    setShapes((prev) => applyStyle(prev, next));
  };

  const handleShuffle = () => {
    setExportError(null);
    setShapes(shuffleShapes(config));
  };

  const handleExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const styled = applyStyle(shapes, config);
      const result = await exportCanvasPng(config.canvas, styled);
      if (!result.ok) {
        setExportError(result.message);
        return;
      }
      downloadBlob(result.blob, exportFilename(config.canvas));
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const count = totalQuantity(config.quantities);

  // Same markup on the server and the client's first paint — avoids hydration
  // mismatches from client-only shape generation and boolean DOM attrs.
  if (!ready) {
    return (
      <div className="flex h-dvh min-h-0 items-center justify-center bg-[#12141a] text-sm text-zinc-500">
        Preparing canvas…
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-[#12141a] md:flex-row">
      <Sidebar
        config={config}
        shapeCount={shapes.length}
        exporting={exporting}
        exportError={exportError}
        onChange={handleConfigChange}
        onShuffle={handleShuffle}
        onExport={handleExport}
      />
      <main className="relative min-h-[50vh] flex-1 bg-[#12141a] p-4 md:min-h-0 md:p-8">
        {shapes.length === 0 && count === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-zinc-400">Set a shape quantity, then shuffle.</p>
            <button
              type="button"
              onClick={handleShuffle}
              className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            >
              Shuffle shapes
            </button>
          </div>
        ) : (
          <CanvasStage
            canvas={config.canvas}
            shapes={shapes}
            onShapesChange={setShapes}
          />
        )}
      </main>
    </div>
  );
}
