export type FilmScrubberOptions = {
  /**
   * Scrub-optimised encode of the flight (dense keyframes, no B-frames — see
   * scripts/build-film.sh). It is served as a normal MP4 URL so mobile browsers
   * can use native byte-range loading instead of waiting for a whole-file blob.
   */
  src: string;
  onFirstFrame?: () => void;
};

// The source runs at 24fps; a target within half a frame of the playhead is
// indistinguishable, so seeking again would only churn the decoder.
const SEEK_EPSILON = 1 / 48;
const READY_TIMEOUT_MS = 8000;
const HAVE_METADATA = 1;
const HAVE_CURRENT_DATA = 2;

/**
 * Scroll-scrubbed video player. The film is attached to a `<video>` element and
 * `currentTime` tracks scroll progress.
 *
 * Seeks are serialised: only one is ever in flight, and when it lands the
 * scrubber re-checks the target and seeks again only if the scroll moved on.
 * Firing `currentTime` writes faster than the decoder can land them makes the
 * browser cancel and restart seeks constantly, which is what video scrubbing
 * stutter usually is.
 */
export class FilmScrubber {
  private video: HTMLVideoElement;
  private options: FilmScrubberOptions;
  private duration = 0;
  private targetTime = 0;
  private seeking = false;
  private disposed = false;
  private firstFrameShown = false;
  private removeGesturePrime: (() => void) | null = null;

  private onSeeked = () => {
    this.seeking = false;
    this.kickSeek();
  };

  constructor(video: HTMLVideoElement, options: FilmScrubberOptions) {
    this.video = video;
    this.options = options;
  }

  async init(): Promise<void> {
    const { video } = this;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.addEventListener("seeked", this.onSeeked);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let timeoutId: number | null = null;

      const settle = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const onReady = () => {
        if (video.readyState >= HAVE_METADATA) {
          settle();
        }
      };
      const onError = () => {
        const detail = video.error
          ? `code ${video.error.code}${video.error.message ? `: ${video.error.message}` : ""}`
          : "unknown media error";
        settle(new Error(`FilmScrubber: ${this.options.src} failed to load (${detail})`));
      };
      const onTimeout = () => {
        if (video.readyState >= HAVE_METADATA) {
          settle();
          return;
        }
        settle(new Error(`FilmScrubber: ${this.options.src} did not load metadata`));
      };
      const cleanup = () => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("canplay", onReady);
        video.removeEventListener("error", onError);
      };
      timeoutId = window.setTimeout(onTimeout, READY_TIMEOUT_MS);
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("canplay", onReady);
      video.addEventListener("error", onError);
      video.src = this.options.src;
      video.load();
    });
    if (this.disposed) {
      return;
    }

    await this.primeDecoder();
    if (this.disposed) {
      return;
    }

    video.pause();
    this.duration = video.duration || 0;
    if (!this.duration) {
      throw new Error(`FilmScrubber: ${this.options.src} has no duration`);
    }
    if (!this.firstFrameShown) {
      this.firstFrameShown = true;
      this.options.onFirstFrame?.();
    }
  }

  setProgress(progress: number): void {
    if (this.disposed || !this.duration) {
      return;
    }
    const clamped = Math.min(1, Math.max(0, progress));
    // Pin the target just inside the tail: currentTime === duration can park on
    // an ended/black frame instead of the last picture.
    this.targetTime = Math.min(
      clamped * this.duration,
      this.duration - SEEK_EPSILON,
    );
    this.kickSeek();
  }

  dispose(): void {
    this.disposed = true;
    this.removeGesturePrime?.();
    this.removeGesturePrime = null;
    this.video.removeEventListener("seeked", this.onSeeked);
    this.video.removeAttribute("src");
    this.video.load();
  }

  private kickSeek(): void {
    if (this.seeking || this.disposed || !this.duration) {
      return;
    }
    if (Math.abs(this.video.currentTime - this.targetTime) < SEEK_EPSILON) {
      return;
    }
    this.seeking = true;
    this.video.currentTime = this.targetTime;
  }

  private async primeDecoder(): Promise<void> {
    if (this.video.readyState >= HAVE_CURRENT_DATA) {
      return;
    }

    const primed = await this.tryPlayPause();
    if (primed || this.disposed) {
      return;
    }

    this.installGesturePrime();
  }

  private async tryPlayPause(): Promise<boolean> {
    try {
      await this.video.play();
      this.video.pause();
      return true;
    } catch {
      return false;
    }
  }

  private installGesturePrime(): void {
    if (this.removeGesturePrime) {
      return;
    }

    const gestures = ["pointerdown", "touchstart", "keydown", "wheel"];
    const onGesture = () => {
      this.removeGesturePrime?.();
      this.removeGesturePrime = null;
      void this.tryPlayPause();
    };

    gestures.forEach((gesture) =>
      window.addEventListener(gesture, onGesture, { passive: true }),
    );
    this.removeGesturePrime = () => {
      gestures.forEach((gesture) => window.removeEventListener(gesture, onGesture));
    };
  }
}
