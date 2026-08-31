"use client";

import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BlessingScene } from "../scenes/BlessingScene";
import { DoorScene } from "../scenes/DoorScene";
import { FestivalScene } from "../scenes/FestivalScene";
import { HistoryScene } from "../scenes/HistoryScene";
import { DivineParticles } from "../three/DivineParticles";
import { SceneChrome } from "../ui/SceneChrome";
import { chapters, journeyProgress, type SceneId } from "../../data/pilgrimage";
import { useLenisScroll } from "../../hooks/useLenisScroll";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const journeyScenes: SceneId[] = [
  "approach",
  "pillars",
  "mandapam",
  "sanctum",
  "darshan",
];

function sceneFromPilgrimageProgress(progress: number): SceneId {
  if (progress < 0.14) return "doors";
  if (progress < 0.34) return "approach";
  if (progress < 0.56) return "pillars";
  if (progress < 0.78) return "mandapam";
  if (progress < 0.88) return "sanctum";
  return "darshan";
}

export function PilgrimageExperience() {
  const rootRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef<SceneId>("doors");
  const [activeScene, setActiveScene] = useState<SceneId>("doors");
  const reducedMotion = Boolean(useReducedMotion());
  const lenisRef = useLenisScroll(!reducedMotion);

  const setScene = useCallback((scene: SceneId) => {
    if (activeRef.current === scene) {
      return;
    }

    activeRef.current = scene;
    setActiveScene(scene);
  }, []);

  const scrollToTop = useCallback(
    (top: number) => {
      const lenis = lenisRef.current;

      if (lenis && !reducedMotion) {
        lenis.scrollTo(top, {
          duration: 1.1,
          easing: (time: number) => 1 - Math.pow(1 - time, 3),
        });
        return;
      }

      window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
    },
    [lenisRef, reducedMotion],
  );

  const handleNavigate = useCallback(
    (scene: SceneId) => {
      if (journeyScenes.includes(scene)) {
        const trigger = ScrollTrigger.getById("pilgrimage-pin-scroll");
        if (trigger) {
          const progress = journeyProgress[scene];
          scrollToTop(trigger.start + (trigger.end - trigger.start) * progress);
        }
        return;
      }

      const section = document.querySelector<HTMLElement>(
        `[data-scene="${scene}"]`,
      );
      if (!section) {
        return;
      }

      scrollToTop(window.scrollY + section.getBoundingClientRect().top);
    },
    [scrollToTop],
  );

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || reducedMotion) {
        return;
      }

      const selector = gsap.utils.selector(root);

      const corridorVideo = root.querySelector<HTMLVideoElement>(
        ".corridor-video",
      );

      gsap.set(selector(".progress-fill"), { scaleX: 0, transformOrigin: "0 0" });
      gsap.set(selector(".pilgrimage-stage"), { scale: 0.96 });
      gsap.set(selector(".entrance-scene"), {
        autoAlpha: 1,
        scale: 1,
        transformOrigin: "50% 59%",
      });
      gsap.set(selector(".corridor-video"), { autoAlpha: 1 });
      gsap.set(selector(".temple-door-set"), { autoAlpha: 1, scale: 1, yPercent: 0 });
      gsap.set(selector(".door-left"), { rotationY: 0 });
      gsap.set(selector(".door-right"), { rotationY: 0 });
      gsap.set(selector(".journey-copy"), { autoAlpha: 0, y: 28 });
      gsap.set(selector(".darshan-copy"), { autoAlpha: 0, y: 26 });

      gsap.to(selector(".progress-fill"), {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.2,
          invalidateOnRefresh: true,
        },
      });

      const pilgrimageTimeline = gsap.timeline({
        scrollTrigger: {
          id: "pilgrimage-pin-scroll",
          trigger: selector(".door-section")[0],
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 6.5)}`,
          pin: selector(".door-pin")[0],
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            setScene(sceneFromPilgrimageProgress(self.progress));

            if (corridorVideo) {
              if (self.progress >= 0.24 && corridorVideo.paused && !corridorVideo.ended) {
                corridorVideo.play().catch(() => {});
              } else if (self.progress < 0.18 && corridorVideo.currentTime > 0) {
                corridorVideo.pause();
                corridorVideo.currentTime = 0;
              }

              // keep playback near the scroll position so the curtain reveal
              // is always on screen by the end of the pin
              if (!corridorVideo.paused && !corridorVideo.ended) {
                const duration = corridorVideo.duration || 10;
                const expected =
                  ((self.progress - 0.24) / (0.93 - 0.24)) * duration;
                const drift = expected - corridorVideo.currentTime;
                corridorVideo.playbackRate = Math.min(
                  4,
                  Math.max(0.5, 1 + drift * 0.9),
                );
              }
            }
          },
        },
      });

      pilgrimageTimeline
        .to(selector(".temple-horizon"), { scale: 1.08, duration: 0.4, ease: "none" }, 0)
        .to(selector(".pilgrimage-stage"), { scale: 1.04, duration: 0.3, ease: "none" }, 0.06)
        .to(
          selector(".door-left"),
          { rotationY: -84, duration: 0.14, ease: "none" },
          0.04,
        )
        .to(
          selector(".door-right"),
          { rotationY: 84, duration: 0.14, ease: "none" },
          0.04,
        )
        .to(selector(".door-copy"), { autoAlpha: 0, y: -24, duration: 0.05, ease: "none" }, 0.09)
        .to(
          selector(".threshold-glow"),
          { opacity: 0.16, scale: 1.22, duration: 0.14, ease: "none" },
          0.06,
        )
        .to(selector(".threshold-glow"), { autoAlpha: 0, duration: 0.05, ease: "none" }, 0.2)
        .to(selector(".entrance-scene"), { scale: 1.7, duration: 0.12, ease: "power1.in" }, 0.06)
        .to(selector(".entrance-scene"), { scale: 4.2, duration: 0.08, ease: "power2.in" }, 0.18)
        .to(selector(".entrance-scene"), { autoAlpha: 0, duration: 0.05, ease: "none" }, 0.24)
        .to(selector(".approach-copy"), { autoAlpha: 1, y: 0, duration: 0.05, ease: "none" }, 0.14)
        .to(selector(".approach-copy"), { autoAlpha: 0, y: -20, duration: 0.05, ease: "none" }, 0.28)
        .to(selector(".pillars-copy"), { autoAlpha: 1, y: 0, duration: 0.05, ease: "none" }, 0.38)
        .to(selector(".pillars-copy"), { autoAlpha: 0, y: -20, duration: 0.05, ease: "none" }, 0.54)
        .to(selector(".mandapam-copy"), { autoAlpha: 1, y: 0, duration: 0.05, ease: "none" }, 0.62)
        .to(selector(".mandapam-copy"), { autoAlpha: 0, y: -20, duration: 0.05, ease: "none" }, 0.8)
        .to(selector(".darshan-copy"), { autoAlpha: 1, y: 0, duration: 0.07, ease: "none" }, 0.93);

      chapters
        .filter((chapter) =>
          ["history", "festivals", "blessing"].includes(chapter.id),
        )
        .forEach((chapter) => {
          const section = selector(`[data-scene="${chapter.id}"]`)[0];

          if (!section) {
            return;
          }

          ScrollTrigger.create({
            trigger: section,
            start: "top center",
            end: "bottom center",
            onEnter: () => setScene(chapter.id),
            onEnterBack: () => setScene(chapter.id),
          });
        });

      const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 300);

      return () => {
        window.clearTimeout(refresh);
        corridorVideo?.pause();
      };
    },
    { scope: rootRef, dependencies: [reducedMotion, setScene] },
  );

  return (
    <main ref={rootRef} className="relative min-h-screen overflow-x-hidden bg-ink-950">
      <DivineParticles activeScene={activeScene} reducedMotion={reducedMotion} />
      <SceneChrome activeScene={activeScene} onNavigate={handleNavigate} />
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none page-grain"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.38 }}
        transition={{ duration: reducedMotion ? 0 : 1.2 }}
      />
      <DoorScene />
      <HistoryScene />
      <FestivalScene />
      <BlessingScene />
    </main>
  );
}
