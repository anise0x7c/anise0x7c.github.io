import { confirm, input, select } from "@inquirer/prompts";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { openInEditor } from "../lib/editor";
import { formatDate, parseDateInput, renderFile } from "../lib/frontmatter";
import { optimizeCover } from "../lib/image";
import { BLOG_DIR } from "../lib/paths";
import { isSlugAvailable, slugify } from "../lib/slug";
import type { BlogFrontmatter } from "../types";

const BODY_TEMPLATE = (title: string) => `\n## ${title}\n\nWrite something brilliant.\n`;

/** Interactive wizard that scaffolds a new Markdown post. */
export async function createPost(): Promise<void> {
  const title = await input({
    message: "Title:",
    validate: (v) => (v.trim() ? true : "Title is required"),
  });

  const slug = await input({
    message: "Slug:",
    default: slugify(title),
    validate: (v) => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) {
        return "Use lowercase letters, numbers and hyphens only";
      }
      return isSlugAvailable(v) ? true : "A post with that slug already exists";
    },
  });

  const description = await input({ message: "Description:", default: "" });
  const tagsRaw = await input({ message: "Tags (comma-separated):", default: "" });
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);

  const dateStr = await input({
    message: "pubDate (YYYY-MM-DD):",
    default: formatDate(new Date()),
    validate: (v) => (parseDateInput(v) ? true : "Invalid date, use YYYY-MM-DD"),
  });

  const draft = await confirm({ message: "Draft?", default: true });

  const layout = await select({
    message: "File layout:",
    choices: [
      { name: `Flat file  ·  src/content/blog/${slug}.md`, value: "flat" },
      { name: `Folder     ·  src/content/blog/${slug}/index.md`, value: "folder" },
    ],
  });

  const fm: BlogFrontmatter = {
    title: title.trim(),
    description: description.trim(),
    pubDate: parseDateInput(dateStr)!,
    tags,
    draft,
  };

  const relPath = layout === "folder" ? join(slug, "index.md") : `${slug}.md`;
  const filePath = join(BLOG_DIR, relPath);
  const postDir = dirname(filePath);

  await mkdir(postDir, { recursive: true });

  // Cover images only make sense for the folder layout (the image lives next
  // to index.md). Compress at authoring time so the repo stays lean.
  if (layout === "folder") {
    const coverSrc = await input({
      message: "Cover image path (optional, Enter to skip):",
      default: "",
    });
    const src = coverSrc.trim();
    if (src) {
      const result = await optimizeCover(src, postDir);
      fm.cover = result.coverRel;
      console.log(
        `\n  ✓ Cover → ${result.coverRel}  ${result.width}×${result.height}, ` +
          `${fmtBytes(result.srcBytes)} → ${fmtBytes(result.outBytes)}\n`,
      );
    }
  }

  await writeFile(filePath, renderFile(fm, BODY_TEMPLATE(title.trim())), "utf8");

  console.log(`\n  ✓ Created ${relPath}\n`);

  if (await confirm({ message: "Open in editor now?", default: true })) {
    await openInEditor(filePath);
  }
}

const fmtBytes = (b: number) =>
  b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
