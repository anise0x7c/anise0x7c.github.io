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
