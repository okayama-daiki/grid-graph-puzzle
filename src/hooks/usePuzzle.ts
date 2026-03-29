import { useCallback, useEffect, useRef, useState } from "react";
import { CELL_SIZE, GRID_PADDING, HINT_LIMITS } from "../constants";
import type {
  AnimatingVertices,
  GraphInfo,
  Positions,
  PuzzleData,
  ValidationResult,
  WasmModule,
} from "../types";

interface UsePuzzleParams {
  wasm: WasmModule | null;
  wasmReady: boolean;
  containerSizeRef: React.RefObject<{ width: number; height: number }>;
  svgSize: { width: number; height: number };
  resetTimer: () => void;
  setTimerRunning: (running: boolean) => void;
  resetView: () => void;
}

export function usePuzzle({
  wasm,
  wasmReady,
  containerSizeRef,
  svgSize,
  resetTimer,
  setTimerRunning,
  resetView,
}: UsePuzzleParams) {
  const [difficulty, setDifficulty] = useState(0);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [graphInfo, setGraphInfo] = useState<GraphInfo | null>(null);
  const [positions, setPositions] = useState<Positions>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [solved, setSolved] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [maxHints, setMaxHints] = useState(3);
  const [animatingVertices, setAnimatingVertices] = useState<AnimatingVertices>({});
  const needsGenerate = useRef(true);

  const generatePuzzle = useCallback(() => {
    if (!wasm) return;
    const puzzleData: PuzzleData = JSON.parse(wasm.generate_puzzle(difficulty));
    const info: GraphInfo = JSON.parse(wasm.get_graph_info());

    setPuzzle(puzzleData);
    setGraphInfo(info);
    setSolved(false);
    setShowSolution(false);
    setMoveCount(0);
    setHintCount(0);
    setMaxHints(HINT_LIMITS[difficulty]);
    setValidation(null);
    setAnimatingVertices({});
    resetTimer();
    setTimerRunning(true);
    resetView();

    const cs = containerSizeRef.current;
    const visibleCols = Math.floor(cs.width / CELL_SIZE);
    const visibleRows = Math.floor(cs.height / CELL_SIZE);
    const maxGx = Math.max(visibleCols - GRID_PADDING * 2, info.grid_width);
    const maxGy = Math.max(visibleRows - GRID_PADDING * 2, info.grid_height);

    const initialPositions: Positions = {};
    const used = new Set<string>();
    puzzleData.vertices.forEach((v) => {
      let x: number,
        y: number,
        key: string,
        attempts = 0;
      do {
        x = Math.floor(Math.random() * (maxGx + 1));
        y = Math.floor(Math.random() * (maxGy + 1));
        key = `${x},${y}`;
        attempts++;
      } while (used.has(key) && attempts < 500);
      used.add(key);
      initialPositions[v] = [x, y];
    });
    setPositions(initialPositions);
    needsGenerate.current = false;
  }, [wasm, difficulty, containerSizeRef, resetTimer, setTimerRunning, resetView]);

  // Auto-generate when ready
  useEffect(() => {
    if (wasmReady && svgSize.width > 100 && needsGenerate.current) {
      generatePuzzle();
    }
  }, [wasmReady, svgSize, generatePuzzle]);

  // Regenerate on difficulty change
  useEffect(() => {
    needsGenerate.current = true;
    if (wasmReady && svgSize.width > 100) {
      generatePuzzle();
    }
  }, [difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Validate on position change
  useEffect(() => {
    if (!wasm || !puzzle || Object.keys(positions).length === 0) return;
    const posMap: Record<number, [number, number] | null> = {};
    for (const [id, pos] of Object.entries(positions)) posMap[Number(id)] = pos || null;
    let result: ValidationResult;
    try {
      result = JSON.parse(wasm.validate_placement(JSON.stringify(posMap)));
    } catch (e) {
      console.warn("validate_placement error:", e);
      return;
    }
    setValidation(result);
    if (result.is_solved && !solved && !showSolution) {
      setSolved(true);
      setTimerRunning(false);
    }
  }, [positions, wasm, puzzle, solved, showSolution, setTimerRunning]);

  const handleHint = useCallback(() => {
    if (!wasm || hintCount >= maxHints || solved) return;
    const posMap: Record<number, [number, number] | null> = {};
    for (const [id, pos] of Object.entries(positions)) posMap[Number(id)] = pos || null;
    const hintJson = wasm.get_hint(JSON.stringify(posMap));
    if (hintJson === "null") return;
    const hint = JSON.parse(hintJson);
    setHintCount((c) => c + 1);
    setMoveCount((c) => c + 1);
    setAnimatingVertices((prev) => ({ ...prev, [hint.vertex_id]: hint.correct_position }));
    setTimeout(() => {
      setPositions((prev) => ({
        ...prev,
        [hint.vertex_id]: [hint.correct_position[0], hint.correct_position[1]],
      }));
      setAnimatingVertices((prev) => {
        const next = { ...prev };
        delete next[hint.vertex_id];
        return next;
      });
    }, 500);
  }, [wasm, positions, hintCount, maxHints, solved]);

  const handleShowSolution = useCallback(() => {
    if (!wasm) return;
    const solution: Record<string, [number, number]> = JSON.parse(wasm.get_solution());
    setShowSolution(true);
    setTimerRunning(false);
    const animTargets: AnimatingVertices = {};
    for (const [id, pos] of Object.entries(solution)) animTargets[Number(id)] = [pos[0], pos[1]];
    setAnimatingVertices(animTargets);
    setTimeout(() => {
      const newPos: Positions = {};
      for (const [id, pos] of Object.entries(solution)) newPos[Number(id)] = [pos[0], pos[1]];
      setPositions(newPos);
      setAnimatingVertices({});
    }, 800);
  }, [wasm, setTimerRunning]);

  return {
    difficulty,
    setDifficulty,
    puzzle,
    graphInfo,
    positions,
    setPositions,
    validation,
    solved,
    showSolution,
    moveCount,
    setMoveCount,
    hintCount,
    maxHints,
    animatingVertices,
    generatePuzzle,
    handleHint,
    handleShowSolution,
  };
}
