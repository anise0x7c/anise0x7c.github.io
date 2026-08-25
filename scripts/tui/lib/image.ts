import { stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// Cover image pipeline (pure data layer — no @inquirer): read any image
// sharp understands, honour EXIF orientation, downscale to a sane max width,
// re-encode as WebP and write `cover.webp` next to the post. Non-destructive:
// the source file is never touched.
//
// Rationale: raw covers routinely land at 5–12 MB; the output here is in the
// low hundreds of KB, so the git repo grows ~30× slower. sharp is already a
// project dependency (used by Astro's image service), so this adds no deps.

const COVER_MAX_WIDTH = 1600;
const COVER_QUALITY = 78;
export const COVER_FILENAME = "cover.webp";

export interface OptimizeResult {
  /** Value to store in the `cover` frontmatter field, e.g. "./cover.webp". */
  coverRel: string;
  srcBytes: number;
  outBytes: number;
  width?: number;
  height?: number;
}

/**
 * Compress `sourcePath` into `<destDir>/cover.webp`.
 * Throws if the source is missing/unreadable or not a decodable image.
 */
export async function optimizeCover(
  sourcePath: string,
  destDir: string,
): Promise<OptimizeResult> {
  const srcBytes = (await stat(sourcePath)).size;
  const destPath = join(destDir, COVER_FILENAME);

  const info = await sharp(sourcePath)
    .rotate()
    .resize({ width: COVER_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: COVER_QUALITY })
    .toFile(destPath);

  return {
    coverRel: `./${COVER_FILENAME}`,
    srcBytes,
    outBytes: (await stat(destPath)).size,
    width: info.width,
    height: info.height,
  };
}
