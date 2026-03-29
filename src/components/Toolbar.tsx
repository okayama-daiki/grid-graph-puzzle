import { AlertTriangle, RotateCcw, Timer, Trophy, Volume2, VolumeOff } from "lucide-react";
import { DIFFICULTY_LABELS } from "../constants";
import type { ValidationResult } from "../types";
import { formatTime } from "../utils";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  difficulty: number;
  onDifficultyChange: (d: number) => void;
  onNewPuzzle: () => void;
  timer: number;
  moveCount: number;
  validation: ValidationResult | null;
  solved: boolean;
  showSolution: boolean;
  hintCount: number;
  muted: boolean;
  onToggleMute: () => void;
}

export function Toolbar({
  difficulty,
  onDifficultyChange,
  onNewPuzzle,
  timer,
  moveCount,
  validation,
  solved,
  showSolution,
  hintCount,
  muted,
  onToggleMute,
}: ToolbarProps) {
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h1 className={styles.toolbarTitle}>Grid Graph Puzzle</h1>
          <div className={styles.difficultyGroup}>
            {DIFFICULTY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => onDifficultyChange(i)}
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnDifficulty} ${difficulty === i ? styles.active : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={onNewPuzzle} className={`${styles.btn} ${styles.btnSecondary}`}>
            <RotateCcw size={14} /> New Puzzle
          </button>
        </div>
        <button
          onClick={onToggleMute}
          className={`${styles.btn} ${styles.btnSecondary}`}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeOff size={14} /> : <Volume2 size={14} />}
        </button>
        <div className={styles.toolbarStats}>
          <div className={styles.statItem}>
            <Timer size={14} />
            <span className={styles.mono}>{formatTime(timer)}</span>
          </div>
          <div>
            Moves: <span className={styles.mono}>{moveCount}</span>
          </div>
          {validation && (
            <div>
              Edges:{" "}
              <span className={`${styles.mono} ${styles.textGreen}`}>
                {validation.correct_edge_count}
              </span>
              <span className={styles.textMuted}>/</span>
              <span className={styles.mono}>{validation.total_edge_count}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.bannerSlot}>
        {validation &&
          validation.has_extra_adjacencies &&
          validation.correct_edge_count === validation.total_edge_count &&
          !solved && (
            <div className={styles.bannerWarning}>
              <AlertTriangle size={14} /> Extra adjacency detected: some non-edge vertex pairs are
              at distance 1.
            </div>
          )}

        {solved && !showSolution && (
          <div className={styles.bannerSolved}>
            <Trophy size={20} />
            <span className={styles.bannerSolvedTitle}>Congratulations!</span>
            <span>
              Time: {formatTime(timer)} | Moves: {moveCount} | Hints: {hintCount}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
