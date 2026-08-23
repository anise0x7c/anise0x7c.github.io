// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import svelte from '@astrojs/svelte';

import swup from '@swup/astro';

import tailwindcss from '@tailwindcss/vite';

import pagefind from 'astro-pagefind';


// https://astro.build/config
export default defineConfig({
  integrations: [
    svelte(),
    // Client-side navigation (replaces Astro's ClientRouter). Swup swaps only
    // the containers listed below; the banner band, header and footer live
    // outside <main>, so they persist as live DOM across navigations — no
    // snapshot layering needed. theme:false = we own the animation CSS in
    // styles/animations.css via html.is-leaving / is-rendering state classes
    // (see .transition-swup-page). animationClass is namespaced so Tailwind's
    // `transition-*` utilities never match swup's animation anchor selector.
    swup({
      theme: false,
      animationClass: 'transition-swup-',
      containers: ['main'],
      smoothScrolling: true,
      cache: true,
      preload: true,
      accessibility: true,
      updateHead: true,
      // is-home is toggled in BaseLayout's visit:start hook for an immediate
      // banner height morph; a body-class sync here would lag one phase.
      updateBodyClass: false,
      // Astro component scripts are hoisted module scripts (deduped by the
      // browser); nothing needs re-execution per visit.
      reloadScripts: false,
      globalInstance: true,
    }),
    pagefind(),
  ],

  // Self-hosted web fonts: downloaded at build time from Google and bundled
  // into ./dist — visitors never connect to fonts.googleapis.com.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Nunito',
      cssVariable: '--font-nunito',
      weights: [400, 600, 700, 800],
      styles: ['normal'],
    },
    {
      provider: fontProviders.google(),
      name: 'Caveat',
      cssVariable: '--font-caveat',
      weights: [600, 700],
      styles: ['normal'],
      // Caveat has no CJK glyphs; a generic fallback here (e.g. sans-serif)
      // would swallow Chinese chars before they reach --font-mashanzheng.
      fallbacks: [],
    },
    {
      provider: fontProviders.google(),
      name: 'Ma Shan Zheng',
      cssVariable: '--font-mashanzheng',
      weights: [400],
      styles: ['normal'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: [400, 700],
      styles: ['normal'],
    },
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});