import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { LANGS, strings, type Lang } from "./i18n";
import { universitiesFor, universityName } from "../universities";

type Child = HtmlEscapedString | Promise<HtmlEscapedString> | string;

/** Per-request context the page renderers need: bindings, resolved language and the current path+query (for the language toggle). */
export interface View {
  env: Env;
  lang: Lang;
  path: string;
}

/** The skull is the project's mark: used in text wherever an icon would go. */
export const MARK = "☠";

/**
 * A link to a page on the student's LMS (`path` like "/my/"). It has no fixed LMS address: clicking it opens the
 * university picker (`lmsPicker` in `page`), which then opens `path` on the chosen university's LMS in a new tab.
 */
export const lmsLink = (path: string, text: unknown, cls?: string) =>
  html`<a href="#" data-lms="${path}" aria-haspopup="dialog"${cls ? html` class="${cls}"` : ""}>${text}</a>`;

/** University list shared by the Connect page picker and the LMS-link modal. */
export const uniCss = `.uni{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--ink);font:inherit;cursor:pointer;text-decoration:none;transition:border-color .15s,background .15s}
.uni+.uni{margin-top:8px}
.uni:hover:not([disabled]){border-color:var(--ink)}
.uni[disabled]{cursor:default;color:var(--ink-3)}
.uni .mark{font-size:1.5rem;line-height:1;-webkit-text-stroke:.5px currentColor}
.uni b{display:block}.uni small{color:var(--ink-3);font-family:var(--mono)}
.uni .soon{margin-left:auto;font-size:.8rem;color:var(--ink-3)}`;

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
.nav nav a.gh{display:inline-flex;align-items:center;padding:7px 8px;margin-left:2px}.nav nav a.gh svg{display:block}
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
.lms-pick{border:0;padding:0;border-radius:var(--r);width:min(480px,calc(100% - 32px));box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:var(--ink)}
.lms-pick::backdrop{background:rgba(10,10,10,.4)}
.lms-pick>div{padding:28px;position:relative}
.lms-pick .x{position:absolute;top:14px;right:14px;border:0;background:none;font:1.4rem/1 var(--sans);color:var(--ink-2);cursor:pointer;padding:6px 10px;border-radius:999px}
.lms-pick .x:hover{background:var(--surface)}
.lms-pick h2{padding-right:32px}
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
  const { env, lang, path } = v;
  const t = strings[lang];
  const unis = universitiesFor(env);
  const { title, body, script, wide, current, description } = opts;
  // Link previews (WhatsApp, Facebook, X) need absolute URLs; the image is a 1200×630 JPEG per language in public/.
  const canonical = env.PUBLIC_URL + path.split("?")[0];
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
<meta property="og:type" content="website">
<meta property="og:site_name" content="Mcp4Lms">
<meta property="og:title" content="${title} · Mcp4Lms">
<meta property="og:description" content="${description ?? t.home.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === "tr" ? "tr_TR" : "en_US"}">
<meta property="og:image" content="${env.PUBLIC_URL}/og-${lang}.jpg">
<meta property="og:image:secure_url" content="${env.PUBLIC_URL}/og-${lang}.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${t.home.title}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-96.png" type="image/png" sizes="96x96">
<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>${raw(css)}${raw(uniCss)}</style>
</head>
<body>
<header class="nav" id="nav"><div class="in">
  <a class="brand" href="/"><span class="mark" aria-hidden="true">${MARK}</span>Mcp4Lms</a>
  <nav>${nav("/connect", t.nav.connect)}${nav("/account", t.nav.account)}${nav("/privacy", t.nav.privacy)}<span class="lang" role="group" aria-label="${t.nav.language}">${LANGS.map(langLink)}</span><a class="gh" href="${env.REPO_URL}" target="_blank" rel="noopener" aria-label="Source on GitHub" title="GitHub"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"/></svg></a></nav>
</div></header>
<main${wide ? raw(' class="wide"') : ""}>${body}</main>
<dialog class="lms-pick" id="lms-pick" aria-labelledby="lms-pick-title"><div>
  <form method="dialog"><button class="x" aria-label="${t.lmsPicker.close}" title="${t.lmsPicker.close}">×</button></form>
  <h2 id="lms-pick-title">${t.lmsPicker.title}</h2>
  <p class="muted small">${t.lmsPicker.lead}</p>
  ${unis.map((u) => {
    const inner = html`<span class="mark" aria-hidden="true">${MARK}</span><span><b>${universityName(u, lang)}</b><small>${new URL(u.lmsUrl).host}</small></span>`;
    return u.available
      ? html`<a class="uni" data-base="${u.lmsUrl.replace(/\/+$/, "")}" href="${u.lmsUrl}" target="_blank" rel="noopener noreferrer">${inner}<span class="soon" aria-hidden="true">↗</span></a>`
      : html`<button type="button" class="uni" disabled>${inner}<span class="soon">${t.lmsPicker.notAvailable}</span></button>`;
  })}
</div></dialog>
<footer>
  <span>${t.footer.open}</span>
  <span>${t.footer.affiliation}</span>
  <span>${t.footer.trademark}</span>
  <a href="/privacy#universities">${t.footer.universities}</a>
  <a href="/privacy#disclaimer">${t.footer.disclaimer}</a>
</footer>
<script>addEventListener('scroll',()=>document.getElementById('nav').classList.toggle('scrolled',scrollY>8),{passive:true});${raw(lmsPickerJs)}${script ? raw(script) : ""}</script>
</body>
</html>`;
}

// Any [data-lms] link opens the university picker; each university's link then points at the same path on its LMS.
// Clicking a university follows its link (new tab) and closes the picker; so does clicking the backdrop.
const lmsPickerJs = `(function(){const d=document.getElementById('lms-pick');
document.addEventListener('click',e=>{const l=e.target.closest&&e.target.closest('[data-lms]');if(!l)return;e.preventDefault();
  d.querySelectorAll('a[data-base]').forEach(a=>a.href=a.dataset.base+l.dataset.lms);d.showModal()});
d.addEventListener('click',e=>{if(e.target===d||e.target.closest('a[data-base]'))d.close()})})();`;

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
