<script lang="ts">
  import { tick } from "svelte";
  import { slide } from "svelte/transition";
  import { getHue, resetHue, setHue } from "../utils/hue";

  interface Token {
    name: string;
    cssVar: string;
  }

  const GROUPS = [
    {
      id: "text",
      label: "Text",
      tokens: [
        { name: "text", cssVar: "--color-text" },
        { name: "subtext1", cssVar: "--color-subtext1" },
        { name: "subtext0", cssVar: "--color-subtext0" },
      ],
    },
    {
      id: "overlay",
      label: "Overlay",
      tokens: [
        { name: "overlay2", cssVar: "--color-overlay2" },
        { name: "overlay1", cssVar: "--color-overlay1" },
        { name: "overlay0", cssVar: "--color-overlay0" },
      ],
    },
    {
      id: "surface",
      label: "Surface",
      tokens: [
        { name: "surface2", cssVar: "--color-surface2" },
        { name: "surface1", cssVar: "--color-surface1" },
        { name: "surface0", cssVar: "--color-surface0" },
      ],
    },
    {
      id: "canvas",
      label: "Canvas",
      tokens: [
        { name: "base", cssVar: "--color-base" },
        { name: "mantle", cssVar: "--color-mantle" },
        { name: "crust", cssVar: "--color-crust" },
        { name: "code", cssVar: "--color-code" },
      ],
    },
    {
      id: "accent",
      label: "Accent",
      tokens: [
        { name: "accent", cssVar: "--color-accent" },
        { name: "accent-strong", cssVar: "--color-accent-strong" },
        { name: "accent-contrast", cssVar: "--color-accent-contrast" },
        { name: "accent-soft", cssVar: "--color-accent-soft" },
      ],
    },
  ];

  let hue = $state(getHue());
  let values = $state<Record<string, string>>({});
  let copiedKey = $state<string | null>(null);
  let collapsed = $state(true);
  let rootEl: HTMLElement | undefined = $state();
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  // slide is JS-driven and ignores the CSS reduced-motion override, so gate
  // the duration here instead (same pattern as SearchOverlay).
  const reducedMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  let canvas: HTMLCanvasElement | undefined;

  const canvas2d = (): CanvasRenderingContext2D | null => {
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
    }
    return canvas.getContext("2d", { willReadFrequently: true });
  };

  // Resolve any computed colour string (oklch / rgb / color() / …) to a
  // copy-friendly hex: 6-digit for opaque, 8-digit #RRGGBBAA for translucent
  // (accent-soft) so short values don't wrap in the swatch card.
  const formatColor = (bg: string): string => {
    const ctx = canvas2d();
    if (!ctx) return bg;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1, 1);
    const { data } = ctx.getImageData(0, 0, 1, 1);
    const hex = (v: number) => v.toString(16).padStart(2, "0");
    const [r, g, b, a] = data;
    return a === 255 ? `#${hex(r)}${hex(g)}${hex(b)}` : `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`;
  };

  const collectValues = () => {
    if (!rootEl) return;
    const out: Record<string, string> = {};
    rootEl.querySelectorAll<HTMLElement>("[data-token]").forEach((el) => {
      out[el.dataset.token!] = formatColor(
        getComputedStyle(el).backgroundColor,
      );
    });
    values = out;
  };

  // Re-read resolved values on mount and whenever the live theme/hue change:
  // the hue knob lives inline on <html> (set via setHue) and the theme flips
  // the `.dark` class, so observing both attributes covers every path.
  $effect(() => {
    if (!rootEl) return;
    let raf = 0;
    const collect = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(collectValues);
    };
    collect();
    const observer = new MutationObserver(collect);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  });

  // When collapsed, the body (with the [data-token] chips) isn't in the DOM,
  // so the mount-time collect finds nothing. Re-read resolved values after
  // expanding so the hex labels populate immediately.
  $effect(() => {
    if (!collapsed && rootEl) {
      tick().then(collectValues);
    }
  });

  const onHueInput = (e: Event) => {
    const v = Number((e.target as HTMLInputElement).value);
    hue = v;
    setHue(v);
  };

  const onReset = () => {
    resetHue();
    hue = getHue();
  };

  const onCopy = (token: string) => {
    const val = values[token];
    if (!val) return;
    navigator.clipboard?.writeText(val).catch(() => {});
    copiedKey = token;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copiedKey = null), 1200);
  };
</script>

