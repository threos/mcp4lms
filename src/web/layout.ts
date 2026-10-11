import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { LANGS, strings, type Lang } from "./i18n";

type Child = HtmlEscapedString | Promise<HtmlEscapedString> | string;

/** Per-request context the page renderers need: bindings, resolved language and the current path+query (for the language toggle). */
export interface View {
  env: Env;
  lang: Lang;
  path: string;
}

/** The skull is the project's mark: used in text wherever an icon would go. */
export const MARK = "☠";

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="50" font-size="100" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#0a0a0a" stroke="#0a0a0a" stroke-width="3">${MARK}</text></svg>`,
  );

const css = `
:root{--bg:#fff;--surface:#f6f6f4;--surface-2:#ededea;--ink:#0a0a0a;--ink-2:#5f5f5a;--ink-3:#9b9b95;--line:#e7e7e3;--ok:#1a7f4b;--ok-bg:#edf8f1;--warn-bg:#fff7e0;--err:#c0392b;--err-bg:#fdf1ef;
--r:20px;--mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;--sans:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
--shadow:0 1px 2px rgba(0,0,0,.04),0 24px 48px -32px rgba(0,0,0,.18)}
*{box-sizing:border-box}
html{color-scheme:light;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit}
::selection{background:#0a0a0a;color:#fff}
h1{font-size:clamp(2rem,5.5vw,3rem);line-height:1.05;letter-spacing:-.035em;font-weight:650;margin:0 0 .5em;text-wrap:balance}
h2{font-size:1.25rem;line-height:1.3;letter-spacing:-.02em;font-weight:620;margin:0 0 .35em}
p{margin:0 0 1em}
.lead{font-size:1.15rem;color:var(--ink-2);max-width:34em;text-wrap:balance}
.muted{color:var(--ink-2)}.faint{color:var(--ink-3)}.small{font-size:.9rem}.center{text-align:center}
.nav{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.8);backdrop-filter:saturate(180%) blur(14px);-webkit-backdrop-filter:saturate(180%) blur(14px);border-bottom:1px solid transparent}
.nav.scrolled{border-color:var(--line)}
.nav .in{max-width:1040px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:8px 16px;flex-wrap:wrap}
.brand{display:inline-flex;align-items:center;gap:9px;font-weight:650;letter-spacing:-.02em;text-decoration:none;font-size:1.05rem}
.brand .mark{font-size:1.85rem;line-height:1;position:relative;top:-.09em;-webkit-text-stroke:.6px currentColor}
.mark{-webkit-text-stroke:.5px currentColor}
.nav nav{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}
.nav nav a{color:var(--ink-2);text-decoration:none;padding:7px 12px;border-radius:999px;font-size:.95rem;transition:background .15s,color .15s}
.nav nav a:hover,.nav nav a[aria-current]{background:var(--surface);color:var(--ink)}
.nav nav .lang{display:flex;gap:2px;margin-left:6px;padding-left:8px;border-left:1px solid var(--line)}
.nav nav .lang a{padding-left:8px;padding-right:8px;font-size:.85rem;font-weight:560;letter-spacing:.02em}
main{max-width:640px;margin:0 auto;padding:56px 20px 96px}
main.wide{max-width:1040px}
.card{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:28px;box-shadow:var(--shadow)}
.card+.card{margin-top:16px}
.card.soft{background:var(--surface);border-color:transparent;box-shadow:none}
.dim{opacity:.4;transition:opacity .3s}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--ink);border-radius:999px;padding:12px 22px;font:inherit;font-weight:560;line-height:1.2;cursor:pointer;text-decoration:none;background:var(--ink);color:#fff;transition:box-shadow .15s,border-color .15s;white-space:nowrap}
.btn:hover{box-shadow:0 8px 20px -10px rgba(0,0,0,.5)}
.btn.ghost{background:#fff;color:var(--ink);border-color:var(--line)}
.btn.ghost:hover{border-color:var(--ink-3);box-shadow:none}
.btn.danger{background:var(--err);border-color:var(--err)}
.btn.sm{padding:8px 14px;font-size:.9rem}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.between{justify-content:space-between}
label{font-weight:560}
input[type=text],input[type=password]{width:100%;padding:13px 16px;border-radius:14px;border:1px solid var(--line);background:#fff;color:var(--ink);font:15px var(--mono);outline:none;transition:border-color .15s,box-shadow .15s}
input:focus{border-color:var(--ink);box-shadow:0 0 0 4px rgba(0,0,0,.06)}
.note{border-radius:14px;padding:12px 16px;background:var(--warn-bg);font-size:.95rem}
.note.ok{background:var(--ok-bg);color:var(--ok)}
.note.err{background:var(--err-bg);color:var(--err)}
code,.mono{font-family:var(--mono);font-size:.9em}
code{background:var(--surface);padding:2px 6px;border-radius:6px}
.keybox{font:15px/1.5 var(--mono);word-break:break-all;background:var(--surface);border-radius:14px;padding:16px 18px;user-select:all}
kbd{font:.85em var(--mono);border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;padding:1px 7px;background:#fff}
details{margin-top:14px}summary{cursor:pointer;color:var(--ink-2);list-style:none;display:inline-flex;align-items:center;gap:6px}
summary::-webkit-details-marker{display:none}summary::before{content:"+";font-weight:600;width:1em;text-align:center}
details[open] summary::before{content:"–"}
details ol{padding-left:1.3em}details li{margin:6px 0}
.steps{counter-reset:s;display:grid;grid-template-columns:minmax(0,1fr);gap:12px}.steps>*{min-width:0}
.step{display:flex;gap:16px;align-items:flex-start}
.step::before{counter-increment:s;content:counter(s);flex:none;width:30px;height:30px;border-radius:50%;background:var(--surface-2);font-weight:620;font-size:.9rem;display:grid;place-items:center;margin-top:2px}
.step.done::before{content:"✓";background:var(--ok-bg);color:var(--ok)}
.step>div{flex:1;min-width:0}
.step h2{font-size:1.1rem;margin-bottom:.2em}
.hidden{display:none!important}
footer{max-width:1040px;margin:0 auto;padding:0 20px 48px;color:var(--ink-3);font-size:.85rem;display:flex;flex-wrap:wrap;gap:6px 18px}
footer a{color:inherit}
@media (max-width:640px){.nav .in{padding:12px 16px}.nav nav a{padding:7px 9px;font-size:.9rem}.nav nav .lang{margin-left:2px;padding-left:4px}.nav nav .lang a{padding-left:6px;padding-right:6px}.card{padding:22px}main{padding-top:36px;padding-left:16px;padding-right:16px}.card.step{flex-direction:column;gap:10px}.hint{overflow-wrap:anywhere}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

/** Same path and query string, with only `lang` replaced. Other parameters (e.g. the OAuth request on /authorize) are kept byte for byte. */
export function withLang(path: string, lang: Lang): string {
  const i = path.indexOf("?");
  const pathname = i < 0 ? path : path.slice(0, i);
  const params = (i < 0 ? "" : path.slice(i + 1)).split("&").filter((p) => p && !p.startsWith("lang="));
  params.push(`lang=${lang}`);
  return `${pathname}?${params.join("&")}`;
}

export function page(
  v: View,
  opts: {
    title: string;
    body: Child;
    script?: string;
    wide?: boolean;
    current?: "/connect" | "/account" | "/privacy";
    description?: string;
  },
) {
  const { env: _env, lang, path } = v;
  const t = strings[lang];
  const { title, body, script, wide, current, description } = opts;
  const nav = (href: string, label: string) =>
    html`<a href="${href}" ${current === href ? raw('aria-current="page"') : ""}>${label}</a>`;
  const langLink = (l: Lang) =>
    html`<a href="${withLang(path, l)}" hreflang="${l}" lang="${l}" title="${strings[l].langName}" ${l === lang ? raw('aria-current="true"') : ""}>${l.toUpperCase()}</a>`;
  return html`<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#ffffff">
