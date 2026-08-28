/*
  GitHub-style blockquote alerts ([!NOTE] / [!TIP] / [!IMPORTANT] /
  [!WARNING] / [!CAUTION]) — a GitHub.com extension that plain GFM / Sätteri
  does not support, so those markers used to render as literal text inside an
  ordinary blockquote. This plugin rewrites a blockquote whose first paragraph
  opens with a marker into a <div class="alert alert-<type>">: the marker line
  is stripped and an English title line (<p class="alert-title"><strong>
  Note</strong></p>) is injected, matching GitHub's rendering. Styling lives in
  components.css (.prose .alert …), consuming the static Catppuccin chromatic
  accents (blue / green / mauve / yellow / red).
*/

import { defineMdastPlugin } from "satteri";

const ALERT_RE = /^\[!(note|tip|important|warning|caution)\]\s*/i;

const TITLES: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

export const alerts = () =>
  defineMdastPlugin({
    name: "alerts",
    blockquote(node, ctx) {
      const first = node.children[0];
      if (!first || first.type !== "paragraph") return;
      const head = first.children[0];
      if (!head || head.type !== "text") return;
      const m = ALERT_RE.exec(head.value);
      if (!m) return;
      const variant = m[1].toLowerCase();
      const rest = head.value.slice(m[0].length);

      // Strip the marker: if it was its own line, drop the text node plus the
      // soft break(s) that followed it; if the paragraph becomes empty, drop
      // the whole paragraph. Otherwise keep the remaining text of the line.
      if (rest.length === 0) {
        let tail = first.children.slice(1);
        while (tail[0]?.type === "break") tail = tail.slice(1);
        if (tail.length === 0) {
          ctx.removeNode(first);
        } else {
          ctx.setProperty(first, "children", tail);
        }
      } else {
        ctx.setProperty(first, "children", [
          { type: "text", value: rest },
          ...first.children.slice(1),
        ]);
      }

      // Rerender as a <div class="alert alert-<type>"> (not a blockquote, so
      // the .prose blockquote styles below never apply to it).
      ctx.setProperty(node, "data", {
        hName: "div",
        hProperties: {
          className: ["alert", `alert-${variant}`],
          "data-alert": variant,
        },
      });

      // Title line as real DOM text (selectable, screen-reader friendly).
      ctx.insertChildAt(node, 0, {
        type: "paragraph",
        data: { hProperties: { className: "alert-title" } },
        children: [
          { type: "strong", children: [{ type: "text", value: TITLES[variant] }] },
        ],
      });
    },
  });
