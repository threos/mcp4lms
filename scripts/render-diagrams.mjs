// Renders diagrams/*.mmd (Mermaid) to public/diagrams/*.svg with mermaid-cli.
// The page embeds them as <img>, so they work under the strict CSP without
// shipping Mermaid to the browser. Run `npm run diagrams` after editing a .mmd.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "diagrams";
const OUT = "public/diagrams";
const CONFIG = join(SRC, "mermaid.config.json");
const FONT = "-apple-system,BlinkMacSystemFont,Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".mmd")).sort()) {
  const name = file.replace(/\.mmd$/, "").replace(".", "-"); // connect.en -> connect-en
  const out = join(OUT, `${name}.svg`);
  execFileSync(
    "npx",
    ["-y", "@mermaid-js/mermaid-cli", "-q", "-i", join(SRC, file), "-o", out, "-c", CONFIG, "-b", "transparent", "--svgId", `m4l-${name}`],
    { stdio: "inherit" },
  );
  let svg = readFileSync(out, "utf8");
  // mermaid-cli embeds its own web fonts (~170 KB); drop them and use the site's font stack.
  svg = svg.replace(/@font-face\s*\{[^}]*\}/g, "").replace(/"?Recursive Variable"?,?/g, "");
  svg = svg.replace(/font-family:\s*,?\s*/g, `font-family:${FONT},`);
  // Give the root explicit dimensions (from the viewBox) so <img> knows the aspect ratio.
  const vb = /viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
  if (vb) {
    const [, , , w, h] = vb;
    svg = svg.replace(/<svg([^>]*?) width="100%"/, `<svg$1 width="${Math.round(+w)}" height="${Math.round(+h)}"`);
  }
  svg = svg.replace(/\s*background-color:\s*transparent;?/, "");
  writeFileSync(out, svg);
  console.log(`${out} (${(svg.length / 1024).toFixed(1)} KB)`);
}
