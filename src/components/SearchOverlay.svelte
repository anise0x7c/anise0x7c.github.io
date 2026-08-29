<script lang="ts">
  import { tick } from "svelte";
  import { fade } from "svelte/transition";
  import searchIcon from "../assets/icons/search.svg?raw";

  // Minimal types for the runtime index astro-pagefind copies to /pagefind.
  // Declared locally — the specifier only exists at runtime (dynamic import
  // of a build artifact), so TS module resolution can never see it.
  interface PagefindSearchResult {
    url: string;
    excerpt: string;
    meta: { title?: string; image?: string };
  }

  interface Pagefind {
    search(
      query: string,
      options?: Record<string, unknown>,
    ): Promise<{
      results: Array<{ data: () => Promise<PagefindSearchResult> }>;
      unfilteredTotalCount: number;
    }>;
    options(options: Record<string, unknown>): void;
  }

  const MAX_RESULTS = 8;
  const DEBOUNCE_MS = 200;

  // Svelte transitions are JS-driven and ignore the CSS reduced-motion
  // override on .panel, so gate the duration here instead. Guarded for SSR
  // (the island is server-rendered first); hydration re-evaluates on client.
  const reducedMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  let open = $state(false);
  let query = $state("");
  let status = $state<"idle" | "loading" | "ready" | "no-index">("idle");
  let searching = $state(false);
  let results = $state<PagefindSearchResult[]>([]);
  let activeIndex = $state(-1);

  let inputEl: HTMLInputElement | undefined = $state();
  let lastTrigger: HTMLElement | null = null;
  let pagefind: Pagefind | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const setExpanded = (v: boolean) =>
    document
      .querySelector("[data-search-trigger]")
      ?.setAttribute("aria-expanded", String(v));

  const openOverlay = () => {
    lastTrigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    query = "";
    results = [];
    activeIndex = -1;
    open = true;
    setExpanded(true);
  };

  const closeOverlay = () => {
    open = false;
    setExpanded(false);
    lastTrigger?.focus();
  };

  // The index lives in ./dist/pagefind, copied by astro-pagefind after each
  // `astro build` (dev serves the last build's index). Load lazily on first
  // open; a failed import means no build has run yet. The specifier goes
  // through a variable so rolldown can't statically resolve it at build time.
  const PAGEFIND_SPECIFIER = "/pagefind/pagefind.js";

  const ensureIndex = async () => {
    if (pagefind || status === "loading" || status === "no-index") return;
    status = "loading";
    try {
      pagefind = (await import(
        /* @vite-ignore */ PAGEFIND_SPECIFIER
      )) as Pagefind;
      status = "ready";
    } catch {
      status = "no-index";
    }
  };

  const runSearch = async (q: string) => {
    await ensureIndex();
    if (!pagefind) return;
    try {
      const res = await pagefind.search(q);
      if (query.trim() !== q || !open) return;
      const top = await Promise.all(
        res.results.slice(0, MAX_RESULTS).map((r) => r.data()),
      );
      if (query.trim() !== q || !open) return;
      results = top;
      activeIndex = top.length > 0 ? 0 : -1;
    } finally {
      if (query.trim() === q) searching = false;
    }
  };

  const scrollActiveIntoView = () => {
    document
      .querySelector(`a[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  const activate = (i: number) => {
    activeIndex = i;
    scrollActiveIntoView();
  };

  const onInputKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeOverlay();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length) activate(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length) activate(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      const item = results[activeIndex];
      if (item) {
        e.preventDefault();
        // Click the rendered anchor so swup handles the navigation.
        document
          .querySelector<HTMLAnchorElement>(`a[data-idx="${activeIndex}"]`)
          ?.click();
      }
    }
  };

  // Focus the input once the overlay is in the DOM.
  $effect(() => {
    if (open) {
      ensureIndex();
      tick().then(() => inputEl?.focus());
    }
  });

  // Debounced search, re-run on every keystroke.
  $effect(() => {
    const q = query.trim();
    if (!open) return;
    clearTimeout(debounceTimer);
    if (!q) {
      results = [];
      activeIndex = -1;
      searching = false;
      return;
    }
    searching = true;
    debounceTimer = setTimeout(() => runSearch(q), DEBOUNCE_MS);
  });

  // Global triggers: ⌘K / Ctrl+K, Esc, and the header search button. Event
  // delegation keeps this working across view-transition DOM swaps even if
  // this island is remounted.
  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open ? closeOverlay() : openOverlay();
      } else if (e.key === "Escape" && open) {
        closeOverlay();
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-search-trigger]")) openOverlay();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  });

  // Lock background scroll while the dialog is open.
  $effect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  });

  // Clear any in-flight debounce on unmount.
  $effect(() => {
    return () => clearTimeout(debounceTimer);
  });

  const trimmed = $derived(query.trim());
</script>

{#if open}
  <div
    class="overlay"
    role="presentation"
    transition:fade={{ duration: reducedMotion ? 0 : 120 }}
    onmousedown={(e) => {
      if (e.target === e.currentTarget) closeOverlay();
    }}
  >
    <div class="panel" role="dialog" aria-modal="true" aria-label="站内搜索">
      <div class="box">
        {@html searchIcon}
        <input
          bind:this={inputEl}
          bind:value={query}
          type="search"
          placeholder="搜索文章…"
          aria-label="搜索文章"
          onkeydown={onInputKeydown}
        />
        <button class="esc" onclick={closeOverlay} aria-label="关闭搜索">
          Esc
        </button>
      </div>

      <div class="results" aria-label="搜索结果">
        {#if status === "no-index"}
          <p class="hint">搜索索引尚未生成，请先运行一次 <code>pnpm build</code>。</p>
        {:else if !trimmed}
          <p class="hint">输入关键词搜索文章 · ⌘K / Ctrl+K 随时唤起</p>
        {:else if results.length === 0 && (searching || status === "loading")}
          <p class="hint">搜索中…</p>
        {:else if results.length === 0}
          <p class="hint">没有找到与「{trimmed}」相关的文章</p>
        {:else}
          {#each results as r, i (r.url)}
            <a
              class="result"
              class:active={i === activeIndex}
              data-idx={i}
              href={r.url}
              onclick={closeOverlay}
              onmousemove={() => activate(i)}
            >
              <span class="title">{r.meta.title ?? r.url}</span>
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              <span class="excerpt">{@html r.excerpt}</span>
            </a>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 10vh 1.25rem 1.25rem;
    background: color-mix(in srgb, #000000 20%, transparent);
    backdrop-filter: blur(7px);
    -webkit-backdrop-filter: blur(7px);
  }

  @media (max-width: 40rem) {
    .overlay {
      /* Tighter side gutters on phones; dvh so the panel top stays put as
         the mobile URL bar collapses. */
      padding: 8dvh 0.75rem 0.75rem;
    }
  }

  .panel {
    display: flex;
    flex-direction: column;
    width: min(40rem, 100%);
    max-height: 70vh;
    background: var(--color-surface0);
    border: 1px solid var(--color-overlay0);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-float);
    overflow: hidden;
    animation: overlay-in 0.4s var(--ease-spring) both;
  }

  @media (max-width: 40rem) {
    .panel {
      /* dvh + slightly taller allowance: the small screen is the case
         where the URL bar appearing/disappearing actually moves things. */
      max-height: 70dvh;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel {
      animation: none;
    }
  }

  .box {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--color-overlay0);
    color: var(--color-subtext1);
  }

  .box input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: 1.05rem;
    outline: none;
  }

  .box input::placeholder {
    color: var(--color-subtext0);
  }

  .esc {
    flex-shrink: 0;
    padding: 0.15rem 0.5rem;
    border: 1px solid var(--color-overlay0);
    border-radius: var(--radius-sm);
    background: var(--color-mantle);
    color: var(--color-subtext0);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1.4;
    cursor: pointer;
  }

  @media (hover: hover) {
    .esc:hover {
      color: var(--color-text);
      border-color: var(--color-overlay2);
    }
  }

  .results {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.5rem;
  }

  .hint {
    padding: 1.25rem 0.75rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-subtext0);
  }

  .hint code {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: var(--color-mantle);
    padding: 0.1em 0.35em;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-overlay0);
  }

  .result {
    display: grid;
    gap: 0.25rem;
    padding: 0.65rem 0.75rem;
    border-radius: var(--radius-md);
    text-decoration: none;
  }

  .result.active {
    background: var(--color-surface1);
  }

  @media (hover: hover) {
    .result:hover {
      background: var(--color-surface1);
    }
  }

  .result .title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.35;
  }

  .result .excerpt {
    font-size: 0.85rem;
    line-height: 1.55;
    color: var(--color-subtext1);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .result .excerpt :global(mark) {
    background: var(--color-accent-soft);
    color: var(--color-accent-strong);
    border-radius: 0.2rem;
    padding: 0 0.1em;
  }
</style>
