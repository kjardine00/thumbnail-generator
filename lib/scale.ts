import type { CanvasSpec } from "./types";

/** exportPx = inches * dpi */
export function inchesToPx(inches: number, dpi: number): number {
  return inches * dpi;
}

export function pxToInches(px: number, dpi: number): number {
  return px / dpi;
}

export function canvasPixelSize(canvas: Pick<CanvasSpec, "widthIn" | "heightIn" | "dpi">): {
  widthPx: number;
  heightPx: number;
} {
  return {
    widthPx: Math.round(canvas.widthIn * canvas.dpi),
    heightPx: Math.round(canvas.heightIn * canvas.dpi),
  };
}

/**
 * Scale factor mapping canvas pixels → CSS pixels so the preview fits a box
 * while preserving aspect ratio. Never upscales past 1 (1 canvas px = 1 CSS px).
 */
export function fitDisplayScale(
  widthPx: number,
  heightPx: number,
  maxWidthCss: number,
  maxHeightCss: number,
): number {
  if (widthPx <= 0 || heightPx <= 0 || maxWidthCss <= 0 || maxHeightCss <= 0) {
    return 0;
  }
  return Math.min(maxWidthCss / widthPx, maxHeightCss / heightPx, 1);
}

export function strokeWidthPx(strokeWidthIn: number, dpi: number): number {
  return Math.max(inchesToPx(strokeWidthIn, dpi), 0.5);
}
