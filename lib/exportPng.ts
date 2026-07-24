import { drawShapeOnContext } from "./geometry";
import { canvasPixelSize, strokeWidthPx } from "./scale";
import type { CanvasSpec, ShapeInstance } from "./types";
import { MAX_EXPORT_PIXELS } from "./types";

export interface ExportResult {
  ok: true;
  widthPx: number;
  heightPx: number;
  blob: Blob;
}

export interface ExportError {
  ok: false;
  reason: "too-large" | "canvas-unsupported" | "export-failed";
  message: string;
  widthPx?: number;
  heightPx?: number;
}

export function estimateExportPixels(canvas: CanvasSpec): {
  widthPx: number;
  heightPx: number;
  total: number;
} {
  const { widthPx, heightPx } = canvasPixelSize(canvas);
  return { widthPx, heightPx, total: widthPx * heightPx };
}

export async function exportCanvasPng(
  canvas: CanvasSpec,
  shapes: ShapeInstance[],
): Promise<ExportResult | ExportError> {
  const { widthPx, heightPx, total } = estimateExportPixels(canvas);

  if (total > MAX_EXPORT_PIXELS) {
    return {
      ok: false,
      reason: "too-large",
      message: `Export would be ${widthPx}×${heightPx} (${(total / 1e6).toFixed(1)}MP), over the ${(MAX_EXPORT_PIXELS / 1e6).toFixed(0)}MP limit. Lower inches or DPI.`,
      widthPx,
      heightPx,
    };
  }

  const el = document.createElement("canvas");
  el.width = widthPx;
  el.height = heightPx;
  const ctx = el.getContext("2d");
  if (!ctx) {
    return {
      ok: false,
      reason: "canvas-unsupported",
      message: "Could not create a 2D canvas context.",
      widthPx,
      heightPx,
    };
  }

  // Export always clips to the printable canvas (ignore showOverflow).
  ctx.fillStyle = canvas.backgroundColor;
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, widthPx, heightPx);
  ctx.clip();

  for (const shape of shapes) {
    drawShapeOnContext(ctx, shape, strokeWidthPx(shape.strokeWidthIn, canvas.dpi));
  }
  ctx.restore();

  const blob = await new Promise<Blob | null>((resolve) => {
    el.toBlob((b) => resolve(b), "image/png");
  });

  if (!blob) {
    return {
      ok: false,
      reason: "export-failed",
      message: "PNG encoding failed.",
      widthPx,
      heightPx,
    };
  }

  return { ok: true, widthPx, heightPx, blob };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportFilename(canvas: CanvasSpec): string {
  const w = Number(canvas.widthIn.toFixed(2));
  const h = Number(canvas.heightIn.toFixed(2));
  return `canvas-${w}x${h}in.png`;
}
