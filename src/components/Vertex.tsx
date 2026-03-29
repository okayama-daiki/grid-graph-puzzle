import { memo } from "react";
import { VERTEX_RADIUS } from "../constants";
import type { Point } from "../types";
import styles from "./Vertex.module.css";

interface VertexProps {
  vertexId: number;
  pos: Point;
  isDragging: boolean;
  isAnimating: boolean;
  zoom: number;
  interactive: boolean;
  onMouseDown: (e: React.MouseEvent, vertexId: number) => void;
  onTouchStart: (e: React.TouchEvent, vertexId: number) => void;
}

export const Vertex = memo(function Vertex({
  vertexId,
  pos,
  isDragging,
  isAnimating,
  zoom,
  interactive,
  onMouseDown,
  onTouchStart,
}: VertexProps) {
  const rootClassName = `${styles.root} ${isAnimating ? styles.animating : ""} ${interactive ? styles.interactive : ""}`;

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      className={rootClassName}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(e, vertexId);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        onTouchStart(e, vertexId);
      }}
    >
      <circle r={(VERTEX_RADIUS + 10) * zoom} fill="transparent" pointerEvents="all" />
      {isDragging && (
        <circle r={(VERTEX_RADIUS + 2) * zoom} fill="rgba(0,0,0,0.1)" cx={2 * zoom} cy={2 * zoom} />
      )}
      <circle
        r={VERTEX_RADIUS * zoom}
        fill={isDragging ? "#f0f9ff" : "white"}
        stroke={isDragging ? "#3b82f6" : "#374151"}
        strokeWidth={(isDragging ? 2.5 : 1.5) * zoom}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12 * zoom}
        fontWeight="600"
        fill="#374151"
        className={styles.label}
      >
        {vertexId}
      </text>
    </g>
  );
});
