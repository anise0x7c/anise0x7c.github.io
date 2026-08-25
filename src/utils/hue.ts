// Runtime helpers for the site-wide hue knob (Fuwari-style dynamic colours).
//
// The knob itself is the --hue CSS custom property: every neutral token in
// themes.css is an oklch(L C var(--hue)) formula and the two accent families
// sit at ±60° of it (--accent-pls-* / --accent-mns-*), so writing the
// property re-derives the whole palette live (the global colour transition
// in global.css makes the change flow instead of snap).
//
// No UI consumes these yet — they exist for console experiments
// (try: `await import("/src/utils/hue.ts").then(m => m.setHue(250))`) and
// for a future settings-panel island. The first-paint restore lives
// separately as an inline script in BaseLayout.astro (must be inline and
// dependency-free to run before the first paint).

import { DEFAULT_HUE } from "../consts";

const KEY = "hue";

/** Stored hue if valid, else DEFAULT_HUE. Never throws. */
export function getHue(): number {
  try {
    // Null-check before Number(): Number(null) === 0 (not NaN), so without
    // this a missing key would validate as a legit hue 0.
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const stored = Number(raw);
      if (Number.isFinite(stored) && stored >= 0 && stored < 360) {
        return stored;
      }
    }
  } catch {
    /* storage may be unavailable */
  }
  return DEFAULT_HUE;
}

/**
 * Persist and apply a hue (degrees, clamped to [0, 360)). Takes effect
 * immediately — no reload needed.
 */
export function setHue(hue: number): void {
  const clamped = Math.min(359.99, Math.max(0, hue));
  try {
    localStorage.setItem(KEY, String(clamped));
  } catch {
    /* storage may be unavailable */
  }
  document.documentElement.style.setProperty("--hue", String(clamped));
}

/** Forget the stored choice and return to DEFAULT_HUE. */
export function resetHue(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage may be unavailable */
  }
  document.documentElement.style.setProperty("--hue", String(DEFAULT_HUE));
}
