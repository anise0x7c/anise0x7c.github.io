// Central place for site-wide, editor-editable constants.

export const SITE = {
  title: "80mlSpiceJar",
  description:
    "Personal Site/Blog",
  author: "80CentsAnise",
} as const;

export const NAV_LINKS = [
  { href: "/blogs", label: "Blog" },
  { href: "/docs", label: "Docs"}
] as const;

export const SOCIAL_LINKS = [
  { href: "https://github.com", label: "GitHub" },
  { href: "https://x.com", label: "Twitter" },
] as const;

// Sort posts by this frontmatter field, descending.
export const POSTS_PER_PAGE = 10;

// Default site-wide colour hue in degrees (0–360). The palette (neutral
// ramp + accent, both at the knob hue) is derived from this — see
// src/styles/themes.css and docs/color-system.md. Changing it re-tints the
// entire site (both modes).
export const DEFAULT_HUE = 215;