<section class="palette-tool" bind:this={rootEl}>
  <header class="tool-head">
    <h2>站点调色盘</h2>
    <button
      class="tool-toggle"
      type="button"
      onclick={() => (collapsed = !collapsed)}
      aria-expanded={!collapsed}
      aria-controls="palette-body"
      aria-label={collapsed ? "展开调色盘" : "收起调色盘"}
      title={collapsed ? "展开" : "收起"}
    >
      <svg
        class="chevron"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  </header>

  {#if !collapsed}
    <div id="palette-body" class="palette-body" transition:slide={{ duration: reducedMotion ? 0 : 250 }}>
      <p class="tool-desc">
        全部颜色由 <code>--hue</code> 旋钮驱动（中性色 + accent 均为
        oklch 公式），并跟随当前主题（浅/深）实时变化。唯一例外：
        <code>code</code> 面板色明暗固定。拖动滑块即时重染全站，点击色块复制颜色值。
      </p>

      <div class="toolbar">
        <label class="hue-control">
          <span class="hue-label">Hue <code>{Math.round(hue)}°</code></span>
          <input
            type="range"
            min="0"
            max="359"
            step="1"
            value={hue}
            oninput={onHueInput}
            aria-label="Hue 选择条"
          />
        </label>
        <button class="reset" type="button" onclick={onReset}>重置</button>
      </div>

      <div class="groups">
        {#each GROUPS as group (group.id)}
          <div class="group">
            <h3 class="group-title">{group.label}</h3>
            <ul class="swatches">
              {#each group.tokens as token (token.name)}
                <li>
                  <button
                    class="swatch-row"
                    class:copied={copiedKey === token.name}
                    type="button"
                    onclick={() => onCopy(token.name)}
                    title="点击复制"
                  >
                    <span
                      class="chip"
                      style={`background: var(${token.cssVar})`}
                      data-token={token.name}
                      aria-hidden="true"
                    ></span>
                  <span class="swatch-info">
                    <span class="swatch-name">{token.name}</span>
                    <code class="swatch-value">
                      {#if copiedKey === token.name}
                        已复制
                      {:else}
                        {values[token.name] ?? ""}
                      {/if}
                    </code>
                  </span>
                  <svg
                    class="copy-icon"
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="9" y="9" width="12" height="12" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .palette-tool {
    background-color: var(--color-base);
    border-radius: var(--radius-3xl);
    box-shadow: var(--shadow-card);
    padding: 2.5rem;
  }

  .tool-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.7rem 0.7rem;
  }

  .tool-head h2 {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: 0;
  }

  .tool-toggle {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border-radius: var(--radius-pill);
    background: var(--color-surface0);
    color: var(--color-text);
    cursor: pointer;
    transition: background-color 0.4s var(--ease-spring);
  }

  @media (hover: hover) {
    .tool-toggle:hover {
      background: var(--color-surface1);
    }
  }

  .chevron {
    color: var(--color-subtext0);
    transition: transform 0.4s var(--ease-spring);
  }

  .tool-toggle[aria-expanded="true"] .chevron {
    transform: rotate(180deg);
  }

  .tool-desc {
    margin: 0 0 1.5rem;
    padding: 0 0.7rem;
    color: var(--color-subtext1);
    font-size: 0.95rem;
    line-height: 1.6;
    max-width: 60ch;
  }

  .tool-desc code {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background: var(--color-mantle);
    padding: 0.1em 0.35em;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-overlay0);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin: 0 0 1.5rem;
    background-color: var(--color-mantle);
    padding: 1.25rem 1.5rem 1.25rem 2.3rem;
    border-radius: var(--radius-2xl);
  }

  .hue-control {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    flex: 1;
    /* min(Xrem, 100%) so the row can shrink below 16rem on very narrow
       screens instead of forcing horizontal overflow. */
    min-width: min(16rem, 100%);
  }

  .hue-label {
    flex-shrink: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .hue-label code {
    font-family: var(--font-mono);
    color: var(--color-accent);
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 0.5rem;
    border-radius: var(--radius-pill);
    background: linear-gradient(
      90deg,
      hsl(0 90% 55%),
      hsl(60 90% 55%),
      hsl(120 90% 45%),
      hsl(180 90% 45%),
      hsl(240 90% 55%),
      hsl(300 90% 55%),
      hsl(360 90% 55%)
    );
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: #fff;
    border: none;
    box-shadow: 0 1px 4px rgb(0 0 0 / 40%);
    cursor: grab;
  }

  input[type="range"]::-moz-range-thumb {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: #fff;
    border: none;
    box-shadow: 0 1px 4px rgb(0 0 0 / 40%);
    cursor: grab;
  }

  input[type="range"]:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
  }

  .reset {
    flex-shrink: 0;
    padding: 0.4rem 1rem;
    border-radius: var(--radius-pill);
    background: var(--color-surface0);
    color: var(--color-text);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  @media (hover: hover) {
    .reset:hover {
      background: var(--color-surface1);
    }
  }

  .groups {
    background-color: var(--color-mantle);
    border-radius: var(--radius-2xl);
    overflow: hidden;
  }

  .group + .group {
    margin-top: 0;
    border-top: 2px dashed var(--color-surface0);
  }

  .group {
    padding: 1.5rem 1.75rem;
  }

  .group-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    margin: 0 0.5rem 0.5rem;
    color: var(--color-subtext0);
  }

  .swatches {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 0.5rem;
  }

  .swatch-row {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: 100%;
    padding: 0.45rem;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    text-align: left;
  }

  @media (hover: hover) {
    .swatch-row:hover {
      background: var(--color-surface0);
    }
  }

  .swatch-row.copied {
    background: var(--color-accent-soft);
    border-color: var(--color-accent);
  }

  .chip {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-overlay2);
  }

  .swatch-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .swatch-name {
    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .swatch-value {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-subtext1);
    line-height: 1.4;
    word-break: break-all;
    min-width: 7ch;
  }

  .copy-icon {
    flex-shrink: 0;
    margin-left: auto;
    color: var(--color-subtext0);
    opacity: 0;
    transition: opacity 0.4s var(--ease-spring);
  }

  @media (hover: hover) {
    .swatch-row:hover .copy-icon {
      opacity: 1;
    }
  }

  .swatch-row.copied .copy-icon {
    opacity: 0;
  }

  .swatch-row.copied .swatch-value {
    color: var(--color-accent-strong);
  }

  @media (max-width: 40rem) {
    .palette-tool {
      padding: 1.5rem;
    }

    .toolbar {
      padding: 1rem 1.25rem;
    }

    .group {
      padding: 1.25rem 1.25rem;
    }

    .swatches {
      grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    }
  }
</style>
