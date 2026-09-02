import { Archivo_Narrow, Fraunces, Noto_Serif_Kannada } from "next/font/google";

/**
 * Two voices, plus the Kannada companion the temple's own name needs.
 *
 * Fraunces carries the display line — a warm high-contrast serif whose optical
 * axis lets the 88px hero and the 24px caption title come from one family
 * without the big sizes going spindly. Archivo Narrow is the label voice:
 * every eyebrow, index and unit. Noto Serif Kannada is not a third voice but
 * the same serif idea in Kannada, so `ಶ್ರೀ ಲಕ್ಷ್ಮೀ ವೆಂಕಟರಮಣ ದೇವಮಂದಿರ` sits on the
 * page as a headline rather than as a fallback.
 */
export const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["SOFT", "WONK"],
});

export const label = Archivo_Narrow({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-label",
});

export const kannada = Noto_Serif_Kannada({
  subsets: ["kannada"],
  display: "swap",
  variable: "--font-kannada",
});

export const fontClassName = [display.variable, label.variable, kannada.variable].join(" ");
