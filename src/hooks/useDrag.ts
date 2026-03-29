import { useCallback, useEffect, useRef, useState } from "react";
import type { GridCoord, Point, Positions } from "../types";
import { eventToSvgCoords, gridToPixel, pixelToGrid } from "../utils";

interface UseDragParams {
  positions: Positions;
  setPositions: React.Dispatch<React.SetStateAction<Positions>>;
  setMoveCount: React.Dispatch<React.SetStateAction<number>>;
  timerRunning: boolean;
  setTimerRunning: (running: boolean) => void;
  solved: boolean;
  showSolution: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  panOffset: Point;
  cellSize: number;
  onDrop?: () => void;
}

export function useDrag({
  positions,
  setPositions,
  setMoveCount,
  timerRunning,
  setTimerRunning,
  solved,
  showSolution,
  svgRef,
  panOffset,
  cellSize,
  onDrop,
}: UseDragParams) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragSvgPos, setDragSvgPos] = useState<Point>({ x: 0, y: 0 });
  const dragGrabOffset = useRef<Point>({ x: 0, y: 0 });
  const dragOrigPos = useRef<GridCoord | null>(null);

  // Refs for latest values used in global event listeners to avoid stale closures
  const draggingRef = useRef<number | null>(null);
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;
  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;
  const timerRunningRef = useRef(timerRunning);
  timerRunningRef.current = timerRunning;

  const handleVertexMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent, vertexId: number) => {
      if (solved || showSolution) return;
      e.stopPropagation();
      e.preventDefault();
      const svgPt = eventToSvgCoords(e, svgRef.current);
      const pos = positions[vertexId];
      if (!pos) return;
      const center = gridToPixel(pos[0], pos[1], cellSize, panOffset);
      dragGrabOffset.current = { x: svgPt.x - center.x, y: svgPt.y - center.y };
      dragOrigPos.current = [...pos] as GridCoord;
      draggingRef.current = vertexId;
      setDragging(vertexId);
      setDragSvgPos(center);
    },
    [positions, cellSize, panOffset, svgRef, solved, showSolution],
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent): boolean => {
      if (dragging === null) return false;
      const svgPt = eventToSvgCoords(e, svgRef.current);
      setDragSvgPos({
        x: svgPt.x - dragGrabOffset.current.x,
        y: svgPt.y - dragGrabOffset.current.y,
      });
      return true;
    },
    [dragging, svgRef],
  );

  // Used for touch end (touch events are captured at the touchstart element, so they
  // fire even outside the SVG — no need for global touch listeners)
  const handleDragEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (draggingRef.current === null) return; // already handled by global mouseup listener
      const draggingId = draggingRef.current;
      draggingRef.current = null;
      const svgPt = eventToSvgCoords(e, svgRef.current);
      const cx = svgPt.x - dragGrabOffset.current.x;
      const cy = svgPt.y - dragGrabOffset.current.y;
      const grid = pixelToGrid(cx, cy, cellSizeRef.current, panOffsetRef.current);
      const occupied = Object.entries(positionsRef.current).some(
        ([id, pos]) => Number(id) !== draggingId && pos && pos[0] === grid.x && pos[1] === grid.y,
      );
      if (!occupied) {
        setPositions((prev) => ({ ...prev, [draggingId]: [grid.x, grid.y] }));
        setMoveCount((c) => c + 1);
        if (!timerRunningRef.current) setTimerRunning(true);
        onDrop?.();
      }
      setDragging(null);
      dragOrigPos.current = null;
    },
    [svgRef, setPositions, setMoveCount, setTimerRunning, onDrop],
  );

  const cancelDrag = useCallback(() => {
    if (draggingRef.current !== null && dragOrigPos.current) {
      const id = draggingRef.current;
      setPositions((prev) => ({ ...prev, [id]: dragOrigPos.current! }));
    }
    draggingRef.current = null;
    setDragging(null);
    dragOrigPos.current = null;
  }, [setPositions]);

  // Global mouse listeners so drag continues even when cursor leaves the SVG
  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggingRef.current === null) return;
      const svgPt = eventToSvgCoords(e, svgRef.current);
      setDragSvgPos({
        x: svgPt.x - dragGrabOffset.current.x,
        y: svgPt.y - dragGrabOffset.current.y,
      });
    },
    [svgRef],
  );

  const handleGlobalMouseUp = useCallback(
    (e: MouseEvent) => {
      const draggingId = draggingRef.current;
      if (draggingId === null) return;
      draggingRef.current = null;
      const svgPt = eventToSvgCoords(e, svgRef.current);
      const cx = svgPt.x - dragGrabOffset.current.x;
      const cy = svgPt.y - dragGrabOffset.current.y;
      const grid = pixelToGrid(cx, cy, cellSizeRef.current, panOffsetRef.current);
      const occupied = Object.entries(positionsRef.current).some(
        ([id, pos]) => Number(id) !== draggingId && pos && pos[0] === grid.x && pos[1] === grid.y,
      );
      if (!occupied) {
        setPositions((prev) => ({ ...prev, [draggingId]: [grid.x, grid.y] }));
        setMoveCount((c) => c + 1);
        if (!timerRunningRef.current) setTimerRunning(true);
        onDrop?.();
      }
      dragOrigPos.current = null;
      setDragging(null);
    },
    [svgRef, setPositions, setMoveCount, setTimerRunning, onDrop],
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  return {
    dragging,
    dragSvgPos,
    handleVertexMouseDown,
    handleDragMove,
    handleDragEnd,
    cancelDrag,
  };
}
