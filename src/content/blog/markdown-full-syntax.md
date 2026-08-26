---
title: Markdown 全语法渲染测试
description: 一篇覆盖几乎所有 Markdown / GFM 语法的测试博文：标题、强调、链接、列表、任务清单、代码高亮、表格、脚注、内联 HTML 与各种边角案例。
pubDate: '2026-08-23'
tags:
  - meta
  - markdown
draft: true
---

这是一篇**渲染压力测试**博文：把 Markdown / GFM 的语法全家桶塞进一篇文章里，
用来检查网站的 `.prose` 样式、Shiki 代码高亮和各种边角案例的实际表现。

> [!NOTE]
> 如果你的渲染器不认识上面这行，它就会按字面显示出来 —— 这本身就是一种测试。

## 1. 标题层级 Heading

以下从 H1 到 H6 依次渲染（正常博文里建议从 H2 开始，因为页面标题已经占了大纲的顶端）：

# H1 一级标题

## H2 二级标题

### H3 三级标题

#### H4 四级标题

##### H5 五级标题

###### H6 六级标题

## 2. 段落与换行

这是一个普通段落。Markdown 里单个换行是软换行，
渲染后通常合并为同一行（具体是否折行取决于 CSS `white-space`）。

这一行末尾有两个空格，是**硬换行**：  
所以这里应该出现在新的一行。

反斜杠结尾也可以强制换行：\
比如这一行。

## 3. 行内强调 Inline Emphasis

- **粗体** 和 __另一种粗体__
- *斜体* 和 _另一种斜体_
- ***粗斜体*** 和 ___三下划线___
- ~~删除线~~（GFM）
- `行内代码`
- **粗体里嵌 *斜体* 和 `代码`**
- ~~删除线里嵌 **粗体**~~
- 转义字符：\*不是斜体\*、\_不是强调\_、\`\`不是代码\`\`
- 上标 H<sub>2</sub>O 与 x<sup>2</sup>（内联 HTML）
- 键盘键：<kbd>Ctrl</kbd> + <kbd>C</kbd>，<kbd>⌘</kbd> + <kbd>K</kbd>

## 4. 链接 Links

- 行内链接：[Astro 官网](https://astro.build)
- 带 title 的链接：[悬停看看](https://example.com "我是 title 提示")
- 自动链接（GFM autolink）：https://docs.astro.build
- 裸点分链接：www.example.com
- 引用式链接：[Markdown Guide][mdguide] 和 [CommonMark][cm]

[mdguide]: https://www.markdownguide.org "Markdown Guide"
[cm]: https://commonmark.org

- 一个用来测试溢出的超长链接：
  https://example.com/a/very/long/path/that/goes/on/and/on/and/on/forever/and/ever/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

## 5. 列表 Lists

无序列表：

- 第一项
- 第二项
  - 嵌套一层
    - 嵌套两层
- 第三项，含 `行内代码` 和 **粗体**

有序列表：

1. 第一步
2. 第二步
   1. 子步骤 A
   2. 子步骤 B
3. 第三步

列表里的段落（懒散续行）：

- 列表项一

  列表项一下面的第二段，前面有两个空格缩进。
- 列表项二

任务清单（GFM Task List）：

- [x] 已经完成的事
- [x] 再完成一件事
- [ ] 还没做的事
- [ ] 摸鱼（永远 pending）

定义风格的伪列表（Markdown 原生不支持 dl，这里是普通写法）：

**术语一**
: 这里假装是定义（其实只是普通文本加粗）。

## 6. 代码 Code

行内代码里放反引号：`` `code` `` 用双反引号包住。

无语言围栏代码块：

```
plain text code block
  保持缩进
    第二层缩进
<!> 特殊字符 < > & " ' 原样显示
```

TypeScript（Shiki 高亮）：

```ts
interface Post<T extends { id: string }> {
  id: string;
  title: string;
  tags: string[];
  meta?: T;
}

export async function getPost(id: string): Promise<Post<{ views: number }>> {
  const post = await db.find(id);
  if (!post) throw new Error(`post ${id} not found`);
  return { ...post, tags: post.tags ?? [] };
}
```

Python：

```python
from dataclasses import dataclass, field

@dataclass
class Fib:
    cache: dict[int, int] = field(default_factory=lambda: {0: 0, 1: 1})

    def at(self, n: int) -> int:
        if n not in self.cache:
            self.cache[n] = self.at(n - 1) + self.at(n - 2)
        return self.cache[n]

print([Fib().at(i) for i in range(10)])
```

CSS：

```css
.prose pre {
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  overflow-x: auto; /* 长行横向滚动 */
}

