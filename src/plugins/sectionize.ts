/*
  Sectionize posts for the TOC scroll-spy (the mechanism Fuwari gets from
  remark-sectionize): every heading and its following same-level content is
  wrapped in a <section>, deeper headings nested inside shallower ones —

    <section><h2>…</h2>…<section><h3>…</h3>…</section>…</section>

  The scroll-spy then observes these sections (heading.parentElement) as the
  "current paragraph" containers. Sätteri mdast plugin (Astro 7's default
  Markdown pipeline) following the official "restructuring siblings" recipe:
  the first heading in a parent rewrites that parent's whole child list once
  (WeakSet guard), so heading visitors for its siblings become no-ops. The
  factory form resets the guard per compile.
*/

import { defineMdastPlugin, type Custom, type MdastNode } from "satteri";

type Child = MdastNode | Custom;

/** Wrap a flat child list into depth-nested sections. Headings (and content
    before the first heading stays top-level) are regrouped with a stack:
    a heading closes every open section of the same or lower depth. */
function groupIntoSections(children: readonly Child[]): Child[] {
  const result: Child[] = [];
  const stack: { depth: number; section: Custom }[] = [];
  const current = (): Child[] =>
    stack.length > 0
      ? (stack[stack.length - 1].section.children as Child[])
      : result;

  for (const node of children) {
    if (node.type === "heading" && "depth" in node) {
      const { depth } = node;
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }
      const section: Custom = {
        type: "section",
        data: { hName: "section" },
        children: [node],
      };
      current().push(section);
      stack.push({ depth, section });
    } else {
      current().push(node);
    }
  }
  return result;
}

export const sectionize = () => {
  const done = new WeakSet<object>();
  return defineMdastPlugin({
    name: "sectionize",
    heading(node, ctx) {
      const parent = ctx.parent(node);
      if (!parent || !("children" in parent) || done.has(parent)) return;
      done.add(parent);
      ctx.setProperty(parent, "children", groupIntoSections(parent.children));
    },
  });
};
