import { Eye, Lightbulb } from "lucide-react";
import styles from "./BottomBar.module.css";

interface BottomBarProps {
  onHint: () => void;
  onShowSolution: () => void;
  hintCount: number;
  maxHints: number;
  solved: boolean;
  showSolution: boolean;
}

export function BottomBar({
  onHint,
  onShowSolution,
  hintCount,
  maxHints,
  solved,
  showSolution,
}: BottomBarProps) {
  return (
    <div className={styles.bottomBar}>
      <button
        onClick={onHint}
        disabled={hintCount >= maxHints || solved || showSolution}
        className={`${styles.btn} ${styles.btnHint}`}
      >
        <Lightbulb size={14} /> Hint ({maxHints - hintCount} left)
      </button>
      <button
        onClick={onShowSolution}
        disabled={solved || showSolution}
        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSolution}`}
      >
        <Eye size={14} /> Show Solution
      </button>
    </div>
  );
}
