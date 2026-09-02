"use client";

/**
 * The motion vocabulary.
 *
 * Every animation on the public site composes these primitives. That is the
 * point: a site reads as designed when the *same* easing and the *same*
 * stagger recur across independent sections, and reads as assembled when each
 * section invents its own. Before this file the page carried five easings
 * (`power2.out`, `power3.out`, `back.out(2)`, two CSS beziers) across three
 * components — every one of them is now EASE.
 *
 * Each primitive returns a cleanup function so React can dispose on unmount.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Shared with the CSS custom properties of the same names in globals.css. */
export const EASE = "expo.out";
// Deliberately not `as const`: these are defaults for numeric options, and
// literal types here would make every caller that passes a different step a
// type error.
export const DUR: { fast: number; base: number; slow: number } = {
  fast: 0.35,
  base: 0.7,
  slow: 1.2,
};
export const STAGGER = 0.06;

export type Cleanup = () => void;

const noop: Cleanup = () => {};

export function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Masked lines rising into place — the signature "expensive" text entrance.
 *
 * SplitText 3.13+ does the overflow masking itself (`mask: "lines"`) and sets
 * `aria-label` on the original element, so the headline still reads as one
 * string to a screen reader rather than as a pile of divs.
 */
export function revealLines(
  el: Element | null,
  {
    start = "top 88%",
    y = "104%",
    stagger = 0.08,
    duration = DUR.slow,
    delay = 0,
    once = true,
    /** Play on mount instead of on scroll — for above-the-fold copy that is
        already in view, where a scroll trigger would either fire instantly
        (pointless) or never (if the section is pinned). */
    immediate = false,
  } = {},
): Cleanup {
  if (!el || reducedMotion()) return noop;

  const split = new SplitText(el, { type: "lines", mask: "lines" });
  const tween = gsap.from(split.lines, {
    yPercent: 100,
    y,
    duration,
    delay,
    ease: EASE,
    stagger,
    ...(immediate ? {} : { scrollTrigger: { trigger: el, start, once } }),
  });

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    split.revert();
  };
}

/**
 * The workhorse: fade and rise, optionally staggered over children.
 *
 * One trigger on the container with a stagger — never a trigger per child.
 * It is smoother, cheaper, and it keeps the sibling rhythm intact when the
 * user scrolls fast enough to cross the whole group in one frame.
 */
export function reveal(
  el: Element | null,
  {
    y = 32,
    children = null as string | null,
    start = "top 88%",
    stagger = STAGGER,
    duration = DUR.base,
    scale = 1,
    once = true,
  } = {},
): Cleanup {
  if (!el || reducedMotion()) return noop;

  const targets = children ? el.querySelectorAll(children) : el;
  if (children && (targets as NodeListOf<Element>).length === 0) return noop;

  const tween = gsap.from(targets, {
    autoAlpha: 0,
    y,
    scale,
    duration,
    ease: EASE,
    stagger,
    scrollTrigger: { trigger: el, start, once },
  });

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}

/**
 * A scrubbed gradient wipe through a paragraph — the copy "activating" as it
 * is read. This is the one place scrubbed text belongs, because the reader's
 * scroll speed *is* their reading speed. Never put it on a headline: there it
 * just looks like the text failed to load.
 *
 * Pairs with `.text-fill` in globals.css.
 */
export function textFill(
  el: Element | null,
  { start = "top 82%", end = "bottom 62%" } = {},
): Cleanup {
  if (!el || reducedMotion()) return noop;

  el.classList.add("text-fill");
  const tween = gsap.fromTo(
    el,
    { backgroundPositionX: "100%" },
    {
      backgroundPositionX: "0%",
      ease: "none",
      scrollTrigger: { trigger: el, start, end, scrub: 0.6 },
    },
  );

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    el.classList.remove("text-fill");
  };
}

/** Continuous, scrubbed drift. Keep subtle — 8–15% of element height. */
export function parallax(
  el: Element | null,
  { amount = 12, scrub = 0.8 } = {},
): Cleanup {
  if (!el || reducedMotion()) return noop;

  const tween = gsap.fromTo(
    el,
    { yPercent: -amount / 2 },
    {
      yPercent: amount / 2,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub },
    },
  );

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}

/**
 * A 1px accent line bound to page progress. A decoration, not a HUD — there
 * is deliberately no percentage readout.
 */
export function scrollProgress(el: Element | null): Cleanup {
  if (!el) return noop;

  const tween = gsap.fromTo(
    el,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: "none",
      transformOrigin: "left center",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    },
  );

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}

/** Compose several primitives into one cleanup. */
export function all(...cleanups: Cleanup[]): Cleanup {
  return () => cleanups.forEach((fn) => fn());
}
