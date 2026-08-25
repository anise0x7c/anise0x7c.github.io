# Fuwari 式动态颜色系统(全站 hue 参数化,仅底层,默认 hue=10)

## 目标

把 `themes.css` 的中性色 + accent 家族从固定 hex 改为 `oklch(L C var(--hue))` 公式,配 localStorage 持久化 + 首屏内联注入。不做 UI(以后可加滑块弹窗)。

## 已确认决策

| 决策 | 选择 |
|---|---|
| 作用范围 | **全站 Fuwari 式**(中性色也带 hue 微调) |
| UI | 只做底层系统(DevTools 试玩) |
| 默认 hue | **10°**(accent 无损还原品牌粉) |

## 关键取舍(必读)

1. **默认观感变化**:中性色天然 hue≈264–284°(Catppuccin 蓝底调),统一到 `var(--hue)` 后默认=10° → 底调从冷蓝变为与品牌粉同源的暖色。accent 四 token 的 L/C 原样保留,观感不变。若想保留蓝底调,可后续一行改为 `calc(var(--hue) + 274deg)`(不推荐,破坏"一钮控全站"的整体感)。
2. **14 个 Catppuccin 彩色保留静态**:它们是多色相家族(stickerColor 的 tag 贴纸色),压成单一 hue 会让所有 tag 同色。
3. **L/C 逐一从现值换算**(精确到 3 位),彩度梯度原样保留——Catppuccin 的强度、Fuwari 的机制。

## 改动文件

### 1. `src/styles/themes.css` — 核心

`:root` 块顶部加 `--hue: 10;`(被 html 内联 style 覆盖)。

**`:root`(Light,Latte 换算值):**

```css
--hue: 10;
--text:           oklch(0.435 0.043 var(--hue));
--subtext1:       oklch(0.492 0.038 var(--hue));
--subtext0:       oklch(0.547 0.034 var(--hue));
--overlay2:       oklch(0.601 0.030 var(--hue));
--overlay1:       oklch(0.654 0.027 var(--hue));
--overlay0:       oklch(0.708 0.024 var(--hue));
--surface2:       oklch(0.758 0.020 var(--hue));
--surface1:       oklch(0.808 0.017 var(--hue));
--surface0:       oklch(0.857 0.014 var(--hue));
--base:           oklch(0.958 0.006 var(--hue));
--mantle:         oklch(0.933 0.009 var(--hue));
--crust:          oklch(0.906 0.012 var(--hue));
--accent:         oklch(0.719 0.182 var(--hue));   /* = #ff6b8d @10° */
--accent-strong:  oklch(0.750 0.158 var(--hue));   /* = #ff7f9d @10° */
--accent-contrast: oklch(0.982 0.010 var(--hue));  /* 近白,微染 hue */
--accent-soft:    color-mix(in srgb, var(--accent) 14%, transparent);
```

**`.dark`(Dark,Mocha 换算值):**

```css
--text:           oklch(0.879 0.043 var(--hue));
--subtext1:       oklch(0.817 0.040 var(--hue));
--subtext0:       oklch(0.751 0.040 var(--hue));
--overlay2:       oklch(0.687 0.037 var(--hue));
--overlay1:       oklch(0.618 0.037 var(--hue));
--overlay0:       oklch(0.550 0.034 var(--hue));
--surface2:       oklch(0.477 0.034 var(--hue));
--surface1:       oklch(0.404 0.032 var(--hue));
--surface0:       oklch(0.324 0.032 var(--hue));
--base:           oklch(0.243 0.030 var(--hue));
--mantle:         oklch(0.216 0.025 var(--hue));
--crust:          oklch(0.183 0.020 var(--hue));
--accent:         oklch(0.882 0.063 var(--hue));   /* = #fac8dd @351°→10° */
--accent-strong:  oklch(0.906 0.047 var(--hue));
--accent-contrast: oklch(0.262 0.064 var(--hue));  /* 深色也染 hue */
--accent-soft:    color-mix(in srgb, var(--accent) 16%, transparent);
```

**阴影去硬编码**(现在 rgba 的本色就是 text/crust,改成 color-mix 自动跟随):

```css
/* :root */
--sh-sticky: 0 2px 4px color-mix(in srgb, var(--text) 35%, transparent);
--sh-card:   0 12px 28px color-mix(in srgb, var(--text) 10%, transparent),
             0 4px 8px color-mix(in srgb, var(--text) 20%, transparent);
--sh-float:  0 20px 35px color-mix(in srgb, var(--text) 20%, transparent),
             0 8px 16px color-mix(in srgb, var(--text) 30%, transparent);
/* .dark 同构,源色改为 var(--crust),α 对应 80/90/70/90% */
```

(lqdglass 的白色 inset 保持静态。)

**14 个 Catppuccin 彩色 hex 原样保留**,注释说明豁免原因。

### 2. `src/consts.ts`

```ts
// 默认主题色相(度)。品牌粉 #ff6b8d ≈ oklch(0.72 0.18 10°)
export const DEFAULT_HUE = 195;
```

### 3. `src/layouts/BaseLayout.astro` — 扩展现有首屏脚本

在现有 theme IIFE 同一 `<script is:inline>`(或紧随其后)追加,保证首绘前生效:

```js
// define:vars={{ defaultHue: DEFAULT_HUE }} 注入
let hue = defaultHue;
try {
  const stored = Number(localStorage.getItem("hue"));
  if (Number.isFinite(stored) && stored >= 0 && stored < 360) hue = stored;
} catch {}
document.documentElement.style.setProperty("--hue", String(hue));
```

- swup 不换 `<html>` → 内联 style 跨导航存活(与 theme 同理)
- try/catch 防隐私模式;校验范围防脏数据

### 4. `src/utils/hue.ts`(新)

```ts
getHue(): number      // localStorage → DEFAULT_HUE
setHue(h: number)     // localStorage + documentElement.style.setProperty
resetHue()            // 移除存储 + 恢复默认
```

供未来 UI 岛与控制台试玩使用,带 JSDoc。

### 5. `docs/color-system.md`(新,简短)

记录:公式体系、如何调默认 hue(consts.ts)、DevTools 试玩
(`document.documentElement.style.setProperty('--hue', 250)`)、
滑块 UI 的未来接入点(调 hue.ts)、中性色调蓝的备选(274° 偏移方案)。

## 明确不做

- 无 UI(滑块/弹窗/图标按钮)
- `@theme inline` 映射层不动(本就引用运行时 var)
- 14 个 Catppuccin 彩色不动;chip 的 #fff/#000 对比字色不动
- global.css 的全局颜色过渡不动(已有的 `* { transition }` 让 hue 变化自动"流"过去)

## 验证清单

1. `astro check` 通过
2. dev server:默认 hue=10 → accent 与今日观感一致;中性色为暖色底调(预期内,已 flagged)
3. DevTools 执行 `setProperty('--hue', 250)` → 全站平滑流到紫色;`130`(绿,超 sRGB 色域)→ 浏览器 gamut-map,无异常
4. 明暗切换正常(两套块都验证)
5. `localStorage.hue=250` → 硬刷新无闪(首屏脚本顺序同 theme);swup 导航保持
6. tag 贴纸仍多彩(静态家族未动)
7. 对比 PostCard/文章页/搜索弹窗/TOC 的 accent 使用点
