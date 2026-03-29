import { useEffect, useState } from "react";
import { CONFETTI_COLORS, CONFETTI_PARTICLE_COUNT } from "../constants";
import styles from "./Confetti.module.css";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotSpeed: number;
  isCircle: boolean;
}

export function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }
    setParticles(
      Array.from({ length: CONFETTI_PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 8 + Math.random() * 3,
        speedX: (Math.random() - 0.5) * 3,
        speedY: 2 + Math.random() * 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        isCircle: Math.random() > 0.5,
      })),
    );
  }, [active]);

  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.speedX * 0.3,
            y: p.y + p.speedY * 0.3,
            rotation: p.rotation + p.rotSpeed,
            speedY: p.speedY + 0.05,
          }))
          .filter((p) => p.y < 120);
        if (next.length === 0) clearInterval(interval);
        return next;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [particles.length > 0]);

  if (particles.length === 0) return null;

  return (
    <div className={styles.confettiLayer}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? "50%" : "0",
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
