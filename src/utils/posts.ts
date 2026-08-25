import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";

export type Post = CollectionEntry<"blog">;

/** All published posts, newest first. Drafts are excluded in production. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/** A few most-recent posts, e.g. for the home page preview. */
export async function getRecentPosts(limit = 4): Promise<Post[]> {
  return (await getPublishedPosts()).slice(0, limit);
}
