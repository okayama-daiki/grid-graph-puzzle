import { memo } from "react";
import type { Point } from "../types";

interface EdgeProps {
  from: Point;
  to: Point;
  color: string;
  zoom: number;
}

export const Edge = memo(function Edge({ from, to, color, zoom }: EdgeProps) {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={color}
      strokeWidth={3 * zoom}
      strokeLinecap="round"
    />
  );
});
