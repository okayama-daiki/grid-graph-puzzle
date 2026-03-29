import { useEffect, useRef, useState } from "react";

interface Size {
  width: number;
  height: number;
}

export function useContainerSize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [svgSize, setSvgSize] = useState<Size>({ width: 800, height: 600 });
  const containerSizeRef = useRef<Size>({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 100 && height > 100) {
          containerSizeRef.current = { width, height };
          setSvgSize({ width, height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return { svgSize, containerSizeRef };
}
