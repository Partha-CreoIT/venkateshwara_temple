export type FilmScrubberOptions = {
  /**
   * Scrub-optimised encode of the flight (dense keyframes, no B-frames — see
   * scripts/build-film.sh). Fetched whole, then played from a blob URL so every
   * seek is served from memory, never from the network.
   */
  src: string;
  onFirstFrame?: () => void;
};

// The source runs at 24fps; a target within half a frame of the playhead is
// indistinguishable, so seeking again would only churn the decoder.
const SEEK_EPSILON = 1 / 48;

/**
 * Scroll-scrubbed video player. The whole film is fetched once and served to a
 * `<video>` element as a blob, then `currentTime` tracks scroll progress.
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
  private objectUrl: string | null = null;
  private duration = 0;
  private targetTime = 0;
  private seeking = false;
  private disposed = false;
  private firstFrameShown = false;

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
    video.playsInline = true;
    video.preload = "auto";
    video.addEventListener("seeked", this.onSeeked);

    const response = await fetch(this.options.src);
    if (!response.ok) {
      throw new Error(`FilmScrubber: ${this.options.src} → HTTP ${response.status}`);
    }
    const blob = await response.blob();
    if (this.disposed) {
      return;
    }

    this.objectUrl = URL.createObjectURL(blob);
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("FilmScrubber: video failed to decode"));
      };
      const cleanup = () => {
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("error", onError);
      video.src = this.objectUrl!;
    });
    if (this.disposed) {
      return;
    }

    video.pause();
    this.duration = video.duration || 0;
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
    this.video.removeEventListener("seeked", this.onSeeked);
    this.video.removeAttribute("src");
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
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
}
