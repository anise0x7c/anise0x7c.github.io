# 动态颜色系统(Fuwari 式 hue 旋钮)

> 参考实现:Fuwari(见 [Fuwari](https://github.com/saicaca/fuwari) 的 `variables.styl` + `setting-utils.ts`)。
> 本仓库落地:`src/styles/themes.css` + `src/layouts/BaseLayout.astro` + `src/utils/hue.ts` + `src/consts.ts`。

## 一、心智模型

全站颜色 = **公式**,不是值:

```css
--text:    oklch(0.44 0.04 var(--hue));   /* 中性色:hue = 旋钮 */
--accent:  oklch(0.72 0.18 var(--hue));   /* accent:直接取旋钮 hue,无偏移 */
```

- **一个旋钮**(`--hue`,0–360 无单位数字)驱动全部颜色(中性色 + accent),明暗两套共享
- 中性色(text→crust 梯度)直接取旋钮 hue;L/C 为原 Catppuccin hex 的 OKLCH 分解(四舍五入 2 位)→ 色阶/彩度梯度保留
- accent 家族含 4 个 token:`--accent 主色 / -strong(hover 强化) / -contrast(反白文字) / -soft(低透明度底)`
- 浏览器在渲染时对公式求值 → 改一个变量,全站重算;`global.css` 的全局 `transition` 让变化"流"过去

## 二、数据流

```
consts.ts DEFAULT_HUE ──SSR──▶ <script is:inline define:vars>   (BaseLayout <head>)
                                        │ localStorage.hue(若合法)覆盖默认
                                        ▼
                          <html style="--hue: N">     ← 唯一真源,内联样式最高优先级
                                        │ 级联
                                        ▼
                          中性色 / accent = oklch(L C var(--hue))
```

- **无闪屏**:内联脚本在首绘前同步执行(与 dark/light 主题脚本同一块)
- **跨页保持**:swup 只换 `<main>`,`<html>` 上的内联 `--hue` 存活;硬刷新由 localStorage 恢复

## 三、运行时 API(`src/utils/hue.ts`)

```ts
getHue(): number        // localStorage → DEFAULT_HUE,永不抛
setHue(250)             // 持久化 + 立即生效(无需刷新)
resetHue()              // 忘记选择,回到默认
```

目前无 UI 消费。控制台试玩:

```js
document.documentElement.style.setProperty("--hue", 250);  // 只看不存
// 或(持久化):
(await import("/src/utils/hue.ts")).setHue(250);
```

## 四、改默认 hue

`src/consts.ts` 的 `DEFAULT_HUE`(度数),并与 `themes.css` 里 `:root { --hue: … }` 的样式表回退保持同步。改完全站(明暗两套)重新着色。

## 五、边界与豁免

| 项 | 处理 | 原因 |
| --- | --- | --- |
| 14 个 Catppuccin 彩色(red/green/sky/mauve…) | 保留静态 hex(**已无消费点**) | 早期 `stickerColor()` 的 tag 贴纸色;贴纸体系已移除,此族暂留备用 |
| tag chip | 统一 `accent` 背景 + `accent-contrast` 文字 | 所有 tag 同色,随旋钮走;-contrast token 自动翻转明暗,无需 `.dark` 覆盖 |
| lqdglass 阴影的白色 inset | 静态 | 设计上就是白高光 |
| `--sh-sticky/card/float` | `color-mix(var(--text)/var(--crust) …%)` | 阴影本色=最深中性色,自动跟随 |
| accent `-soft` | `color-mix(var(--accent) N%, transparent)` | 由主色派生(亮 14% / 暗 16%) |
| 超出 sRGB 色域的组合(高 C + 特定 hue) | 浏览器自动 gamut map(降彩度) | OKLCH 表达范围 > sRGB,属预期行为 |

## 六、历史取舍记录

- **accent 体系演进**:初版独立品牌粉(`#ff6b8d` 家族,单 hue=旋钮)→ MD3 tertiary 思路重构为 `accent-pls`(+60)/ `accent-mns`(−60)双家族 → 因相同 C 在不同色相下"扎眼程度"差异显著(蓝紫 124% 越界 vs 绿 79% 余量),最终简化退回**单 accent 家族**(不偏移)。
- **中性色底调**:原 Catppuccin 中性色天然 hue≈264–284°(冷蓝),统一到旋钮后底调随旋钮走。若想恢复冷蓝底调,把中性色公式里的 `var(--hue)` 改成 `calc(var(--hue) + 274deg)`(仅中性色行)——不推荐,破坏"一钮控全站"的整体感。

## 七、未来接入点(尚未实现)

- Header 调色盘按钮 + 彩虹轨道滑块弹窗(Svelte 岛):调 `hue.ts` 的 setHue/resetHue
- 从 banner 图自动取色生成 hue:sharp + `@material/material-color-utilities`(构建期)