${description ? html`<meta name="description" content="${description}">` : ""}
<title>${title} · Mcp4Lms</title>
<link rel="icon" href="${FAVICON}">
<link rel="apple-touch-icon" href="/flag.png">
<style>${raw(css)}</style>
</head>
<body>
<header class="nav" id="nav"><div class="in">
  <a class="brand" href="/"><span class="mark" aria-hidden="true">${MARK}</span>Mcp4Lms</a>
  <nav>${nav("/connect", t.nav.connect)}${nav("/account", t.nav.account)}${nav("/privacy", t.nav.privacy)}<span class="lang" role="group" aria-label="${t.nav.language}">${LANGS.map(langLink)}</span></nav>
</div></header>
<main${wide ? raw(' class="wide"') : ""}>${body}</main>
<footer>
  <span>${t.footer.open}</span>
  <span>${t.footer.affiliation}</span>
  <span>${t.footer.trademark}</span>
  <a href="/privacy#disclaimer">${t.footer.disclaimer}</a>
</footer>
<script>addEventListener('scroll',()=>document.getElementById('nav').classList.toggle('scrolled',scrollY>8),{passive:true});${script ? raw(script) : ""}</script>
</body>
</html>`;
}

/** Safely embed data in an inline <script>. */
export function jsData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};
