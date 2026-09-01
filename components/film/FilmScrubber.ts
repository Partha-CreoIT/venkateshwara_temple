export type FilmScrubberOptions = {
  frameCount: number;
  frameSrc: (index: number) => string;
  onFirstFrame?: () => void;
  /**
   * Optional low-res canvas that receives a cover-filled copy of the current
   * frame — CSS blurs it into the devotional backdrop behind the film window.
   */
  backdropCanvas?: HTMLCanvasElement | null;
};

// The blurred backdrop only needs enough pixels to bleed colour, so keep it
// tiny — the CSS blur hides everything else and this stays effectively free.
const BACKDROP_WIDTH = 240;

// Retina (DPR 2) renders the 1600px frames crisply on hi-dpi panels and holds
// 60fps on GPU-accelerated canvas; the clearRect skip and blend threshold below
// keep the per-frame cost low enough for weaker devices too.
const MAX_DPR = 2;
const LOAD_CONCURRENCY = 6;
const PASS_STRIDES = [16, 4, 1];

/**
 * Scroll-scrubbed frame-sequence player. Draws the film frame matching the
 * current progress onto a canvas, blending adjacent frames for sub-frame
 * smoothness. Frames stream in over three progressively denser passes so the
 * journey is scrubbable before every frame has arrived.
 */
export class FilmScrubber {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: FilmScrubberOptions;
  private frames: (HTMLImageElement | null)[];
  private loaded: boolean[];
  private progress = 0;
  private dirty = true;
  private disposed = false;
  private rafId = 0;
  private firstFrameShown = false;
  private frameAspect = 16 / 9;
  private backdropCanvas: HTMLCanvasElement | null;
  private backdropCtx: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeHandler = () => {
    this.resize();
  };

