import { useCallback } from "react";
import { CELL_SIZE } from "../constants";
import type { AnimatingVertices, Point, Positions, PuzzleData, ValidationResult } from "../types";
import { gridToPixel } from "../utils";
import { Edge } from "./Edge";
import { GridBackground } from "./GridBackground";
import { Vertex } from "./Vertex";
import styles from "./PuzzleCanvas.module.css";

interface PuzzleCanvasProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  svgWidth: number;
  svgHeight: number;
  puzzle: PuzzleData | null;
  validation: ValidationResult | null;
  dragging: number | null;
  dragSvgPos: Point;
  positions: Positions;
  animatingVertices: AnimatingVertices;
  solved: boolean;
  showSolution: boolean;
  panOffset: Point;
  zoom: number;
  onBackgroundMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onVertexMouseDown: (e: React.MouseEvent | React.TouchEvent, vertexId: number) => void;
}

export function PuzzleCanvas({
  svgRef,
  svgWidth,
  svgHeight,
  puzzle,
  validation,
  dragging,
  dragSvgPos,
  positions,
  animatingVertices,
  solved,
  showSolution,
  panOffset,
  zoom,
  onBackgroundMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onVertexMouseDown,
}: PuzzleCanvasProps) {
  const cellSize = CELL_SIZE * zoom;

  const getVertexPos = useCallback(
    (vertexId: number): Point => {
      if (dragging === vertexId) return dragSvgPos;
      if (animatingVertices[vertexId]) {
        const t = animatingVertices[vertexId];
        return gridToPixel(t[0], t[1], cellSize, panOffset);
      }
      const pos = positions[vertexId];
      if (!pos) return { x: 0, y: 0 };
      return gridToPixel(pos[0], pos[1], cellSize, panOffset);
    },
    [dragging, dragSvgPos, animatingVertices, positions, cellSize, panOffset],
  );

  const getEdgeColor = (idx: number): string => {
    if (!validation) return "#9ca3af";
    return validation.edge_validity[idx] ? "#22c55e" : "#ef4444";
  };

  const interactive = !solved && !showSolution;

  return (
    <svg
      ref={svgRef}
      width={svgWidth}
      height={svgHeight}
      className={styles.puzzleSvg}
      onMouseDown={onBackgroundMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <rect width={svgWidth} height={svgHeight} fill="#fafafa" />

      <GridBackground
        svgWidth={svgWidth}
        svgHeight={svgHeight}
        cellSize={cellSize}
        panOffset={panOffset}
        zoom={zoom}
      />

      {puzzle?.edges.map(([u, v], idx) => (
        <Edge
          key={`e${idx}`}
          from={getVertexPos(u)}
          to={getVertexPos(v)}
          color={getEdgeColor(idx)}
          zoom={zoom}
        />
      ))}

      {puzzle?.vertices.map((v) => (
        <Vertex
          key={`v${v}`}
          vertexId={v}
          pos={getVertexPos(v)}
          isDragging={dragging === v}
          isAnimating={animatingVertices[v] !== undefined}
          zoom={zoom}
          interactive={interactive}
          onMouseDown={onVertexMouseDown}
          onTouchStart={onVertexMouseDown}
        />
      ))}
    </svg>
  );
}
