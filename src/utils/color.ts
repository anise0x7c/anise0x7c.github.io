// Deterministically map an arbitrary string (e.g. a tag) to one of the sticker
// palette colours. Returns a CSS var() string suitable for use as
// `--tag-color`. Same input always yields the same colour, so a given tag is
// colour-stable across the site.

const STICKER_VARS = [
  "var(--color-red)",
  "var(--color-green)",
  "var(--color-sky)",
  "var(--color-mauve)",
  "var(--color-peach)",
  "var(--color-yellow)",
] as const;

// FNV-1a + murmur-style final avalanche: plain multiplicative hashes (h*31+c,
// djb2) cluster short tags onto the same palette slot — "CSS", "Astro", "Dev"
// all landed on lemon. The per-char xor and the final avalanche steps spread
// short-string bits evenly. `(h >>> 0)` before % is required: the final xor
// yields a signed int32 and a negative modulo would index out of bounds.
export function stickerColor(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return STICKER_VARS[(h >>> 0) % STICKER_VARS.length]!;
}
