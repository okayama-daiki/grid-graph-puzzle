import { useCallback, useEffect, useRef, useState } from "react";
import { ZOOM_MAX, ZOOM_MIN } from "../constants";
import type { Point } from "../types";
import { getClientPos } from "../utils";

export function usePanZoom(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const isPanning = useRef(false);
  const panStartClient = useRef<Point>({ x: 0, y: 0 });
  const panStartOffset = useRef<Point>({ x: 0, y: 0 });
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);
  const pinchStartCenter = useRef<Point>({ x: 0, y: 0 });
  const pinchStartPan = useRef<Point>({ x: 0, y: 0 });

  const resetView = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleBackgroundMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const te = e as React.TouchEvent;
      if (te.touches && te.touches.length >= 2) return;
      e.preventDefault();
      const client = getClientPos(e);
      isPanning.current = true;
      panStartClient.current = client;
      panStartOffset.current = { ...panOffset };
    },
    [panOffset],
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const delta = e.ctrlKey ? -e.deltaY * 0.01 : -e.deltaY * 0.002;
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * (1 + delta)));
      const scale = newZoom / zoom;

      setPanOffset((prev) => ({
        x: mx - scale * (mx - prev.x),
        y: my - scale * (my - prev.y),
      }));
      setZoom(newZoom);
    },
    [zoom, svgRef],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [handleWheel, svgRef]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        pinchStartDist.current = dist;
        pinchStartZoom.current = zoom;
        const svg = svgRef.current;
        const rect = svg ? svg.getBoundingClientRect() : { left: 0, top: 0 };
        pinchStartCenter.current = {
          x: (t0.clientX + t1.clientX) / 2 - rect.left,
          y: (t0.clientY + t1.clientY) / 2 - rect.top,
        };
        pinchStartPan.current = { ...panOffset };
        isPanning.current = false;
      } else if (e.touches.length === 1) {
        handleBackgroundMouseDown(e);
      }
    },
    [zoom, panOffset, handleBackgroundMouseDown, svgRef],
  );

  const handlePinchMove = useCallback((e: React.TouchEvent): boolean => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      if (pinchStartDist.current > 0) {
        const newZoom = Math.min(
          ZOOM_MAX,
          Math.max(ZOOM_MIN, pinchStartZoom.current * (dist / pinchStartDist.current)),
        );
        const scale = newZoom / pinchStartZoom.current;
        const cx = pinchStartCenter.current.x;
        const cy = pinchStartCenter.current.y;
        setPanOffset({
          x: cx - scale * (cx - pinchStartPan.current.x),
          y: cy - scale * (cy - pinchStartPan.current.y),
        });
        setZoom(newZoom);
      }
      return true;
    }
    return false;
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent | React.TouchEvent): boolean => {
    if (!isPanning.current) return false;
    const client = getClientPos(e);
    setPanOffset({
      x: panStartOffset.current.x + (client.x - panStartClient.current.x),
      y: panStartOffset.current.y + (client.y - panStartClient.current.y),
    });
    return true;
  }, []);

  const endPanPinch = useCallback(() => {
    isPanning.current = false;
    pinchStartDist.current = 0;
  }, []);

  return {
    panOffset,
    setPanOffset,
    zoom,
    setZoom,
    resetView,
    handleBackgroundMouseDown,
    handleTouchStart,
    handlePinchMove,
    handlePanMove,
    endPanPinch,
  };
}