  constructor(canvas: HTMLCanvasElement, options: FilmScrubberOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("FilmScrubber: 2d context unavailable");
    }
    this.canvas = canvas;
    this.ctx = ctx;
    // Default ("low") smoothing is GPU-fast bilinear. The 1600px-wide source
    // frames carry enough detail that upscale quality holds up, and "high"
    // resampling of a retina-sized canvas twice per frame tanks the frame rate.
    this.ctx.imageSmoothingEnabled = true;
    this.options = options;
    this.backdropCanvas = options.backdropCanvas ?? null;
    if (this.backdropCanvas) {
      this.backdropCtx = this.backdropCanvas.getContext("2d");
    }
    this.frames = new Array(options.frameCount).fill(null);
    this.loaded = new Array(options.frameCount).fill(false);
  }

  async init(): Promise<void> {
    this.resize();
    window.addEventListener("resize", this.resizeHandler);
    // The film window resizes (CSS) when it expands to full-screen for the
    // finale; a ResizeObserver keeps the canvas backing store in step so the
    // grow stays sharp instead of CSS-upscaling a small canvas.
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);
    }

    await this.loadFrame(0);
    this.loadFrame(this.options.frameCount - 1);
    this.startLoadQueue();
    this.renderLoop();
  }

  setProgress(progress: number): void {
    const clamped = Math.min(1, Math.max(0, progress));
    if (clamped !== this.progress) {
      this.progress = clamped;
      this.dirty = true;
    }
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resizeHandler);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.frames = [];
    this.loaded = [];
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const { clientWidth, clientHeight } = this.canvas;
    this.canvas.width = Math.round(clientWidth * dpr);
    this.canvas.height = Math.round(clientHeight * dpr);
    this.dirty = true;
  }

  private loadFrame(index: number): Promise<void> {
    if (this.loaded[index] || this.frames[index]) {
      return Promise.resolve();
    }
    const image = new Image();
    image.decoding = "async";
    this.frames[index] = image;
    return new Promise((resolve) => {
      let settled = false;
      const ready = () => {
        if (settled || this.disposed) {
          return;
        }
        settled = true;
        this.loaded[index] = true;
        this.frameAspect = image.naturalWidth / image.naturalHeight;
        this.dirty = true;
        resolve();
      };
      image.onerror = () => {
        if (settled) {
          return;
        }
        settled = true;
        this.frames[index] = null;
        resolve();
      };
      image.src = this.options.frameSrc(index);
      // decode() fully rasterises off the main thread, so the first drawImage
      // during a fast scroll can't trigger a synchronous decode hitch. onload
      // is the fallback for browsers that reject decode() on cached images.
      image.decode?.().then(ready, () => undefined);
      image.onload = ready;
    });
  }

  private startLoadQueue(): void {
    const queue: number[] = [];
    const queued = new Set<number>();
    for (const stride of PASS_STRIDES) {
      for (let i = 0; i < this.options.frameCount; i += stride) {
        if (!queued.has(i)) {
          queued.add(i);
          queue.push(i);
        }
      }
    }
    for (let i = 0; i < this.options.frameCount; i += 1) {
      if (!queued.has(i)) {
        queue.push(i);
      }
    }

    let cursor = 0;
    const next = (): void => {
      if (this.disposed || cursor >= queue.length) {
        return;
      }
      const index = queue[cursor];
      cursor += 1;
      this.loadFrame(index).then(next);
    };
    for (let lane = 0; lane < LOAD_CONCURRENCY; lane += 1) {
      next();
    }
  }

  private nearestLoaded(index: number): number {
    if (this.loaded[index]) {
      return index;
    }
    for (let offset = 1; offset < this.options.frameCount; offset += 1) {
      if (this.loaded[index - offset]) {
        return index - offset;
      }
      if (this.loaded[index + offset]) {
        return index + offset;
      }
    }
    return -1;
  }

  private renderLoop = (): void => {
    if (this.disposed) {
      return;
    }
    if (this.dirty) {
      this.dirty = false;
      this.draw();
    }
    this.rafId = requestAnimationFrame(this.renderLoop);
  };

  private draw(): void {
    const exact = this.progress * (this.options.frameCount - 1);
    const lower = Math.floor(exact);
    const upper = Math.min(lower + 1, this.options.frameCount - 1);
    const blend = exact - lower;

    const base = this.nearestLoaded(lower);
    if (base < 0) {
      return;
    }

    // The base frame is drawn cover-fill, so it always paints every canvas
    // pixel — no clearRect needed. The upper frame is alpha-blended on top for
    // sub-frame smoothness, skipped when its contribution is negligible.
    this.drawFrame(this.frames[base]!, 1);
    if (this.loaded[upper] && upper !== base && blend > 0.04) {
      this.drawFrame(this.frames[upper]!, blend);
    }

    this.drawBackdrop(this.frames[base]!);

    if (!this.firstFrameShown) {
      this.firstFrameShown = true;
      this.options.onFirstFrame?.();
    }
  }

  private drawBackdrop(image: HTMLImageElement): void {
    const ctx = this.backdropCtx;
    const canvas = this.backdropCanvas;
    if (!ctx || !canvas) {
      return;
    }
    if (canvas.width !== BACKDROP_WIDTH) {
      canvas.width = BACKDROP_WIDTH;
      canvas.height = Math.round(BACKDROP_WIDTH / this.frameAspect);
    }
    // Stretch the frame to fill the tiny backdrop canvas; aspect distortion is
    // invisible once CSS applies a heavy blur and the film window sits on top.
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  private drawFrame(image: HTMLImageElement, alpha: number): void {
    const { canvas, ctx } = this;
    const canvasAspect = canvas.width / canvas.height;
    // Cover-fill: the desktop set is 16:9 and the mobile set is 9:16, so each
    // matches its viewport orientation and fills edge-to-edge with only a
    // small centred overflow crop — no letterbox on any screen.
    let drawWidth: number;
    let drawHeight: number;
    if (canvasAspect > this.frameAspect) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / this.frameAspect;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * this.frameAspect;
    }

    ctx.globalAlpha = alpha;
    ctx.drawImage(
      image,
      (canvas.width - drawWidth) / 2,
      (canvas.height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    ctx.globalAlpha = 1;
  }
}
