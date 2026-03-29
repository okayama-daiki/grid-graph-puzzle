import { GRID_PADDING } from "./constants";
import type { Point } from "./types";

export function getClientPos(
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
): Point {
  const te = e as TouchEvent;
  if (te.touches && te.touches.length > 0) {
    return { x: te.touches[0].clientX, y: te.touches[0].clientY };
  }
  if (te.changedTouches && te.changedTouches.length > 0) {
    return { x: te.changedTouches[0].clientX, y: te.changedTouches[0].clientY };
  }
  const me = e as MouseEvent;
  return { x: me.clientX, y: me.clientY };
}

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function gridToPixel(gx: number, gy: number, cellSize: number, panOffset: Point): Point {
  return {
    x: (gx + GRID_PADDING) * cellSize + cellSize / 2 + panOffset.x,
    y: (gy + GRID_PADDING) * cellSize + cellSize / 2 + panOffset.y,
  };
}

export function pixelToGrid(px: number, py: number, cellSize: number, panOffset: Point): Point {
  return {
    x: Math.round((px - panOffset.x - cellSize / 2) / cellSize - GRID_PADDING),
    y: Math.round((py - panOffset.y - cellSize / 2) / cellSize - GRID_PADDING),
  };
}

export function eventToSvgCoords(
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
  svgElement: SVGSVGElement | null,
): Point {
  if (!svgElement) return { x: 0, y: 0 };
  const rect = svgElement.getBoundingClientRect();
  const client = getClientPos(e);
  return { x: client.x - rect.left, y: client.y - rect.top };
}
