import { useEffect, useRef, useState } from "react";
import type { WasmModule } from "../types";

let wasmModule: WasmModule | null = null;

async function loadWasm(): Promise<WasmModule> {
  if (wasmModule) return wasmModule;
  const wasm = (await import("../../core/pkg/grid_puzzle_core.js")) as unknown as WasmModule;
  await wasm.default();
  wasmModule = wasm;
  return wasm;
}

export function useWasm() {
  const [wasmReady, setWasmReady] = useState(false);
  const wasmRef = useRef<WasmModule | null>(null);

  useEffect(() => {
    loadWasm().then((wasm) => {
      wasmRef.current = wasm;
      setWasmReady(true);
    });
  }, []);

  return { wasmReady, wasm: wasmRef.current };
}
