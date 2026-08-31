"use client";

import { MapPinned } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MantraSoundscape } from "../audio/MantraSoundscape";
import type { SceneId } from "../../data/pilgrimage";

type SceneChromeProps = {
  activeScene: SceneId;
  onNavigate: (scene: SceneId) => void;
};

export function SceneChrome({ activeScene, onNavigate }: SceneChromeProps) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <motion.header
        aria-label="Virtual pilgrimage navigation"
        className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-4 py-4 text-gold-100 sm:px-6 lg:px-10"
        initial={{ opacity: 0, y: reducedMotion ? 0 : -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.6, ease: "easeOut" }}
      >
        <button
          type="button"
          className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold-200/20 bg-black/30 text-gold-100 backdrop-blur-md transition hover:border-gold-200/60 hover:text-white"
          onClick={() => onNavigate("doors")}
          aria-label="Return to temple doors"
        >
          <MapPinned className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="text-right">
          <p className="text-xs uppercase text-gold-100/60">Tirumala Balaji</p>
          <p className="text-sm text-white">Virtual Darshan</p>
        </div>
      </motion.header>

      <div className="fixed left-0 right-0 top-0 z-50 h-1 origin-left bg-gold-300 progress-fill" />
      <MantraSoundscape activeScene={activeScene} />
    </>
  );
}
