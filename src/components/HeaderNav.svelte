<script lang="ts">
  import { tick } from "svelte";

  interface NavLink {
    readonly href: string;
    readonly label: string;
  }

  interface Props {
    links: readonly NavLink[];
    /** Path at SSR time — seeds the active highlight before any swup
        navigation happens. */
    initialPath: string;
  }

  let { links, initialPath }: Props = $props();

  // Open state of the mobile dropdown panel (≤40rem). Drives the panel CSS
  // via .open and is mirrored onto the toggle button's aria-expanded. The
  // button itself stays Astro-rendered (ThemedButton, like the search
  // trigger for SearchOverlay) — bound here by event delegation, not by
  // element reference.
  let open = $state(false);

  // Mirrors location.pathname; re-synced after every swup navigation so the
  // active highlight keeps tracking (this island persists across swaps —
  // the header lives outside swup's <main> container).
  let activePath = $state(initialPath);

  let navEl: HTMLElement | undefined = $state();

  const isActive = (href: string): boolean =>
    href === "/"
      ? activePath === "/"
      : activePath === href || activePath.startsWith(href + "/");

  // Single source of truth for open/close, preserving the focus contract of
  // the previous vanilla implementation:
  //  - opening (user-initiated) hands focus to the first link so Tab flows
  //    through the panel in DOM order (the panel sits before .header-tools);
  //  - closing returns focus to the toggle, but only when focus was parked
  //    inside the panel (Escape / link click) — programmatic dismissals
  //    (outside click, breakpoint growth, swup swap, header hide-on-scroll)
  //    pass moveFocus=false and never steal focus.
  const setNav = (next: boolean, moveFocus = true) => {
    const wasOpen = open;
    open = next;
    if (!moveFocus) return;
    if (open && !wasOpen) {
      tick().then(
        () => navEl?.querySelector<HTMLAnchorElement>("a")?.focus(),
      );
    } else if (!open && wasOpen) {
      if (navEl?.contains(document.activeElement)) {
        document
          .querySelector<HTMLButtonElement>("[data-nav-toggle]")
          ?.focus();
      }
    }
  };

  // Global triggers, bound once per island mount. The header is not re-added
  // by swup (it sits outside the swap container), so these listeners live as
  // long as the page.
  $effect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("[data-nav-toggle]")) {
        setNav(!open);
        return;
      }
      // Taps outside the pill dismiss the panel; clicks on the header
      // itself (logo / search / theme buttons) leave it alone — same
      // header-anchored outside-click boundary as before.
      if (open && !target?.closest(".site-header")) {
        setNav(false, false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNav(false);
    };

    // Dispatched by Header.astro when hide-on-scroll swallows the header:
    // the panel is anchored to it and must not float ownerless over the
    // page. Not a user-initiated close, so no focus moves.
    const onHeaderHidden = () => setNav(false, false);

    // Reset when the viewport grows past the mobile breakpoint (matches the
    // max-width: 40rem media queries).
    const media = window.matchMedia("(min-width: 40rem)");
    const onMedia = (e: MediaQueryListEvent) => {
      if (e.matches) setNav(false, false);
    };

    // Every swup navigation closes the panel (the header persists, so it
    // would otherwise stay open on the next page) and re-syncs the active
    // highlight from the new location.
    const onAfterSwap = () => {
      setNav(false, false);
      activePath = location.pathname;
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mobile-nav:close", onHeaderHidden);
    media.addEventListener("change", onMedia);
    document.addEventListener("astro:after-swap", onAfterSwap);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mobile-nav:close", onHeaderHidden);
      media.removeEventListener("change", onMedia);
      document.removeEventListener("astro:after-swap", onAfterSwap);
    };
  });

  // Mirror open state onto the Astro-rendered toggle's aria-expanded; the
  // header's menu/close icon-swap CSS keys off this attribute.
  $effect(() => {
    document
      .querySelector("[data-nav-toggle]")
      ?.setAttribute("aria-expanded", String(open));
  });
</script>

<nav class="header-nav" id="header-nav" class:open bind:this={navEl}>
  {#each links as link (link.href)}
    <a
      href={link.href}
      class="nav-link"
      class:active={isActive(link.href)}
      onclick={() => setNav(false)}
    >
      {link.label}
    </a>
  {/each}
</nav>

<style>
  /* Desktop: the nav is the middle flex child of .header-inner (logo |
     nav | tools). The <astro-island> wrapper resolves to display:contents,
     so the nav itself remains the flex item. */
  .header-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .nav-link {
    padding: 0.4rem 0.8rem;
    border-radius: var(--radius-pill);
    font-size: 0.92rem;
    color: var(--color-text);
  }

  @media (hover: hover) {
    .nav-link:hover {
      background-color: color-mix(in srgb, var(--color-overlay2) 70%, transparent);
    }
  }

  .nav-link.active {
    text-decoration: underline;
  }

  /* --- 移动端 (≤40rem):导航复用为下拉面板,右对齐锚定在药丸下方,
         宽度随内容收缩。可见性用 visibility 而非 display:none —— 面板
         始终渲染,进出动画不依赖 transition-behavior: allow-discrete
         (display 过渡在部分浏览器/Safari 实现有缺陷:退出时 display:none
         立即生效,会掐断 opacity/translate 的过渡,菜单瞬间消失)。
         visibility 是离散可过渡属性,任何浏览器都能配合 opacity/translate
         做完整的进出动画。translate 基态 -1rem = 进入起点 / 退出终点
         (弹出距离,进出对称)。 */
  @media (max-width: 40rem) {
    .header-nav {
      /* Containing block is .header-inner (position: relative), reached
         through the display:contents island wrapper. */
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      min-width: 8rem;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.25rem;
      padding: 0.375rem;
      background-color: color-mix(in srgb, var(--color-base) 70%, transparent);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      /* Cap the panel to the viewport (future-proof for more links); the
         header itself is max 3.25rem + margins, hence the 6rem budget. */
      max-height: calc(100dvh - 6rem);
      overflow-y: auto;
      visibility: hidden;
      pointer-events: none;
      opacity: 0;
      translate: 0 -1rem;
      /* 退出:opacity/translate 立即过渡,visibility 延迟 0.4s 到动画
         结束后才隐藏 —— 退出因此有完整的淡出+上滑 */
      transition:
        opacity 0.4s var(--ease-spring),
        translate 0.4s var(--ease-spring),
        visibility 0s linear 0.4s;
    }

    .header-nav.open {
      visibility: visible;
      pointer-events: auto;
      opacity: 1;
      translate: 0 0;
      /* 进入:visibility 零延迟立即可见(opacity 才有起点可过渡),
         opacity/translate 走同一个 0.4s ease-spring */
      transition:
        opacity 0.4s var(--ease-spring),
        translate 0.4s var(--ease-spring),
        visibility 0s;
    }

    .nav-link {
      padding: 0.6rem 1rem;
      text-align: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .header-nav {
      transition: none;
    }
  }
</style>
