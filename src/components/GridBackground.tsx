import { memo } from "react";
import type { Point } from "../types";

interface GridBackgroundProps {
  svgWidth: number;
  svgHeight: number;
  cellSize: number;
  panOffset: Point;
  zoom: number;
}

export const GridBackground = memo(function GridBackground({
  svgWidth,
  svgHeight,
  cellSize,
  panOffset,
  zoom,
}: GridBackgroundProps) {
  const ox = ((panOffset.x % cellSize) + cellSize) % cellSize;
  const oy = ((panOffset.y % cellSize) + cellSize) % cellSize;
  const numV = Math.ceil(svgWidth / cellSize) + 2;
  const numH = Math.ceil(svgHeight / cellSize) + 2;

  return (
    <>
      {Array.from({ length: numV }, (_, i) => {
        const x = ox + (i - 1) * cellSize;
        return (
          <line
            key={`v${i}`}
            x1={x}
            y1={0}
            x2={x}
            y2={svgHeight}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        );
      })}
      {Array.from({ length: numH }, (_, i) => {
        const y = oy + (i - 1) * cellSize;
        return (
          <line
            key={`h${i}`}
            x1={0}
            y1={y}
            x2={svgWidth}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        );
      })}
      {Array.from({ length: numV }, (_, gx) =>
        Array.from({ length: numH }, (_, gy) => {
          const cx = ox + (gx - 1) * cellSize + cellSize / 2;
          const cy = oy + (gy - 1) * cellSize + cellSize / 2;
          if (cx < -10 || cx > svgWidth + 10 || cy < -10 || cy > svgHeight + 10) return null;
          return <circle key={`d${gx}-${gy}`} cx={cx} cy={cy} r={2 * zoom} fill="#d1d5db" />;
        }),
      )}
    </>
  );
});
