import { useCallback, useEffect, useRef, useState } from "react";

// ~80 BPM - ゆったりしたスイカゲーム風テンポ
const BEAT = 0.375;

// スイカゲーム風メロディ: 穏やかで可愛らしいペンタトニック
// Pattern A: メインメロディ（ほのぼの系）
const BGM_NOTES_A: [number, number][] = [
  [523.25, 0.5], // C5
  [587.33, 0.25], // D5
  [659.25, 0.5], // E5
  [523.25, 0.25], // C5
  [784.0, 0.75], // G5
  [659.25, 0.25], // E5
  [587.33, 0.5], // D5
  [523.25, 0.5], // C5
  [440.0, 0.5], // A4
  [523.25, 0.25], // C5
  [587.33, 0.5], // D5
  [659.25, 0.25], // E5
  [523.25, 0.75], // C5
  [440.0, 0.25], // A4
  [392.0, 0.5], // G4
  [440.0, 0.5], // A4
  [523.25, 1.0], // C5
];

// Pattern B: サブメロディ（より穏やか）
const BGM_NOTES_B: [number, number][] = [
  [392.0, 0.5], // G4
  [440.0, 0.5], // A4
  [523.25, 0.75], // C5
  [440.0, 0.25], // A4
  [392.0, 0.5], // G4
  [349.23, 0.5], // F4
  [329.63, 0.75], // E4
  [392.0, 0.25], // G4
  [440.0, 0.5], // A4
  [523.25, 0.5], // C5
  [587.33, 0.5], // D5
  [523.25, 0.25], // C5
  [440.0, 0.5], // A4
  [392.0, 0.25], // G4
  [349.23, 0.5], // F4
  [392.0, 0.5], // G4
  [523.25, 1.0], // C5
];

const BGM_PATTERNS = [BGM_NOTES_A, BGM_NOTES_B];

// 優しいベース音（ぽこぽこ）
function scheduleBass(ctx: AudioContext, master: GainNode, t: number, freq: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.45);
}

// ベースパターン（C-G-Am-F 風）
const BASS_PATTERN = [130.81, 98.0, 110.0, 87.31]; // C3, G2, A2, F2

export function useAudio() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const bgmSchedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const melodyNextRef = useRef(0);
  const melodyIndexRef = useRef(0);
  const melodyPatternRef = useRef(0); // 0=A, 1=B, alternates each loop
  const rhythmNextRef = useRef(0);
  const rhythmBeatRef = useRef(0);
  const bgmRunningRef = useRef(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const getAudio = useCallback((): { ctx: AudioContext; master: GainNode } | null => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new AudioContext();
        masterRef.current = ctxRef.current.createGain();
        masterRef.current.gain.value = 1;
        masterRef.current.connect(ctxRef.current.destination);
      } catch {
        return null;
      }
    }
    if (!masterRef.current) return null;
    return { ctx: ctxRef.current, master: masterRef.current };
  }, []);

  const scheduleBgmTick = useCallback(() => {
    if (mutedRef.current) return;
    const audio = getAudio();
    if (!audio) return;
    const { ctx, master } = audio;
    if (ctx.state === "suspended") void ctx.resume();
    const lookahead = 0.35;

    // Schedule melody notes（柔らかいサイン波で可愛く）
    while (melodyNextRef.current < ctx.currentTime + lookahead) {
      const pattern = BGM_PATTERNS[melodyPatternRef.current];
      const [freq, dur] = pattern[melodyIndexRef.current];
      const t = melodyNextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // 柔らかいアタックとリリース
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.06);
      gain.gain.setValueAtTime(0.08, t + dur * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      melodyNextRef.current += dur;
      melodyIndexRef.current += 1;
      if (melodyIndexRef.current >= pattern.length) {
        melodyIndexRef.current = 0;
        melodyPatternRef.current = (melodyPatternRef.current + 1) % BGM_PATTERNS.length;
      }
    }

    // Schedule bass & chime（ぽこぽこベースときらきらチャイム）
    while (rhythmNextRef.current < ctx.currentTime + lookahead) {
      const beatIndex = rhythmBeatRef.current % 8;
      const t = rhythmNextRef.current;
      // 2拍ごとにベース
      if (beatIndex % 2 === 0) {
        const bassNote = BASS_PATTERN[Math.floor(beatIndex / 2) % BASS_PATTERN.length];
        scheduleBass(ctx, master, t, bassNote);
      }
      rhythmNextRef.current += BEAT;
      rhythmBeatRef.current += 1;
    }
  }, [getAudio]);

  const startBgm = useCallback(() => {
    if (bgmRunningRef.current || mutedRef.current) return;
    const audio = getAudio();
    if (!audio) return;
    bgmRunningRef.current = true;
    const startTime = audio.ctx.currentTime + 0.1;
    melodyNextRef.current = startTime;
    melodyIndexRef.current = 0;
    melodyPatternRef.current = 0;
    rhythmNextRef.current = startTime;
    rhythmBeatRef.current = 0;
    bgmSchedulerRef.current = setInterval(scheduleBgmTick, 100);
    scheduleBgmTick();
  }, [getAudio, scheduleBgmTick]);

  const stopBgm = useCallback(() => {
    bgmRunningRef.current = false;
    if (bgmSchedulerRef.current) {
      clearInterval(bgmSchedulerRef.current);
      bgmSchedulerRef.current = null;
    }
  }, []);

  const ensureBgm = useCallback(() => {
    if (!mutedRef.current && !bgmRunningRef.current) startBgm();
  }, [startBgm]);

  // にょきっ — vertex placed on grid (rising sweep, spring-like)
  const playNyoki = useCallback(() => {
    if (mutedRef.current) return;
    ensureBgm();
    const audio = getAudio();
    if (!audio) return;
    const { ctx, master } = audio;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.25);
  }, [getAudio, ensureBgm]);

  // っぽん — pop sound for new puzzle / difficulty change
  const playPpon = useCallback(() => {
    if (mutedRef.current) return;
    ensureBgm();
    const audio = getAudio();
    if (!audio) return;
    const { ctx, master } = audio;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.18);
  }, [getAudio, ensureBgm]);

  // Hint — gentle two-note ascending chime
  const playHint = useCallback(() => {
    if (mutedRef.current) return;
    const audio = getAudio();
    if (!audio) return;
    const { ctx, master } = audio;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    (
      [
        [523.25, 0],
        [659.25, 0.13],
      ] as [number, number][]
    ).forEach(([f, d]) => {
      const t = now + d;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }, [getAudio]);

  // Solve — ascending C major arpeggio fanfare
  const playSolve = useCallback(() => {
    if (mutedRef.current) return;
    const audio = getAudio();
    if (!audio) return;
    const { ctx, master } = audio;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    [523.25, 659.25, 784.0, 1046.5].forEach((f, i) => {
      const t = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }, [getAudio]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (next) {
        stopBgm();
      } else {
        bgmRunningRef.current = false;
      }
      return next;
    });
  }, [stopBgm]);

  useEffect(() => () => stopBgm(), [stopBgm]);

  return { muted, toggleMute, playNyoki, playPpon, playHint, playSolve };
}
