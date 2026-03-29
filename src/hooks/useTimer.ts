import { useCallback, useEffect, useRef, useState } from "react";

export function useTimer() {
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  const resetTimer = useCallback(() => {
    setTimer(0);
    setTimerRunning(false);
  }, []);

  return { timer, timerRunning, setTimerRunning, resetTimer };
}
