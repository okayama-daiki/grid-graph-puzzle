import { useCallback, useEffect, useRef } from "react";
import { BottomBar } from "./components/BottomBar";
import { Confetti } from "./components/Confetti";
import { PuzzleCanvas } from "./components/PuzzleCanvas";
import { Toolbar } from "./components/Toolbar";
import { CELL_SIZE } from "./constants";
import { useAudio } from "./hooks/useAudio";
import { useContainerSize } from "./hooks/useContainerSize";
import { useDrag } from "./hooks/useDrag";
import { usePanZoom } from "./hooks/usePanZoom";
import { usePuzzle } from "./hooks/usePuzzle";
import { useTimer } from "./hooks/useTimer";
import { useWasm } from "./hooks/useWasm";
import { default as styles } from "./App.module.css";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { wasmReady, wasm } = useWasm();
  const { svgSize, containerSizeRef } = useContainerSize(containerRef);
  const timerControls = useTimer();
  const { muted, toggleMute, playNyoki, playPpon, playHint, playSolve } = useAudio();

  const {
    panOffset,
    zoom,
    resetView,
    handleBackgroundMouseDown,
    handleTouchStart,
    handlePinchMove,
    handlePanMove,
    endPanPinch,
  } = usePanZoom(svgRef);

  const puzzleState = usePuzzle({
    wasm,
    wasmReady,
    containerSizeRef,
    svgSize,
    resetTimer: timerControls.resetTimer,
    setTimerRunning: timerControls.setTimerRunning,
    resetView,
  });

  const cellSize = CELL_SIZE * zoom;

  const drag = useDrag({
    positions: puzzleState.positions,
    setPositions: puzzleState.setPositions,
    setMoveCount: puzzleState.setMoveCount,
    timerRunning: timerControls.timerRunning,
    setTimerRunning: timerControls.setTimerRunning,
    solved: puzzleState.solved,
    showSolution: puzzleState.showSolution,
    svgRef,
    panOffset,
    cellSize,
    onDrop: playNyoki,
  });

  useEffect(() => {
    if (puzzleState.solved && !puzzleState.showSolution) playSolve();
  }, [puzzleState.solved]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!drag.handleDragMove(e)) {
        handlePanMove(e);
      }
    },
    [drag, handlePanMove],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (handlePinchMove(e)) return;
      if (!drag.handleDragMove(e)) {
        handlePanMove(e);
      }
    },
    [handlePinchMove, drag, handlePanMove],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      drag.handleDragEnd(e);
      endPanPinch();
    },
    [drag, endPanPinch],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      drag.handleDragEnd(e);
      endPanPinch();
    },
    [drag, endPanPinch],
  );

  const handleMouseLeave = useCallback(() => {
    endPanPinch();
  }, [endPanPinch]);

  return (
    <div className={styles.app}>
      <Confetti active={puzzleState.solved && !puzzleState.showSolution} />

      <Toolbar
        difficulty={puzzleState.difficulty}
        onDifficultyChange={(d) => {
          playPpon();
          puzzleState.setDifficulty(d);
        }}
        onNewPuzzle={() => {
          playPpon();
          puzzleState.generatePuzzle();
        }}
        timer={timerControls.timer}
        moveCount={puzzleState.moveCount}
        validation={puzzleState.validation}
        solved={puzzleState.solved}
        showSolution={puzzleState.showSolution}
        hintCount={puzzleState.hintCount}
        muted={muted}
        onToggleMute={toggleMute}
      />

      <div ref={containerRef} className={styles.canvasContainer}>
        {!wasmReady && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingText}>Loading...</div>
          </div>
        )}
        <PuzzleCanvas
          svgRef={svgRef}
          svgWidth={svgSize.width}
          svgHeight={svgSize.height}
          puzzle={puzzleState.puzzle}
          validation={puzzleState.validation}
          dragging={drag.dragging}
          dragSvgPos={drag.dragSvgPos}
          positions={puzzleState.positions}
          animatingVertices={puzzleState.animatingVertices}
          solved={puzzleState.solved}
          showSolution={puzzleState.showSolution}
          panOffset={panOffset}
          zoom={zoom}
          onBackgroundMouseDown={handleBackgroundMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onVertexMouseDown={drag.handleVertexMouseDown}
        />
      </div>

      <BottomBar
        onHint={() => {
          playHint();
          puzzleState.handleHint();
        }}
        onShowSolution={puzzleState.handleShowSolution}
        hintCount={puzzleState.hintCount}
        maxHints={puzzleState.maxHints}
        solved={puzzleState.solved}
        showSolution={puzzleState.showSolution}
      />
    </div>
  );
}
