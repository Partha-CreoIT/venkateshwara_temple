"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { SceneId } from "../../data/pilgrimage";

type DivineParticlesProps = {
  activeScene: SceneId;
  reducedMotion: boolean;
};

const colors: Record<SceneId, string> = {
  doors: "#d8a83e",
  approach: "#e2c36b",
  pillars: "#f0b35a",
  mandapam: "#6dd6c2",
  sanctum: "#f28d55",
  darshan: "#fff2b2",
  history: "#8dc6ff",
  festivals: "#ff8f70",
  blessing: "#fff4ce",
};

function createParticles(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    const left = (Math.sin(seed * 12.9898) * 43758.5453) % 1;
    const top = (Math.sin(seed * 78.233) * 24634.6345) % 1;
    const size = 2 + Math.abs(Math.sin(seed * 4.2)) * 5;
    const opacity = 0.18 + Math.abs(Math.sin(seed * 1.8)) * 0.45;
    const duration = 10 + Math.abs(Math.sin(seed * 2.7)) * 12;

    return {
      id: index,
      left: `${(Math.abs(left) * 100).toFixed(3)}%`,
      top: `${(Math.abs(top) * 100).toFixed(3)}%`,
      size: `${size.toFixed(3)}px`,
      opacity: opacity.toFixed(3),
      duration: `${duration.toFixed(3)}s`,
      delay: `${(-Math.abs(Math.sin(seed * 3.4)) * duration).toFixed(3)}s`,
    };
  });
}

export function DivineParticles({
  activeScene,
  reducedMotion,
}: DivineParticlesProps) {
  const particles = useMemo(() => createParticles(96), []);
  const color = colors[activeScene] ?? colors.doors;

  return (
    <div
      className="divine-particles"
      style={
        {
          "--particle-color": color,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span className="divine-glow" />
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="divine-particle"
          style={
            {
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              animationDuration: reducedMotion ? "0.001ms" : particle.duration,
              animationDelay: particle.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