.prose pre:hover { box-shadow: var(--shadow-card); }
```

Bash：

```bash
# 安装依赖并启动开发服务器
pnpm install
pnpm dev --host 2>&1 | tee dev.log

for i in {1..5}; do
  curl -sf "http://localhost:4321/_astro/status" && break
  sleep 1
done
```

JSON：

```json
{
  "name": "blog-beta",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build"
  }
}
```

diff：

```diff
- const banner = document.querySelector("#banner");
- banner.style.height = "65dvh";
+ const band = document.querySelector(".site-banner");
+ band.style.height = "var(--banner-h-effective)";
```

HTML：

```html
<figure>
  <img src="/assets/banner.jpg" alt="站点横幅" loading="lazy" />
  <figcaption>一张需要正确转义的 <图片></figcaption>
</figure>
```

代码块里的超长行（测试 `overflow-x: auto`）：

```text
aaaaaaaaaa|bbbbbbbbbb|cccccccccc|ddddddddbb|eeeeeeeeee|ffffffffff|gggggggggg|hhhhhhhhhh|iiiiiiiiii|jjjjjjjjjj|kkkkkkkkkk|llllllllll|mmmmmmmmmm
```

## 7. 引用 Blockquote

普通引用：

> 这是引用的第一行。
> 引用内部的软换行。

嵌套引用：

> 外层引用
>
> > 内层引用
> >
> > > 三层引用，够了够了

引用里塞其他元素：

> **引用里的粗体**、`代码`、[链接](https://example.com)
>
> - 引用里的列表项一
> - 引用里的列表项二
>
> ```ts
> // 引用里的代码块
> const q = "quote";
> ```
>
> 最后一段引用。

## 8. 表格 Tables (GFM)

| 语法 | 渲染效果 | 备注 |
| --- | :--- | ---: |
| `**bold**` | **粗体** | 左对齐列 |
| `*italic*` | *斜体* | 居中列本来在这 |
| `~~strike~~` | ~~删除线~~ | 右对齐列 |
| `[link]()` | [链接](https://example.com) | 表格内链接 |
| `` `code` `` | `行内代码` | 表格内代码 |

含空单元格与长内容的表格：

| 特性 | 支持情况 | 说明 |
| --- | --- | --- |
| GFM 表格 | ✅ | 默认开启（remark-gfm） |
| 脚注 | ✅ | 见下文第 10 节 |
| 数学公式 | ❌ | 未装 KaTeX，按字面渲染 `E=mc^2` |
|  | （空单元格） |  |

## 9. 图片 Images

相对路径本地图（会被 Astro 自动优化为 webp）：

![本地图片](/src/assets/images/chasing-color-hrz.jpg)

远程图片（不会被优化，仅测试外链渲染）：

![远程占位图](https://picsum.photos/seed/blogbeta/860/420 "picsum 随机图")

## 10. 脚注 Footnotes (GFM)

这里有一个脚注引用[^1]，这里有一个长脚注[^long]，
还有一个放在文中间也没问题的[^note-in-text]。

[^1]: 这是脚注一的内容。
[^long]: 这是一个**长脚注**：可以包含多段落内容。

    第二段需要缩进四个空格。

    ```ts
    const canFootnoteContainCode = true;
    ```
[^note-in-text]: 也可用内联形式写脚注，但多行内容还是放底部更清爽。

## 11. 内联 HTML 与折叠块

Markdown 允许直接写 HTML：

<p align="center" style="color: var(--color-accent);">
  这是一段手写的 <code>&lt;p&gt;</code>，试着带上了主题色。
</p>

折叠块（原生 details，无 JS）：

<details>
<summary>点开看看里面有什么</summary>

里面是**正常渲染的 Markdown**（details 内的空行让解析器切回 Markdown 模式）：

- 列表项
- `行内代码`

```js
console.log("even code blocks");
```

</details>

HTML 注释在页面上**不可见**（浏览器不渲染注释），但它仍会留在 HTML 源码里——
查看网页源代码能找到下面这一行：

<!-- 你看不见我 👻 -->

## 12. 分隔线与杂项

---

三颗星的分隔线：

***

 Emoji 与符号：🎉 🚀 🫠 ✅ ❌ ⌘ → ← © ® ™ ¥ £

多个连续空格：a     b（渲染后应折叠为一个空格）

特殊字符转义对照：`&` → &amp; 、`<` → &lt; 、`>` → &gt;（在代码与正文里分别观察）

结论：如果以上每一节都渲染正常，说明这个站点的 Markdown 管线
（remark-gfm + Shiki + `.prose` 样式）工作良好，可以放心写正文了 ✍️
