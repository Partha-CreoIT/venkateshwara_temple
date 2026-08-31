"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { SceneId } from "../../data/pilgrimage";

type MantraSoundscapeProps = {
  activeScene: SceneId;
};

export function MantraSoundscape({ activeScene }: MantraSoundscapeProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const manuallyStoppedRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const isDarshan = activeScene === "darshan" || activeScene === "blessing";

  const playMantra = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.loop = true;
    audio.volume = isDarshan ? 0.88 : 0.68;

    try {
      await audio.play();
      setEnabled(true);
    } catch {
      setEnabled(false);
    }
  }, [isDarshan]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = isDarshan ? 0.88 : 0.68;
  }, [isDarshan]);

  useEffect(() => {
    if (enabled || manuallyStoppedRef.current) {
      return;
    }

    const playAfterGesture = () => {
      void playMantra();
    };

    window.addEventListener("pointerdown", playAfterGesture);
    window.addEventListener("keydown", playAfterGesture);
    window.addEventListener("touchstart", playAfterGesture, { passive: true });
    window.addEventListener("wheel", playAfterGesture, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", playAfterGesture);
      window.removeEventListener("keydown", playAfterGesture);
      window.removeEventListener("touchstart", playAfterGesture);
      window.removeEventListener("wheel", playAfterGesture);
    };
  }, [enabled, playMantra]);

  useEffect(() => {
    if (enabled) {
      return;
    }

    audioRef.current?.pause();
  }, [enabled]);

  const toggleMantra = () => {
    if (enabled) {
      manuallyStoppedRef.current = true;
      setEnabled(false);
      return;
    }

    manuallyStoppedRef.current = false;
    void playMantra();
  };

  return (
    <>
      <audio ref={audioRef} src="/mantra/mantra.mp3" loop preload="auto" />
      <button
        type="button"
        className="mantra-control"
        onClick={toggleMantra}
        aria-pressed={enabled}
        aria-label={enabled ? "Turn mantra off" : "Enable mantra audio"}
      >
        {enabled ? (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{enabled ? "Mantra playing" : "Enable mantra"}</span>
      </button>
    </>
  );
}
