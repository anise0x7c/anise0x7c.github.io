# TUI 博文管理器 · 开发文档

> 面向 `scripts/tui/` 目录的开发说明：架构、数据流、约定与扩展指南。
> 用户向的用法见 `pnpm tui` 启动后的交互界面；本文面向**修改/扩展这个工具的人**。

---

## 1. 概览

`scripts/tui/` 是一个**独立于 Astro 运行时**的 Node 终端工具，用交互式提示（prompt）管理 `src/content/blog/` 下的 Markdown 博文。

| 项 | 值 |
| --- | --- |
| 入口 | `scripts/tui/index.ts`（`pnpm tui` → `tsx scripts/tui/index.ts`） |
| 交互框架 | [`@inquirer/prompts`](https://www.npmjs.com/package/@inquirer/prompts) |
| frontmatter 解析 | `gray-matter`（内部依赖 `js-yaml` v3） |
| 运行方式 | `tsx` 直接执行 TS，无编译步骤 |
| Node | ≥ 22.12.0（与站点 engine 一致） |

**设计原则**

1. **零 Astro 依赖**：不 import 任何 `astro:*` 或 `astro:content`，脚本可独立跑，也不需要 Vite/dev server。`BlogFrontmatter` 类型是手写镜像（见 §5.1）。
2. **纯数据层 + 纯 UI 层分离**：`lib/` 是纯逻辑（可单测/被脚本复用），`actions/` 才是交互流程。
3. **只动 frontmatter，绝不碰正文**：写入时正文逐字节保留（见 §5.3）。
4. **未知字段保全**：schema 之外的 frontmatter 键在编辑后仍保留（见 §5.3）。

---

## 2. 快速开始

```bash
pnpm tui                  # 启动交互菜单
printf '' | pnpm tui      # 无 TTY 环境（CI 冒烟）应打印菜单并优雅退出
npx astro check           # 类型检查（scripts/ 被 tsconfig 纳入）
```

主菜单包含 7 项：`List posts` / `Create post` / `Edit frontmatter` / `Toggle draft` / `Open in $EDITOR` / `Delete post` / `Exit`。

> **⚠️ 交互前提**：`@inquirer/prompts` 需要 TTY。非 TTY 下（如管道）第一个 prompt 会抛 `ExitPromptError`，`index.ts` 已处理为打印 `aborted.` 并以 0 退出。

---

## 3. 目录结构

```
scripts/tui/
├── index.ts              入口：主菜单循环 + 全局错误处理
├── types.ts              BlogFrontmatter / Post 类型（镜像 content.config.ts）
├── lib/                  纯数据层（不依赖 @inquirer，可独立复用）
│   ├── paths.ts          PROJECT_ROOT / BLOG_DIR 路径解析
│   ├── posts.ts          getPosts()：扫描并解析全部文章
│   ├── frontmatter.ts    frontmatter 读写、日期工具、类型归一化
│   ├── slug.ts           slugify() + isSlugAvailable()
│   ├── editor.ts         openInEditor()：调起 $EDITOR/$VISUAL/vi
│   ├── image.ts          optimizeCover()：sharp 压缩封面为 WebP
│   └── ui.ts             pickPost()：文章选择器（唯一引用 @inquirer 的 lib 文件）
└── actions/              每个 action 一个文件（交互流程）
    ├── list.ts           listPosts()
    ├── create.ts         createPost()：新建文章向导
    ├── edit.ts           editFrontmatter()：逐字段编辑
    ├── toggle-draft.ts   toggleDraft()：切换 draft
    ├── delete.ts         deletePost()：删除（带二次确认）
    └── open-editor.ts    openEditor()：外部编辑器打开
```

依赖方向严格单向：`index.ts → actions/* → lib/*`；`lib/` 内 `posts.ts → frontmatter.ts`、`slug.ts → paths.ts`、`ui.ts → frontmatter.ts`，无环。

---

## 4. 主循环与 action 模式

`index.ts` 是一个 `while (true)` 循环：

1. `select` 展示主菜单，拿到 `Action` 值。
2. `action === "exit"` → 退出。
3. 其余情况先 `await getPosts()` 拿到当前文章列表，再 `switch` 分发到对应 action，action **收 `posts` 作参数**（除 `create`）。
4. 单个 action 抛错 → `try/catch` 打印 `✗ <message>` 并回到主菜单（不崩溃）。

**新增一个 action 的步骤**：

1. 在 `actions/` 新建 `xxx.ts`，默认导出 `async function xxx(posts: Post[]): Promise<void>`。
2. 在 `index.ts` 的 `Action` 联合类型、`choices`、`switch` 三处登记（第 10、24、41 行附近）。

**全局错误处理**（`index.ts` 底部 `run().catch`）：

- `ExitPromptError`（用户 Ctrl+C/Ctrl+D）→ 打印 `aborted.`，`process.exit(0)`。
- 其余异常 → 打印堆栈，`process.exit(1)`。

---

## 5. 关键实现细节

### 5.1 类型镜像（types.ts）

`BlogFrontmatter` 是 `src/content.config.ts` 中 `blog` 集合 Zod schema 的**手写镜像**，字段一一对应：

```
title: string            description: string
pubDate: Date            updatedDate?: Date
tags: string[]           draft: boolean
cover?: string
```

> ⚠️ **手动同步约定**：改 `content.config.ts` 的 schema 时，必须同步改 `types.ts`（以及 §5.3 的 `KNOWN_KEYS`）。做不到自动同步是因为这里故意不引入 `astro:content` 运行时。
> `Post` 还含派生元信息：`slug`（展示用 slug）、`filePath`（绝对路径）、`isFolder`（是否为目录形态 `<slug>/index.md`）。

### 5.2 文章发现（posts.ts）

`getPosts()` 逻辑：

1. `readdir(BLOG_DIR, { recursive: true })` 递归列出全部文件。
2. 按扩展名过滤 `.md` / `.mdx`。
3. `slugFromRel()` 判定 slug 与形态：
   - `<name>.md` → `slug = <name>`，`isFolder = false`
   - `<slug>/index.md` → `slug = <父目录名>`，`isFolder = true`
4. `gray-matter` 解析 frontmatter → `normalizeFrontmatter()` 归一化。
5. 按 `pubDate` 降序排序。

**为什么 slug 与 Astro 保持一致**：站点路由 `[...slug].astro` 基于集合 id（相对 `base` 去扩展名）。对 `index.md` 特判去掉 `/index` 后缀，正好对上现有 `post-with-cover` 目录形态。

### 5.3 frontmatter 读写（frontmatter.ts）

三个「护城河」保证数据安全：

- **正文保留**：`writeFrontmatter()` 先 `matter(raw)` 取出 `parsed.content`，写回时只替换 frontmatter。
- **未知字段保留**：写回前遍历原始 `data`，把 `KNOWN_KEYS`（镜像 schema 的 8 个键）之外的键合并回新对象。
- **可空字段可清空**：`updatedDate`/`cover` 在 `toSerialisable()` 中仅在非空时输出——未设置即从结果中删除，实现「清空」语义。

日期处理约定：

- **读入**：`normalizeFrontmatter()` 里的 `toDate()` 容忍 Date/字符串/数字。
- **写出**：`toSerialisable()` 一律转为本地时区的 `YYYY-MM-DD` 字符串（`formatDate`）。
- **校验**：`parseDateInput()` 严格匹配 `YYYY-MM-DD`，返回 `Date | null`。

**⚠️ 已知的 js-yaml 重格式化行为**（`gray-matter.stringify` 直接调用 js-yaml v3 默认 dump，不传自定义选项，且测试确认 `lineWidth` 等选项不会透传）：

| 手写式样 | 保存后的式样 | 是否合法 / 语义是否保持 |
| --- | --- | --- |
| `pubDate: 2026-08-01` | `pubDate: '2026-08-01'`（加引号） | ✅ `z.coerce.date()` 正常解析 |
| `tags: ["a", "b"]` | `tags:\n  - a\n  - b`（块状列表） | ✅ |
| 长 description 单行 | `>-` 折叠标量（80 列换行） | ✅ 解析回同一字符串 |

结论：**数据零丢失、语义不变，只是文字风格被归一化**。这是所有 gray-matter 系工具的常规行为。若未来要输出「手写式样」，可给 gray-matter 配置自定义 `engines.yaml.stringify`（需直接依赖 `js-yaml`）。

### 5.4 slug 生成与查重（slug.ts）

- `slugify()`：小写 → 去引号 → 非 `[a-z0-9]` 连缀转 `-` → 去首尾 `-`。⚠️ 纯中文标题会得到空串，`create.ts` 的 slug 校验（`^[a-z0-9]+(?:-[a-z0-9]+)*$`）会拒绝空串，用户需手输 slug。
- `isSlugAvailable()`：同时检查 `.md`/`.mdx` 与 `<slug>/index.{md,mdx}` 四种形态，防「扁平/目录」互相冲突。

### 5.5 路径解析（paths.ts）

```ts
// scripts/tui/lib/paths.ts 位于项目根下第 3 层
const here = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(here, "..", "..", "..");
export const BLOG_DIR = join(PROJECT_ROOT, "src", "content", "blog");
```

基于 `import.meta.url` 而非 `process.cwd()`，**从任意工作目录启动都指向正确路径**。`getPosts()` 在目录缺失时抛友好错误（而非裸 ENOENT）。

> ⚠️ 若调整了目录深度（例如把 `lib/` 上移一层），`".."` 的次数必须同步改。

### 5.6 编辑器调起（editor.ts）

`openInEditor()`：

1. 取 `$EDITOR` → `$VISUAL` → `vi`。
2. 按空白拆分命令（支持 `code -w` 这类「程序+参数」写法），程序与参数分离后 `spawn`。
3. `stdio: "inherit"` 让编辑器接管终端，`await` 到其退出；非零退出码视为失败并抛错。

### 5.7 文章选择器（ui.ts）

`pickPost(posts, message?)` 把文章渲染成紧凑单行（draft 标记 + 日期 + slug + tags），`pageSize: 15`。空列表抛 `"No posts found…"`，由 `index.ts` 的 catch 打印。`formatPostLabel()` 为纯函数，`list.ts` 之外也可复用。

---

## 6. 各 action 流程

| Action | 流程要点 |
| --- | --- |
| **List** | 纯 `console.log` 输出（无 prompt），打印 draft 标记/日期/slug/标题/tags，末尾统计条数。 |
| **Create** | title → slug（默认 `slugify(title)`，校验格式+查重）→ description → tags（逗号分隔）→ pubDate（默认今天）→ draft（默认 `true`）→ 选扁平/目录形态 → 写入模板正文 → 询问是否立即 `$EDITOR` 打开。 |
| **Edit** | 选文章 → 选字段（title/description/tags/pubDate/updatedDate/draft）→ 输入新值（当前值作默认）→ 写回。`updatedDate` 留空即清除。 |
| **Toggle draft** | 选文章 → 确认翻转目标值 → 写回。 |
| **Delete** | 选文章 → 显示路径二次确认（默认 `false`）→ `isFolder` 时 `rm -r` 整个目录，否则删单个文件。 |
| **Open in $EDITOR** | 选文章 → `openInEditor(filePath)`，阻塞到编辑器退出。 |

> 注意：主循环对**每个** action（含 create）都会先调一次 `getPosts()`。create 并不需要它，目前仅是简单起见统一调用；若嫌多余可把 `getPosts()` 挪进各 action。

---

## 7. 依赖

除 `sharp`（本就在 `dependencies` 中，站点构建与 TUI 共用）外，其余为 `devDependencies`（不影响生产构建）：

| 包 | 用途 |
| --- | --- |
| `tsx` | 直接执行 TS |
| `@inquirer/prompts` | select / input / confirm |
| `gray-matter` | frontmatter 读写 |
| `sharp` | `lib/image.ts` 压缩封面为 WebP（`dependencies`） |
| `@types/node` | Node API 类型（项目原本缺失，`^22.10` 对齐 Node 22 引擎） |

无 lint / test / format 脚本——按仓库既有约定，**类型检查以 `pnpm astro check` 为准**。

---

## 8. 验证与回归

```bash
npx astro check   # 必须 0 errors（tsconfig include 了 **/*，scripts/ 也在检查范围）
pnpm build        # 确认站点构建不受影响
pnpm tui          # 交互冒烟（需 TTY）
printf '' | pnpm tui   # 无 TTY 冒烟：应打印菜单 + "aborted."，退出码 0
```

**数据安全自测**（不触碰真实文章）：对临时文件调用 `writeFrontmatter`，断言：

1. 正文逐字节不变；
2. schema 外未知键（如 `author`）保留；
3. `updatedDate` 置空后该键消失。

> 已有的实现已在开发时通过上述断言（见 `hello-world.md` 意外格式化事件——当时冒烟测试误改了真实文件，已用 `git checkout` 还原；教训：**不要在真实文章上跑写回测试**）。

---

## 9. 已知限制与后续方向

- **frontmatter 格式化归一化**（§5.3）：功能无损，风格不同于手写。要「输出即手写式样」需引入自定义 YAML engine。
- **不管理封面图（已补 create，edit 仍缺）**：`cover` 字段在 `types.ts` 中存在、写回时保留；`create` 流程现支持 **folder 形态**下输入图片路径 → `lib/image.ts` 用 sharp 压缩为 `cover.webp`（限宽 1600、WebP q90（高保真母版）、非破坏）并写入 `cover` 字段；`edit` 流程仍不能编辑它。
- **tags 无联想**：新建/编辑时用逗号分隔输入，不做已有标签补全。
- **slug 不支持中文/多级路径**：校验强制 `[a-z0-9-]`，纯中文标题需手输 slug。
- **无自动测试**：数据层可独立复用，未来可加一个纯 Node 的单元测试入口（不引入 test runner 也行，用 `assert` 断言脚本）。
