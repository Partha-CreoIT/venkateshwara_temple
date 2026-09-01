"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Volume2, VolumeX } from "lucide-react";
import {
  darshanPraise,
  FILM_FRAME_COUNT,
  filmFrameSrc,
  finaleImage,
  journeyChapters,
  templeInfo,
} from "../../data/journey";
import { FilmScrubber } from "../film/FilmScrubber";
import { UpcomingEvents } from "./UpcomingEvents";
import { useLenisScroll } from "../../hooks/useLenisScroll";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CHAPTER_COUNT = journeyChapters.length;
const scrollLength = () => Math.round(window.innerHeight * 7);
const CAPTION_WINDOW = 0.055;
// Past this progress the film window expands to full-screen for the darshan.
const DARSHAN_EXPAND_AT = 0.88;

function chapterAtProgress(progress: number): number {
  let active = 0;
  for (let i = 0; i < CHAPTER_COUNT; i += 1) {
    if (Math.abs(progress - journeyChapters[i].at) <= CAPTION_WINDOW) {
      return i;
    }
    if (progress >= journeyChapters[i].at) {
      active = i;
    }
  }
  return progress < journeyChapters[1].at ? 0 : active;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function TempleJourney() {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const filmRef = useRef<FilmScrubber | null>(null);
  const chapterRef = useRef(0);
  const expandedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [chapter, setChapter] = useState(0);
  const [filmFailed, setFilmFailed] = useState(false);
  const [filmReady, setFilmReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mantraOn, setMantraOn] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const lenisRef = useLenisScroll(!reducedMotion);

  const immersive = !reducedMotion && !filmFailed;

  const updateChapter = useCallback((index: number) => {
    if (chapterRef.current !== index) {
      chapterRef.current = index;
      setChapter(index);
    }
  }, []);

  const updateExpanded = useCallback((next: boolean) => {
    if (expandedRef.current !== next) {
      expandedRef.current = next;
      setExpanded(next);
    }
  }, []);

  useEffect(() => {
    if (!immersive) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    const set = window.innerWidth <= 820 ? "m" : "d";
    const film = new FilmScrubber(canvas, {
      frameCount: FILM_FRAME_COUNT,
      frameSrc: (index) => filmFrameSrc(set, index),
      onFirstFrame: () => {
        if (!cancelled) {
          setFilmReady(true);
        }
      },
    });
    filmRef.current = film;
    film
      .init()
      .then(() => {
        if (!cancelled) {
          ScrollTrigger.refresh();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFilmFailed(true);
        }
      });

    return () => {
      cancelled = true;
      film.dispose();
      filmRef.current = null;
    };
  }, [immersive]);

  useGSAP(
    () => {
      if (!immersive) {
        return;
      }

      gsap.timeline({
        scrollTrigger: {
          id: "temple-journey",
          trigger: ".journey-stage",
          start: "top top",
          end: () => `+=${scrollLength()}`,
          pin: true,
          scrub: 0.12,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            filmRef.current?.setProgress(self.progress);
            updateChapter(chapterAtProgress(self.progress));
            updateExpanded(self.progress >= DARSHAN_EXPAND_AT);
          },
        },
      });

      gsap.fromTo(
        ".journey-progress-fill",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          transformOrigin: "top center",
          scrollTrigger: {
            trigger: ".journey-stage",
            start: "top top",
            end: () => `+=${scrollLength()}`,
            scrub: 0.12,
          },
        },
      );

      gsap.fromTo(
        ".darshan-scroll > *",
        { autoAlpha: 0, y: 34 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: "power2.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: ".darshan-scroll",
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.fromTo(
        ".darshan-portrait",
        { autoAlpha: 0, scale: 0.96 },
        {
          autoAlpha: 1,
          scale: 1,
          duration: 1.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".darshan-panel",
            start: "top 68%",
            toggleActions: "play none none reverse",
          },
        },
      );
    },
    { scope: rootRef, dependencies: [immersive, updateChapter, updateExpanded] },
  );

  const scrollToChapter = useCallback(
    (index: number) => {
      const trigger = ScrollTrigger.getById("temple-journey");
      if (!trigger) {
        return;
      }
      const target =
        trigger.start + (trigger.end - trigger.start) * journeyChapters[index].at;
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(target, { duration: 1.4 });
      } else {
        window.scrollTo({ top: target, behavior: "smooth" });
      }
    },
    [lenisRef],
  );

  const toggleMantra = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (mantraOn) {
      audio.pause();
      setMantraOn(false);
      return;
    }
    audio.loop = true;
    audio.volume = 0.7;
    try {
      await audio.play();
      setMantraOn(true);
    } catch {
      setMantraOn(false);
    }
  }, [mantraOn]);

  return (
    <main ref={rootRef} className="journey-root">
      <audio ref={audioRef} src="/mantra/mantra.mp3" loop preload="none" />
      <button
        type="button"
        className="journey-audio"
        onClick={toggleMantra}
        aria-pressed={mantraOn}
        aria-label={mantraOn ? "Turn mantra off" : "Play mantra audio"}
      >
        {mantraOn ? (
          <Volume2 className="journey-audio-icon" aria-hidden="true" />
        ) : (
          <VolumeX className="journey-audio-icon" aria-hidden="true" />
        )}
        <span>{mantraOn ? "Mantra on" : "Mantra"}</span>
      </button>

      {immersive ? (
        <>
          <div
            className={[
              "journey-stage",
              expanded ? "is-darshan" : "",
              chapter === 0 ? "is-intro" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="film-card">
              <canvas ref={canvasRef} className="journey-canvas" aria-hidden="true" />
              <div className="film-card-sheen" aria-hidden="true" />
            </div>

            <div
              className={`journey-loader ${filmReady ? "is-done" : ""}`}
              aria-hidden="true"
            >
              <p className="loader-mantra">{templeInfo.mantraKannada}</p>
              <span className="loader-glow" />
            </div>

            <header className="journey-hero">
              <p className="hero-kicker">{templeInfo.samajaKannada}</p>
              <h1 className="hero-title">{templeInfo.nameKannada}</h1>
              <p className="hero-sub">{templeInfo.nameEnglish}</p>
              <p className="hero-addr">{templeInfo.address}</p>
              <div className="scroll-hint" aria-hidden="true">
                <span className="scroll-hint-dot" />
                Scroll to enter
              </div>
            </header>

            {journeyChapters.map((entry, index) =>
              index === 0 ? null : (
                <aside
                  key={entry.id}
                  className={[
                    "journey-caption",
                    entry.align === "right" ? "is-right" : "",
                    chapter === index ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden={chapter !== index}
                >
                  <p className="caption-kicker">
                    {String(index + 1).padStart(2, "0")} · {entry.kicker}
                  </p>
                  <h2 className="caption-title">{entry.title}</h2>
                  <p className="caption-body">{entry.body}</p>
                </aside>
              ),
            )}

            <nav className="journey-rail" aria-label="Journey chapters">
              <span className="journey-progress-track" aria-hidden="true">
                <span className="journey-progress-fill" />
              </span>
              {journeyChapters.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`journey-dot ${chapter === index ? "is-active" : ""}`}
                  onClick={() => scrollToChapter(index)}
                  aria-label={`Go to ${entry.title}`}
                />
              ))}
            </nav>
          </div>

          <section className="darshan-panel">
            <figure className="darshan-portrait">
              <img
                src={finaleImage}
                alt={`Darshan of ${templeInfo.nameEnglish}`}
                className="darshan-image"
              />
              <figcaption className="darshan-nameplate">
                <p className="darshan-eyebrow">{templeInfo.mantraKannada}</p>
                <h2 className="darshan-name-kn">{templeInfo.nameKannada}</h2>
                <p className="darshan-name-en">{templeInfo.nameEnglish}</p>
              </figcaption>
            </figure>

            <div className="darshan-scroll">
              <p className="darshan-eyebrow-en">{darshanPraise.eyebrow}</p>
              <h3 className="darshan-heading">{darshanPraise.heading}</h3>
              {darshanPraise.paragraphs.map((para, index) => (
                <p key={index} className="darshan-para">
                  {para}
                </p>
              ))}
              <p className="darshan-mantra">
                {templeInfo.mantraKannada}
                <span>{templeInfo.mantraEnglish}</span>
              </p>
              <div className="darshan-details">
                <p>{templeInfo.samajaKannada}</p>
                <p>{templeInfo.address}</p>
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="journey-fallback">
          <header className="fallback-hero">
            <p className="hero-kicker">{templeInfo.samajaKannada}</p>
            <h1 className="hero-title">{templeInfo.nameKannada}</h1>
            <p className="hero-sub">{templeInfo.nameEnglish}</p>
            <p className="hero-addr">{templeInfo.address}</p>
          </header>
          {journeyChapters.map((entry, index) => (
            <figure key={entry.id} className="fallback-section">
              <img src={entry.image} alt={entry.title} loading="lazy" />
              <figcaption>
                <p className="caption-kicker">
                  {String(index + 1).padStart(2, "0")} · {entry.kicker}
                </p>
                <h2 className="caption-title">{entry.title}</h2>
                <p className="caption-body">{entry.body}</p>
              </figcaption>
            </figure>
          ))}
          <figure className="fallback-section">
            <img src={finaleImage} alt={`Darshan of ${templeInfo.nameEnglish}`} loading="lazy" />
            <figcaption>
              <p className="caption-kicker">ದರ್ಶನ · Darshan</p>
              <h2 className="caption-title">{templeInfo.mantraEnglish}</h2>
            </figcaption>
          </figure>
        </div>
      )}

      <UpcomingEvents />

      <footer className="journey-footer">
        <p className="footer-name">{templeInfo.nameEnglish}</p>
        <p className="footer-addr">{templeInfo.address}</p>
      </footer>
    </main>
  );
}
