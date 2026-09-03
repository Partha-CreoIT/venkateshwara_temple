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
  filmVideoSrc,
  finaleImage,
  journeyChapters,
  templeInfo,
} from "../../data/journey";
import { FilmScrubber } from "../film/FilmScrubber";
import { UpcomingEvents } from "./UpcomingEvents";
import { useLenisScroll } from "../../hooks/useLenisScroll";
import { all, DUR, reveal, revealLines, scrollProgress, textFill } from "../../lib/motion";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const filmRef = useRef<FilmScrubber | null>(null);
  const chapterRef = useRef(0);
  const expandedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mantraUserSetRef = useRef(false);
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

  const startMantra = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return false;
    }
    audio.loop = true;
    audio.volume = 0.7;
    try {
      await audio.play();
      setMantraOn(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Mantra on by default: try to start immediately; if the browser blocks
  // autoplay, start on the first user interaction. A manual toggle opts out.
  useEffect(() => {
    if (!immersive) {
      return;
    }
    let cancelled = false;
    const gestures = ["pointerdown", "keydown", "touchstart", "wheel"];
    function onGesture() {
      gestures.forEach((g) => window.removeEventListener(g, onGesture));
      if (!mantraUserSetRef.current) {
        startMantra();
      }
    }
    void (async () => {
      const ok = await startMantra();
      if (cancelled || ok || mantraUserSetRef.current) {
        return;
      }
      gestures.forEach((g) =>
        window.addEventListener(g, onGesture, { passive: true }),
      );
    })();
    return () => {
      cancelled = true;
      gestures.forEach((g) => window.removeEventListener(g, onGesture));
    };
  }, [immersive, startMantra]);

  useEffect(() => {
    if (!immersive) {
      return;
    }
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let cancelled = false;
    const set = window.innerWidth <= 820 ? "m" : "d";
    const film = new FilmScrubber(video, {
      src: filmVideoSrc(set),
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
      const progress = scrollProgress(
        rootRef.current?.querySelector(".scroll-progress") ?? null,
      );
      if (!immersive) {
        return progress;
      }

      gsap.timeline({
        scrollTrigger: {
          id: "temple-journey",
          trigger: ".journey-stage",
          start: "top top",
          end: () => `+=${scrollLength()}`,
          pin: true,
          // Lenis already eases the scroll position; a scrub on top would
          // smooth the film a second time and leave it trailing the page.
          scrub: true,
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

      const root = rootRef.current;

      // The darshan band, on the shared vocabulary. Headings get masked-line
      // reveals; the three praise paragraphs get the scrubbed fill instead,
      // because the reader's scroll speed there *is* their reading speed.
      // Body copy is never given an entrance — only the statements are.
      const cleanups = [
        reveal(root?.querySelector(".darshan-portrait") ?? null, {
          y: 0,
          scale: 0.96,
          duration: DUR.slow,
          start: "top 68%",
        }),
        revealLines(root?.querySelector(".darshan-heading") ?? null, {
          start: "top 82%",
        }),
        reveal(root?.querySelector(".darshan-scroll") ?? null, {
          children: ".darshan-eyebrow-en, .darshan-mantra, .darshan-details",
          start: "top 78%",
        }),
        ...Array.from(
          root?.querySelectorAll<HTMLElement>(".darshan-para") ?? [],
        ).map((para) => textFill(para)),
      ];

      return all(progress, ...cleanups);
    },
    { scope: rootRef, dependencies: [immersive, updateChapter, updateExpanded] },
  );

  useGSAP(
    () => {
      if (!immersive || !filmReady) {
        return;
      }
      return revealLines(rootRef.current?.querySelector(".hero-title") ?? null, {
        immediate: true,
        delay: 0.15,
      });
    },
    { scope: rootRef, dependencies: [immersive, filmReady] },
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
    // Once the user touches the control, stop auto-cueing on scroll.
    mantraUserSetRef.current = true;
    if (mantraOn) {
      audio.pause();
      setMantraOn(false);
      return;
    }
    await startMantra();
  }, [mantraOn, startMantra]);

  return (
    <main ref={rootRef} className="journey-root">
      <span className="scroll-progress" aria-hidden="true" />
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
              <video
                ref={videoRef}
                className="journey-canvas"
                muted
                playsInline
                preload="none"
                aria-hidden="true"
              />
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
              <span className="kalasha-rule is-centered" aria-hidden="true" />
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
              <span className="kalasha-rule" aria-hidden="true" />
              <p className="darshan-eyebrow-en">
                <span className="kn">{darshanPraise.eyebrow.kn}</span> ·{" "}
                {darshanPraise.eyebrow.en}
              </p>
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
                <p className="kn">{templeInfo.samajaKannada}</p>
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

      <section className="mantra-band" aria-label="Mantra">
        <span className="kalasha-rule is-centered" aria-hidden="true" />
        <p className="mantra-band-text">{templeInfo.mantraKannada}</p>
        <p className="mantra-band-roman">{templeInfo.mantraEnglish}</p>
        <span className="kalasha-rule is-centered" aria-hidden="true" />
      </section>

      <UpcomingEvents />

      <footer className="journey-footer">
        <p className="footer-name">{templeInfo.nameEnglish}</p>
        <p className="footer-addr">{templeInfo.address}</p>
      </footer>
    </main>
  );
}
