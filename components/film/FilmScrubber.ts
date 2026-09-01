export type FilmAtlas = {
  src: string;
  /** Tiles per row in the sheet. */
  cols: number;
  tileWidth: number;
  tileHeight: number;
};

export type FilmScrubberOptions = {
  frameCount: number;
  frameSrc: (index: number) => string;
  /**
   * Low-resolution sheet holding every frame of the sequence in one file. It
   * lands in about a second and gives the scrubber complete coverage while the
   * sharp frames are still arriving — see `drawSource` for why that matters.
   */
  atlas?: FilmAtlas | null;
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

// The source frames are only 1600px wide, so a retina-sized backing store
// upscales rather than adding detail — it just quadruples the per-frame fill
// cost and shows up as scroll judder. Cap well below the device ratio.
const MAX_DPR = 1.25;

const LOAD_CONCURRENCY = 6;

// Frames behind the playhead are worth this many frames ahead of it. Scrolling
// is overwhelmingly forwards, so bandwidth should run ahead of the viewer, but
// a little backward cover keeps a reversal from falling back to the atlas.
const BACKWARD_PENALTY = 3;

// How long after the last progress change the scroll counts as stopped. GSAP's
// scrub eases for ~120ms past the final input, so this waits just beyond it.
const SETTLE_MS = 140;

// A frame that has failed this many times is abandoned to the atlas. Without a
// cap, the nearest-first picker re-selects a permanently failing frame the
// instant it settles and spins on it forever.
const MAX_FRAME_ATTEMPTS = 2;

type FrameSource = HTMLImageElement | ImageBitmap;

/**
 * Scroll-scrubbed frame-sequence player. Draws the film frame matching the
 * current progress onto a canvas, blending adjacent frames for sub-frame
 * smoothness.
 *
 * Loading is two-tier. A single low-res atlas covers the whole sequence almost
 * immediately; the sharp frames then stream in nearest-to-playhead-first and
 * replace the atlas tile by tile. The viewer sees a soft frame sharpen rather
 * than the wrong frame held — which is what a partially-loaded sequence used
 * to look like, and what read as choppiness.
 */
export class FilmScrubber {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: FilmScrubberOptions;
  private frames: (HTMLImageElement | null)[];
  private loaded: boolean[];
  private inflight: boolean[];
  private attempts: number[];
  private activeLoads = 0;
  private atlas: FrameSource | null = null;
  private progress = 0;
  private direction = 1;
  // Starts settled so the opening frame paints crisp before any scrolling.
  private settled = true;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId = 0;
  private drawnAt = -1;
  private disposed = false;
  private firstFrameShown = false;
  private frameAspect = 16 / 9;
  private backdropCanvas: HTMLCanvasElement | null;
  private backdropCtx: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeHandler = () => {
    this.resize();
    this.invalidate();
  };

  constructor(canvas: HTMLCanvasElement, options: FilmScrubberOptions) {
    // `alpha: false` lets the compositor skip per-pixel blending on a canvas we
    // always cover-fill; `desynchronized` unblocks the paint from the main
    // thread's rAF, which is what scrubbing wants.
    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    }) as CanvasRenderingContext2D | null;
    if (!ctx) {
      throw new Error("FilmScrubber: 2d context unavailable");
    }
    this.canvas = canvas;
    this.ctx = ctx;
    // Default ("low") smoothing is GPU-fast bilinear, and the atlas tiles are
    // pre-blurred, so nothing here benefits from "high" resampling twice a frame.
    this.ctx.imageSmoothingEnabled = true;
    this.options = options;
    this.backdropCanvas = options.backdropCanvas ?? null;
    if (this.backdropCanvas) {
      this.backdropCtx = this.backdropCanvas.getContext("2d");
    }
    this.frames = new Array(options.frameCount).fill(null);
    this.loaded = new Array(options.frameCount).fill(false);
    this.inflight = new Array(options.frameCount).fill(false);
    this.attempts = new Array(options.frameCount).fill(0);
  }

  async init(): Promise<void> {
    this.resize();
    window.addEventListener("resize", this.resizeHandler);
    // The film window resizes (CSS) when it expands to full-screen for the
    // finale; a ResizeObserver keeps the canvas backing store in step so the
    // grow stays sharp instead of CSS-upscaling a small canvas.
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
        this.invalidate();
      });
      this.resizeObserver.observe(this.canvas);
    }

    // The atlas and the opening frame race: whichever lands first clears the
    // loader. Frame 0 is ~130 KB against the atlas's ~1 MB, so the opening
    // beat is normally sharp from the very first paint.
    this.loadAtlas();
    // Claim a slot for frame 0 before pump() fills the rest, so the opening
    // frame is always in the first wave rather than merely likely to be.
    const opening = this.loadFrame(0);
    this.pump();
    await opening;
    this.invalidate();
  }

  setProgress(progress: number): void {
    const clamped = Math.min(1, Math.max(0, progress));
    if (clamped === this.progress) {
      return;
    }
    this.direction = clamped >= this.progress ? 1 : -1;
    this.progress = clamped;
    this.settled = false;
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
    }
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      this.settled = true;
      // Force a repaint: the position has not changed, only how it is drawn.
      this.drawnAt = -1;
      this.invalidate();
    }, SETTLE_MS);
    this.invalidate();
    // A new playhead reorders what is worth fetching, so wake the loader too.
    this.pump();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    window.removeEventListener("resize", this.resizeHandler);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.atlas && "close" in this.atlas) {
      this.atlas.close();
    }
    this.atlas = null;
    this.frames = [];
    this.loaded = [];
    this.inflight = [];
    this.attempts = [];
  }

  private invalidate(): void {
    if (this.disposed || this.rafId) {
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.draw();
    });
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const { clientWidth, clientHeight } = this.canvas;
    const width = Math.max(1, Math.round(clientWidth * dpr));
    const height = Math.max(1, Math.round(clientHeight * dpr));
    if (this.canvas.width === width && this.canvas.height === height) {
      return;
    }
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = true;
    this.drawnAt = -1;
  }

  private loadAtlas(): void {
    const atlas = this.options.atlas;
    if (!atlas) {
      return;
    }
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "high";
    image.src = atlas.src;
    const ready = async () => {
      if (this.disposed || this.atlas) {
        return;
      }
      // An ImageBitmap is cheaper to draw sub-rects from repeatedly than a
      // 13-megapixel <img>, which some browsers re-convert on every drawImage.
      try {
        this.atlas = await createImageBitmap(image);
      } catch {
        this.atlas = image;
      }
      if (this.disposed) {
        return;
      }
      this.invalidate();
    };
    image.decode?.().then(ready, () => undefined);
    image.onload = () => void ready();
  }

  private loadFrame(index: number): Promise<void> {
    if (this.disposed || this.loaded[index] || this.inflight[index]) {
      return Promise.resolve();
    }
    this.inflight[index] = true;
    this.attempts[index] += 1;
    this.activeLoads += 1;
    const image = new Image();
    image.decoding = "async";
    this.frames[index] = image;
    return new Promise((resolve) => {
      let settled = false;
      const settle = (ok: boolean) => {
        if (settled || this.disposed) {
          return;
        }
        settled = true;
        this.activeLoads -= 1;
        this.inflight[index] = false;
        if (ok) {
          this.loaded[index] = true;
          this.frameAspect = image.naturalWidth / image.naturalHeight;
          // Only the frame under the playhead changes what is on screen.
          if (Math.round(this.progress * (this.options.frameCount - 1)) === index) {
            this.drawnAt = -1;
            this.invalidate();
          }
        } else {
          this.frames[index] = null;
        }
        resolve();
      };
      image.onerror = () => settle(false);
      image.src = this.options.frameSrc(index);
      // decode() fully rasterises off the main thread, so the first drawImage
      // during a fast scroll can't trigger a synchronous decode hitch. onload
      // is the fallback for browsers that reject decode() on cached images.
      image.decode?.().then(() => settle(true), () => undefined);
      image.onload = () => settle(true);
    });
  }

  /**
   * Fill the free download slots with the unloaded frames closest to the
   * playhead, biased in the direction of travel. The atlas already covers the
   * rest of the film, so bandwidth belongs to whatever the viewer is about to
   * reach rather than to a fixed front-to-back sweep.
   */
  private pump(): void {
    if (this.disposed) {
      return;
    }
    while (this.activeLoads < LOAD_CONCURRENCY) {
      const next = this.nextToLoad();
      if (next < 0) {
        return;
      }
      void this.loadFrame(next).then(() => this.pump());
    }
  }

  private nextToLoad(): number {
    const center = this.progress * (this.options.frameCount - 1);
    let best = -1;
    let bestCost = Infinity;
    for (let i = 0; i < this.options.frameCount; i += 1) {
      if (this.loaded[i] || this.inflight[i] || this.attempts[i] >= MAX_FRAME_ATTEMPTS) {
        continue;
      }
      const delta = i - center;
      const cost =
        delta >= 0
          ? delta * (this.direction >= 0 ? 1 : BACKWARD_PENALTY)
          : -delta * (this.direction >= 0 ? BACKWARD_PENALTY : 1);
      if (cost < bestCost) {
        bestCost = cost;
        best = i;
      }
    }
    return best;
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

  private draw(): void {
    if (this.disposed || !this.canvas.width) {
      return;
    }
    const exact = this.progress * (this.options.frameCount - 1);
    if (Math.abs(exact - this.drawnAt) < 0.01 && this.drawnAt >= 0) {
      return;
    }

    const lower = Math.floor(exact);
    const upper = Math.min(lower + 1, this.options.frameCount - 1);
    const blend = exact - lower;

    // While scrolling, the crossfade below smooths the 10fps source into
    // continuous motion. Held at a fractional position it is instead a frozen
    // double exposure — two scooters, two number plates — worst at the frame
    // edges, where the forward camera move displaces pixels furthest. So once
    // the scroll settles, land on the single nearest whole frame.
    const primary = this.settled ? Math.round(exact) : lower;

    let painted = false;
    if (this.loaded[primary]) {
      this.drawSource(this.frames[primary]!, 1);
      painted = true;
      // Only ever blend between two sharp frames — cross-fading a sharp frame
      // over a soft atlas tile reads as a ghost, and a second drawImage is not
      // free.
      if (
        !this.settled &&
        this.loaded[upper] &&
        upper !== primary &&
        blend > 0.04
      ) {
        this.drawSource(this.frames[upper]!, blend);
      }
    } else if (this.atlas) {
      // The atlas tile is the *right* frame, only soft. A distant sharp frame
      // would be the wrong frame held still, which is what a fast scroll used
      // to look like.
      this.drawAtlasTile(Math.round(exact));
      painted = true;
    } else {
      const base = this.nearestLoaded(primary);
      if (base >= 0) {
        this.drawSource(this.frames[base]!, 1);
        painted = true;
      }
    }

    if (!painted) {
      return;
    }
    this.drawnAt = exact;

    if (this.loaded[primary]) {
      this.drawBackdrop(this.frames[primary]!);
    }

    if (!this.firstFrameShown) {
      this.firstFrameShown = true;
      this.options.onFirstFrame?.();
    }
  }

  private drawAtlasTile(index: number): void {
    const atlas = this.options.atlas;
    if (!this.atlas || !atlas) {
      return;
    }
    const clamped = Math.min(this.options.frameCount - 1, Math.max(0, index));
    const col = clamped % atlas.cols;
    const row = Math.floor(clamped / atlas.cols);
    this.drawSource(
      this.atlas,
      1,
      col * atlas.tileWidth,
      row * atlas.tileHeight,
      atlas.tileWidth,
      atlas.tileHeight,
    );
  }

  /**
   * Cover-fill by cropping the *source* rather than overflowing the
   * destination — an atlas tile drawn with destination overflow would bleed
   * its neighbours into frame.
   */
  private drawSource(
    image: FrameSource,
    alpha: number,
    sx = 0,
    sy = 0,
    sw = 0,
    sh = 0,
  ): void {
    const { canvas, ctx } = this;
    const naturalW = "naturalWidth" in image ? image.naturalWidth : image.width;
    const naturalH = "naturalHeight" in image ? image.naturalHeight : image.height;
    let srcW = sw || naturalW;
    let srcH = sh || naturalH;
    if (!srcW || !srcH) {
      return;
    }

    // The desktop set is 16:9 and the mobile set is 9:16, so each matches its
    // viewport orientation and only a small centred crop is discarded.
    const canvasAspect = canvas.width / canvas.height;
    const srcAspect = srcW / srcH;
    if (srcAspect > canvasAspect) {
      const next = srcH * canvasAspect;
      sx += (srcW - next) / 2;
      srcW = next;
    } else {
      const next = srcW / canvasAspect;
      sy += (srcH - next) / 2;
      srcH = next;
    }

    ctx.globalAlpha = alpha;
    ctx.drawImage(image, sx, sy, srcW, srcH, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  private drawBackdrop(image: FrameSource): void {
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
}
