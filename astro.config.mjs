// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import svelte from '@astrojs/svelte';

import swup from '@swup/astro';

import tailwindcss from '@tailwindcss/vite';

import pagefind from 'astro-pagefind';

import { satteri } from '@astrojs/markdown-satteri';

import { sectionize } from './src/plugins/sectionize';
import { alerts } from './src/plugins/alerts';


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

  site: 'https://anise0x7c.github.io',

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
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: [400, 700],
      styles: ['normal'],
    },
  ],

  // Sectionize posts: every heading and its following content become a
  // <section> (deeper headings nested inside shallower ones). The TOC
  // scroll-spy observes these sections as "current paragraph" containers.
  // Alerts first: GitHub-style [!NOTE] blockquotes become styled divs before
  // the content is regrouped into sections.
  // Sätteri is Astro 7's default Markdown pipeline; mdastPlugins is its
  // equivalent of the old remarkPlugins hook.
  markdown: {
    processor: satteri({ mdastPlugins: [alerts, sectionize] }),
  },

  vite: {
    plugins: [tailwindcss()],
    //default Lightning CSS may put wrong backdrop filter in build production
    build: { cssMinify: 'esbuild' }, 
  }
});