import { html, raw } from "hono/html";
import type { ConsentDescription } from "@cloudflare/workers-oauth-provider";
import { MARK, jsData, page, type View } from "./layout";
import { bookmarkletHref, connectScript } from "./bookmarklet";
import { strings, type Strings } from "./i18n";
import { universitiesFor, universityName } from "../universities";
import { DEFAULT_TTL, TTL_CHOICES } from "../accounts";

const mcpUrl = (env: Env) => `${env.PUBLIC_URL}/mcp`;
/** Moodle's "Security keys" page, where the student can reset or delete the app token at the LMS itself. */
const lmsTokenUrl = (env: Env) => `${env.LMS_URL.replace(/\/+$/, "")}/user/managetoken.php`;
/** Same in every language: step 3 tells users to click it, so it must match what their bookmarks bar shows. */
const BOOKMARK_NAME = `${MARK} Connect Mcp4Lms`;

/** AI tools shown in the hero rotation and the setup picker. Icons are the vendors' official marks. */
const TOOLS = [
  { id: "claude", name: "Claude" },
  { id: "chatgpt", name: "ChatGPT" },
  { id: "gemini", name: "Gemini" },
  { id: "cursor", name: "Cursor" },
] as const;

const rotateCss = `.rot{display:inline-block;position:relative;overflow:hidden;vertical-align:bottom;text-align:left;line-height:inherit}
.rot span{display:inline-block;transition:transform .45s cubic-bezier(.2,.7,.2,1),opacity .4s}
.rot .leave{position:absolute;left:0;top:0;transform:translateY(-105%);opacity:0}
.rot .enter{transform:translateY(105%);opacity:0}`;
// Each .rot element may carry its own forms of the names in data-forms (JSON, same order as TOOLS); otherwise the plain names.
const rotateJs = `const TN=${jsData(TOOLS.map((t) => t.name))};let ti=0;
setInterval(()=>{ti=(ti+1)%TN.length;document.querySelectorAll('.rot').forEach(r=>{const F=JSON.parse(r.dataset.forms||'null')||TN;const cur=r.querySelector('span:not(.leave)');const nx=document.createElement('span');nx.textContent=F[ti];nx.className='enter';r.appendChild(nx);
  if(cur)cur.classList.add('leave');requestAnimationFrame(()=>requestAnimationFrame(()=>nx.classList.remove('enter')));setTimeout(()=>cur&&cur.remove(),500)})},2600);`;
const rot = html`<span class="rot"><span>${TOOLS[0].name}</span></span>`;
/** Like `rot`, but cycles language-specific forms of the names (e.g. Turkish case suffixes), one per tool in TOOLS order. */
const rotForms = (forms: string[]) => html`<span class="rot" data-forms="${jsData(forms)}"><span>${forms[0]}</span></span>`;

/** Segmented control in the look of the AI-tool picker: a row of pill buttons, the chosen one filled. */
const segCss = `.seg{display:flex;gap:6px;flex-wrap:wrap}
.seg button{padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:#fff;font:inherit;font-size:.92rem;font-weight:560;cursor:pointer;color:var(--ink-2);transition:border-color .15s,color .15s,background .15s}
.seg button:hover{border-color:var(--ink-3)}
.seg button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}`;

const pickerCss = `.tools{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 18px}
.tools button{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:#fff;font:inherit;font-size:.92rem;font-weight:560;cursor:pointer;color:var(--ink-2);transition:border-color .15s,color .15s,background .15s}
.tools button img{width:18px;height:18px;display:block}
.tools button:hover{border-color:var(--ink-3)}
.tools button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}
.tools button[aria-pressed=true] img{filter:brightness(0) invert(1)}
.tools button[data-tool=gemini][aria-pressed=true] img{filter:none}
.howto{display:none}.howto.on{display:block}
.howto ol{padding-left:1.3em;margin:0}.howto li{margin:8px 0}
.howto .url{display:flex;gap:8px;align-items:center;margin:8px 0}
.howto .url code{flex:1;min-width:0;display:block;padding:10px 14px;font-size:.88rem;border-radius:12px;background:var(--surface);word-break:break-all}
.howto pre{margin:8px 0;padding:12px 14px;border-radius:12px;background:var(--surface);font:.85rem/1.5 var(--mono);overflow:auto}`;
const pickerJs = `(function(){const bs=document.querySelectorAll('.tools button'),hs=document.querySelectorAll('.howto');
function pick(id,remember){bs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===id)));hs.forEach(h=>h.classList.toggle('on',h.dataset.tool===id));if(remember)try{localStorage.setItem('m4l_tool',id)}catch(e){}}
bs.forEach(b=>b.addEventListener('click',()=>pick(b.dataset.tool,true)));let r='claude';try{r=localStorage.getItem('m4l_tool')||r}catch(e){}pick(r,false);
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copy(b.dataset.copy,b)))})();`;

const tutorialCss = `.tut{margin:0;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);box-shadow:var(--shadow);background:#000;position:relative;cursor:pointer}
.tut video{display:block;width:100%;height:auto}
.tut figcaption{position:absolute;left:12px;bottom:12px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.92);color:var(--ink);font-size:.82rem;font-weight:560;pointer-events:none}
.tut.paused::after{content:"▶";position:absolute;inset:0;display:grid;place-items:center;font-size:2.2rem;color:#fff;background:rgba(0,0,0,.25);pointer-events:none}`;
const tutorialJs = `(function(){const f=document.querySelector('.tut');if(!f)return;const v=f.querySelector('video');
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;if(still){v.removeAttribute('autoplay');f.classList.add('paused')}
f.addEventListener('click',()=>{if(v.paused){v.play();f.classList.remove('paused')}else{v.pause();f.classList.add('paused')}});
if('IntersectionObserver' in window&&!still)new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){if(!f.classList.contains('paused'))v.play()}else v.pause()}),{threshold:.3}).observe(f)})();`;
const videos = {
  tutorial: { src: "/tutorial.mp4", poster: "/tutorial-poster.jpg", width: 1280, height: 868 },
  demo: { src: "/demo.mp4", poster: "/demo-poster.jpg", width: 1280, height: 876 },
};
/** Muted, looping video with a poster frame: the setup walkthrough or the Claude demo (files in public/). */
function tutorial(t: Strings, kind: keyof typeof videos = "tutorial") {
  const v = videos[kind];
  return html`<figure class="tut" title="${t.tutorial.hint}">
    <video muted loop playsinline autoplay preload="metadata" poster="${v.poster}" width="${v.width}" height="${v.height}" style="aspect-ratio:${v.width}/${v.height}"><source src="${v.src}" type="video/mp4"></video>
    <figcaption>${kind === "demo" ? t.tutorial.demoCaption : t.tutorial.caption}</figcaption>
  </figure>`;
}

/** Segmented picker + per-tool instructions for adding the MCP URL. */
function toolPicker(v: View) {
  const t = strings[v.lang];
  const url = mcpUrl(v.env);
  const urlRow = html`<div class="url"><code>${url}</code><button class="btn ghost sm" type="button" data-copy="${url}">${t.copy}</button></div>`;
  const cursorDeeplink =
    "cursor://anysphere.cursor-deeplink/mcp/install?name=mcp4lms&config=" +
    btoa(JSON.stringify({ url }));
  return html`
    <div class="tools" role="group" aria-label="${t.picker.label}">
      ${TOOLS.map((x) => html`<button type="button" data-tool="${x.id}" aria-pressed="false"><img src="/icons/${x.id}.svg" alt="">${x.name}</button>`)}
    </div>
    <div class="howto" data-tool="claude">
      <ol>
        <li>${t.picker.claude.s1}</li>
        <li>${t.picker.claude.s2(urlRow)}</li>
        <li>${t.picker.claude.s3}</li>
      </ol>
      <p class="small faint" style="margin:12px 0 0">Claude Code: <code>claude mcp add --transport http mcp4lms ${url}</code></p>
    </div>
    <div class="howto" data-tool="chatgpt">
      <ol>
        <li>${t.picker.chatgpt.s1}</li>
        <li>${t.picker.chatgpt.s2(urlRow)}</li>
        <li>${t.picker.chatgpt.s3}</li>
      </ol>
    </div>
    <div class="howto" data-tool="gemini">
      <ol>
        <li>${t.picker.gemini.s1}
          <pre>gemini mcp add --transport http mcp4lms ${url}</pre></li>
        <li>${t.picker.gemini.s2}</li>
      </ol>
    </div>
    <div class="howto" data-tool="cursor">
      <p style="margin:0 0 10px"><a class="btn sm" href="${cursorDeeplink}">${t.picker.cursor.add}</a></p>
      <ol>
        <li>${t.picker.cursor.s1(urlRow)}</li>
        <li>${t.picker.cursor.s2}</li>
      </ol>
    </div>`;
}

const copyFn = (t: Strings) =>
  `async function copy(text,btn){await navigator.clipboard.writeText(text);const t=btn.textContent;btn.textContent=${jsData(t.copied)};setTimeout(()=>btn.textContent=t,1600)}`;

// --- Home --------------------------------------------------------------------

export function homePage(v: View) {
  const t = strings[v.lang];
  const script = `${copyFn(t)}
${rotateJs}
${pickerJs}
`;
  return page(v, {
    title: t.home.title,
    description: t.home.description,
    wide: true,
    script,
    body: html`
      <style>
        .hero{text-align:center;padding:24px 0 56px}
        .hero img{width:150px;height:auto;filter:drop-shadow(0 18px 24px rgba(0,0,0,.14))}
        .hero h1{margin-top:22px}
        .hero .lead{margin:0 auto 28px}
        ${raw(rotateCss)}
        ${raw(pickerCss)}
        .prompt{max-width:560px;margin:0 auto 64px;display:flex;align-items:center;gap:12px;padding:16px 18px 16px 22px;border:1px solid var(--line);border-radius:999px;box-shadow:var(--shadow);text-align:left;font-size:1.05rem}
        .prompt .mark{color:var(--ink-3);font-size:1.3rem;line-height:1}
        .prompt .t{flex:1;min-width:0}
        .prompt .go{flex:none;width:34px;height:34px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:1rem}
        .facts{display:flex;justify-content:center;flex-wrap:wrap;gap:8px 28px;margin:0 0 64px;color:var(--ink-2);font-size:.95rem}
        .facts span::before{content:"${MARK}";margin-right:8px;color:var(--ink-3);font-size:1.2em;-webkit-text-stroke:.4px currentColor}
        .have{max-width:640px;margin:0 auto}
        ${raw(tutorialCss)}
        .tut{max-width:760px;margin:0 auto 64px}
        @media (max-width:760px){.hero{padding-bottom:40px}.prompt{font-size:.95rem;margin-bottom:48px}.tut{margin-bottom:48px}}
      </style>
      <section class="hero">
        <img src="/flag.png" alt="" width="692" height="644">
        <h1>${t.home.h1(t.home.h1Forms ? rotForms(t.home.h1Forms) : rot)}</h1>
        <p class="lead">${t.home.lead(rot)}</p>
        <p class="row" style="justify-content:center;gap:12px"><a class="btn" href="/connect">${t.home.connectCta}</a><a class="btn ghost" href="#have">${t.home.haveKey}</a></p>
      </section>
      <div class="prompt" aria-hidden="true"><span class="mark">${MARK}</span><span class="t">${t.home.prompt}</span><span class="go">↑</span></div>

      ${tutorial(t, "demo")}

      <p class="facts">${t.home.facts.map((f) => html`<span>${f}</span>`)}</p>

      <section class="have card soft" id="have">
        <h2>${t.home.haveTitle}</h2>
        <p class="muted small" style="margin:0">${t.home.haveLead}</p>
        ${toolPicker(v)}
        <p class="small faint" style="margin:14px 0 0">${t.home.manage}</p>
      </section>`,
  });
}

// --- Connect (install the bookmark) -----------------------------------------

export function connectPage(v: View) {
  const { env, lang } = v;
  const t = strings[lang];
  const href = bookmarkletHref(env, lang);
  const host = new URL(env.PUBLIC_URL).host;
  const host_lms = new URL(env.LMS_URL).host;
  const unis = universitiesFor(env).map((u) => ({ ...u, name: universityName(u, lang) }));
  const script = `
const data=${jsData({ href, console: connectScript(env, lang) })};
const T=${jsData(t.connect.js)};
const isMac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
const isMobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)&&!/Macintosh/.test(navigator.userAgent);
document.querySelectorAll('.shortcut').forEach(e=>e.innerHTML=isMac?'<kbd>⌘</kbd> <kbd>Shift</kbd> <kbd>B</kbd>':'<kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>B</kbd>');
if(isMobile)document.getElementById('mobile').classList.remove('hidden');
const $=id=>document.getElementById(id);const bm=$('bm'),hint=$('hint'),slot=$('slot');
const unis=${jsData(unis.filter((u) => u.available).map((u) => ({ id: u.id, name: u.name, short: u.short })))};
function choose(id,remember){const u=unis.find(x=>x.id===id);if(!u)return;
  $('picker').classList.add('hidden');$('chosen').classList.remove('hidden');$('uni-name').textContent=u.name;$('uni-short').textContent=u.short;$('uni-aff').textContent=u.name;
  $('steps').classList.remove('hidden');if(remember)try{localStorage.setItem('m4l_uni',id)}catch(e){}}
document.querySelectorAll('.uni[data-id]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.id,true)));
$('change').addEventListener('click',e=>{e.preventDefault();$('chosen').classList.add('hidden');$('steps').classList.add('hidden');$('picker').classList.remove('hidden');try{localStorage.removeItem('m4l_uni')}catch(e){}});
try{const r=localStorage.getItem('m4l_uni');if(r)choose(r,false)}catch(e){}
const tb=document.querySelectorAll('#ttl button');
function pickTtl(s,remember){tb.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ttl===String(s))));if(remember)try{localStorage.setItem('m4l_ttl',String(s))}catch(e){}}
tb.forEach(b=>b.addEventListener('click',()=>pickTtl(b.dataset.ttl,true)));
let tt=${DEFAULT_TTL};try{const r=localStorage.getItem('m4l_ttl');if(r&&[...tb].some(b=>b.dataset.ttl===r))tt=r}catch(e){}pickTtl(tt,false);
const say=(t,cls)=>{hint.textContent=t;hint.className='hint'+(cls?' '+cls:'')};
bm.addEventListener('click',e=>{e.preventDefault();bm.classList.remove('shake');void bm.offsetWidth;bm.classList.add('shake');say(T.clickedHere,'warn')});
bm.addEventListener('dragstart',()=>{say(T.dragging);document.body.classList.add('dragging')});
bm.addEventListener('dragend',e=>{document.body.classList.remove('dragging');
  if(e.dataTransfer&&e.dataTransfer.dropEffect==='none'){say(T.notAdded,'warn');return}done()});
slot.addEventListener('dragover',e=>e.preventDefault());
slot.addEventListener('drop',e=>{e.preventDefault();say(T.picture,'warn')});
function done(){$('s1').classList.add('done');say(T.added,'ok');$('stage').classList.add('done');
  ['s2','s3'].forEach(i=>$(i).classList.remove('dim'));$('s2').scrollIntoView({behavior:'smooth',block:'center'})}
$('added').addEventListener('click',e=>{e.preventDefault();done()});
${copyFn(t)}
$('copy-bm').addEventListener('click',e=>copy(data.href,e.target));
$('copy-console').addEventListener('click',e=>copy(data.console,e.target));
`;
  return page(v, {
    title: t.connect.title,
    current: "/connect",
    script,
    body: html`
      <style>
        .uni{display:flex;align-items:center;gap:16px;width:100%;min-height:76px;text-align:left;padding:14px 16px 14px 14px;border:1.5px solid var(--line);border-radius:16px;background:#fff;color:var(--ink);font:inherit;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s}
        [role=listitem]+[role=listitem]{margin-top:10px}
        .uni:hover:not([disabled]){border-color:var(--ink);box-shadow:0 12px 24px -18px rgba(0,0,0,.45);transform:translateY(-1px)}
        .uni:focus-visible{outline:3px solid var(--ink);outline-offset:3px}
        .uni .logo,.chosen .logo{flex:none;width:48px;height:48px;border-radius:12px;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:700;font-size:.95rem;letter-spacing:-.01em}
        .uni .info{flex:1;min-width:0}
        .uni b{display:block;font-size:1.1rem;line-height:1.3}
        .uni small{display:block;color:var(--ink-2);font-size:.9rem;overflow-wrap:anywhere}
        .uni .go{flex:none;display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:999px;background:var(--ink);color:#fff;font-weight:600;font-size:.92rem}
        .uni[disabled]{cursor:not-allowed;background:var(--surface);border-style:dashed}
        .uni[disabled] .logo{background:var(--surface-2);color:var(--ink-2)}
        .uni .soon{flex:none;padding:5px 12px;border-radius:999px;background:var(--surface-2);color:var(--ink-2);font-size:.82rem;font-weight:560}
        @media (max-width:520px){.uni .go .lbl{display:none}.uni .go{padding:9px 12px}}
        @media (prefers-reduced-motion:reduce){.uni{transition:none}.uni:hover:not([disabled]){transform:none}}
        .chosen{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
        .chosen b{flex:1}
        .chosen .ttl{flex-basis:100%;margin-top:6px;padding-top:14px;border-top:1px solid var(--line)}
        .chosen .ttl label{display:block;font-size:.9rem;margin-bottom:8px}
        ${raw(segCss)}
        ${raw(tutorialCss)}
        .tut{margin:0 0 20px}
        .stage{position:relative;margin:6px 0 10px;text-align:center}
        .chrome{border:1px solid var(--line);border-radius:12px;overflow:hidden;text-align:left;box-shadow:var(--shadow);font:.78rem/1.2 var(--sans);color:#3c4043}
        .chrome .tabs{background:#dfe1e5;padding:8px 10px 0;display:flex;align-items:flex-end;gap:10px}
        .chrome .lights{display:flex;gap:6px;margin:0 6px 11px 2px}.chrome .lights i{width:10px;height:10px;border-radius:50%;display:block}
        .chrome .lights i:nth-child(1){background:#ff5f57}.chrome .lights i:nth-child(2){background:#febc2e}.chrome .lights i:nth-child(3){background:#28c840}
        .chrome .tab{background:#fff;border-radius:9px 9px 0 0;padding:8px 12px;display:flex;align-items:center;gap:8px;min-width:170px}
        .chrome .tab .fav{width:12px;height:12px;border-radius:50%;background:var(--ink);display:inline-block}
        .chrome .tab .x{margin-left:auto;color:#5f6368}
        .chrome .plus{color:#5f6368;font-size:1rem;margin-bottom:9px}
        .chrome .tools{background:#fff;display:flex;align-items:center;gap:14px;padding:7px 12px;color:#5f6368;font-size:.9rem}
        .chrome .omni{flex:1;background:#f1f3f4;border-radius:999px;padding:6px 12px;font-size:.78rem;color:#202124;display:flex;align-items:center;gap:8px}
        .chrome .omni .lock{color:#5f6368}
        .chrome .bbar{background:#fff;display:flex;align-items:center;gap:16px;padding:3px 12px 8px;white-space:nowrap;overflow:hidden}
        .chrome .bk{display:inline-flex;align-items:center;gap:6px}
        .chrome .bk .fav{width:13px;height:13px;border-radius:3px;display:inline-block}
        .chrome .apps .fav{background:conic-gradient(#ea4335 0 25%,#fbbc04 0 50%,#34a853 0 75%,#4285f4 0)}
        .chrome .sep{width:1px;height:14px;background:#dadce0}
        .chrome .slot{border:1.5px dashed #9aa0a6;border-radius:6px;padding:2px 8px;margin:-3px 0;color:#9aa0a6;transition:all .2s}
        .dragging .chrome .slot{border-color:var(--ink);color:var(--ink);background:#f1f3f4}
        .done .chrome .slot{border:1.5px solid transparent;color:#202124;background:#f1f3f4}
        .chrome .viewport{height:48px;background:linear-gradient(#f8f9fa,#fff)}
        .arrow{font-size:1.5rem;line-height:1;margin:14px 0 10px;color:var(--ink)}
        .done .arrow{visibility:hidden}
        .bm{display:inline-flex;align-items:center;gap:10px;padding:15px 26px;border-radius:999px;background:var(--ink);color:#fff;font-weight:600;font-size:1.05rem;text-decoration:none;cursor:grab;user-select:none;box-shadow:0 14px 30px -14px rgba(0,0,0,.6)}
        .bm:active{cursor:grabbing}
        .bm .mark{font-size:1.6rem;line-height:1;-webkit-text-stroke:.6px #fff}
        .shake{animation:shake .4s}
        @keyframes shake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
        .hint{font-weight:560;margin:16px 0 6px;min-height:1.5em}
        .hint.warn{color:var(--err)}.hint.ok{color:var(--ok)}
      </style>
      <h1>${t.connect.h1}</h1>
      <p class="lead">${t.connect.lead}</p>
      <p id="mobile" class="note hidden">${t.connect.mobile}</p>
      <div class="card" id="picker">
        <h2 id="pick-title">${t.connect.pickTitle}</h2>
        <p class="muted small">${t.connect.pickLead}</p>
        <div role="list" aria-labelledby="pick-title">
        ${unis.map(
          (u) => html`<div role="listitem"><button type="button" class="uni" ${u.available ? html`data-id="${u.id}"` : raw("disabled")}>
            <span class="logo" aria-hidden="true">${u.short}</span>
            <span class="info"><b>${u.name}</b><small>${new URL(u.lmsUrl).host}</small></span>
            ${u.available
              ? html`<span class="go"><span class="lbl">${t.connect.select}</span><span aria-hidden="true">→</span></span>`
              : html`<span class="soon">${t.connect.notAvailable}</span>`}</button></div>`,
        )}
        </div>
      </div>
      <div class="card soft chosen hidden" id="chosen">
        <span class="logo" id="uni-short" aria-hidden="true"></span>
        <b id="uni-name"></b>
        <a href="#" id="change" class="small muted">${t.connect.change}</a>
        <p class="small muted" style="flex-basis:100%;margin:4px 0 0">${t.connect.affiliation(html`<span id="uni-aff"></span>`)}</p>
        <div class="ttl">
          <label id="ttl-label">${t.ttl.label}</label>
          <div class="seg" id="ttl" role="group" aria-labelledby="ttl-label">
            ${TTL_CHOICES.map((s) => html`<button type="button" data-ttl="${s}" aria-pressed="false">${t.ttl.options[s]}</button>`)}
          </div>
          <p class="small faint" style="margin:8px 0 0">${t.ttl.hint}</p>
        </div>
      </div>

      <div style="margin-top:16px">${tutorial(t)}</div>

      <div class="steps hidden" id="steps" style="margin-top:16px">
      <div class="card step" id="s1"><div>
        <h2>${t.connect.step1}</h2>
        <p class="muted small">${t.connect.step1Lead}</p>
        <div class="stage" id="stage">
          <div class="chrome" aria-hidden="true">
            <div class="tabs"><span class="lights"><i></i><i></i><i></i></span><span class="tab"><span class="fav"></span>Mcp4Lms<span class="x">×</span></span><span class="plus">+</span></div>
            <div class="tools"><span>←</span><span>→</span><span>↻</span><span class="omni"><span class="lock">🔒</span>${host}/connect</span><span>⋮</span></div>
            <div class="bbar"><span class="bk apps"><span class="fav"></span>${t.connect.mockApps}</span><span class="sep"></span><span class="bk"><span class="fav" style="background:#ea4335"></span>Gmail</span><span class="bk"><span class="fav" style="background:#4285f4"></span>${t.connect.mockCalendar}</span><span class="slot" id="slot">${BOOKMARK_NAME}</span></div>
            <div class="viewport"></div>
          </div>
          <div class="arrow" aria-hidden="true">↑</div>
          <a id="bm" class="bm" href="${href}" draggable="true" title="${t.connect.dragTitle}"><span class="mark">${MARK}</span>Connect Mcp4Lms</a>
          <p class="hint" id="hint">${t.connect.hint}</p>
          <p class="small muted" style="margin:0">${t.connect.barHidden(html`<span class="shortcut"></span>`)} &nbsp;·&nbsp; <a href="#" id="added">${t.connect.added}</a></p>
        </div>
        <details><summary>${t.connect.byHand}</summary>
          <ol class="small">
            <li><button class="btn ghost sm" id="copy-bm" type="button">${t.connect.copyBookmark}</button></li>
            <li>${t.connect.byHand2}</li>
            <li>${t.connect.byHand3(BOOKMARK_NAME)}</li>
          </ol>
        </details>
        <details><summary>${t.connect.console}</summary>
          <ol class="small">
            <li><button class="btn ghost sm" id="copy-console" type="button">${t.connect.copyScript}</button></li>
            <li>${t.connect.console2(html`<a href="${env.LMS_URL}/my/" target="_blank" rel="noopener">${t.connect.yourLms}</a>`)}</li>
            <li>${t.connect.console3}</li>
          </ol>
          <p class="small faint">${t.connect.consoleTrust(host)}</p>
        </details>
      </div></div>

      <div class="card step dim" id="s2"><div>
        <h2>${t.connect.step2}</h2>
        <p class="muted small">${t.connect.step2Lead}</p>
        <a class="btn ghost sm" href="${env.LMS_URL}/my/" target="_blank" rel="noopener">${t.connect.open(host_lms)}</a>
      </div></div>

      <div class="card step dim" id="s3"><div>
        <h2>${t.connect.step3(BOOKMARK_NAME)}</h2>
        <p class="muted small" style="margin:0">${t.connect.step3Lead}</p>
      </div></div>
      </div>`,
  });
}

// --- Connect finish (after the bookmarklet) ----------------------------------

export function finishPage(v: View) {
  const t = strings[v.lang];
  const script = `
const T=${jsData(t.finish.js)};
const $=id=>document.getElementById(id);
const show=id=>{['working','failed','success'].forEach(x=>$(x).classList.toggle('hidden',x!==id))};
const params=new URLSearchParams(location.hash.slice(1));const c=params.get('c');
history.replaceState(null,'',location.pathname);
let key='';
async function run(){
  if(!c){show('failed');$('error').textContent=T.nothing;return}
  try{
    let ttl=null;try{ttl=Number(localStorage.getItem('m4l_ttl'))||null}catch(e){}
    const r=await fetch('/api/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({c,ttl})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||T.wrong);
    key=d.key;$('key').textContent=key;$('hello').textContent=d.name?T.connectedName.replace('{name}',d.name.split(' ')[0]):T.connected;
    if(d.expiresAt)$('expiry').textContent=T.expires.replace('{date}',new Date(d.expiresAt).toLocaleString(document.documentElement.lang,{dateStyle:'long',timeStyle:'short'}));
    if(d.replaced)$('replaced').classList.remove('hidden');
    let pending=null;try{pending=JSON.parse(localStorage.getItem('m4l_pending_auth')||'null')}catch(e){}
    if(pending&&Date.now()-pending.at<30*60*1000){$('continue').href=pending.url.split('#')[0]+'#key='+encodeURIComponent(key);$('pending').classList.remove('hidden');$('manual').classList.add('hidden')}
    show('success');
  }catch(e){show('failed');$('error').textContent=e.message}
}
${copyFn(t)}
$('copy-key').addEventListener('click',e=>copy(key,e.target));
$('download').addEventListener('click',()=>{const b=new Blob([T.fileHead+'\\n\\n'+key+'\\n\\n'+T.fileNote+'\\n'+T.fileLost.replace('{url}',location.origin+'/connect')+'\\n'],{type:'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='mcp4lms-key.txt';a.click()});
$('saved').addEventListener('change',e=>$('next').classList.toggle('dim',!e.target.checked));
$('continue').addEventListener('click',e=>{if(!$('saved').checked){e.preventDefault();$('saved').focus();$('save-warn').classList.remove('hidden')}});
${pickerJs}
run();
`;
  return page(v, {
    title: t.finish.title,
    script,
    body: html`
      <style>
        .spin{width:22px;height:22px;border:2px solid var(--line);border-top-color:var(--ink);border-radius:50%;animation:spin .8s linear infinite;display:inline-block;vertical-align:middle;margin-right:10px}
        @keyframes spin{to{transform:rotate(360deg)}}
        .keybox{font-size:1rem;border:1px solid var(--line);background:#fff}
        .check{display:flex;gap:10px;align-items:center;margin-top:16px;font-weight:560;cursor:pointer}
        .check input{width:18px;height:18px;accent-color:var(--ink)}
        ${raw(pickerCss)}
      </style>
      <div id="working"><h1><span class="spin" aria-hidden="true"></span>${t.finish.working}</h1><p class="lead">${t.finish.workingLead}</p></div>
      <div id="failed" class="hidden">
        <h1>${t.finish.failed}</h1>
        <p class="note err" id="error"></p>
        <p><a class="btn" href="/connect">${t.finish.retry}</a></p>
      </div>
      <div id="success" class="hidden">
        <h1 id="hello">${t.finish.connected}</h1>
        <p class="lead">${t.finish.lead}</p>
        <p id="replaced" class="note hidden">${t.finish.replaced}</p>
        <div class="card">
          <h2>${t.finish.keyTitle}</h2>
          <p class="muted small">${t.finish.keyLead}</p>
          <div class="keybox" id="key"></div>
          <div class="row" style="margin-top:14px">
            <button class="btn" id="copy-key" type="button">${t.finish.copyKey}</button>
            <button class="btn ghost" id="download" type="button">${t.finish.download}</button>
          </div>
          <label class="check"><input type="checkbox" id="saved"> ${t.finish.saved}</label>
          <p id="save-warn" class="note small hidden" style="margin-top:10px">${t.finish.saveFirst}</p>
          <p class="small faint" style="margin:12px 0 0">${t.finish.lost}</p>
          <p class="small faint" id="expiry" style="margin:4px 0 0"></p>
        </div>
        <div class="card soft dim" id="next">
          <div id="pending" class="hidden">
            <h2>${t.finish.backTitle}</h2>
            <p class="muted">${t.finish.backLead}</p>
            <a class="btn" id="continue" href="#">${t.finish.continue}</a>
          </div>
          <div id="manual">
            <h2>${t.finish.addTitle}</h2>
            ${toolPicker(v)}
            <p class="small faint" style="margin:12px 0 0">${t.finish.thenAsk(t.home.prompt)}</p>
          </div>
        </div>
      </div>`,
  });
}

// --- OAuth consent ------------------------------------------------------------

export function authorizePage(
  v: View,
  opts: { consent: ConsentDescription; handle: string; query: string; error?: string },
) {
  const t = strings[v.lang];
  const { consent, handle, query, error } = opts;
  const script = `
try{localStorage.setItem('m4l_pending_auth',JSON.stringify({url:location.href.split('#')[0],at:Date.now()}))}catch(e){}
const h=new URLSearchParams(location.hash.slice(1));const k=h.get('key');
if(k){document.getElementById('key').value=k;history.replaceState(null,'',location.pathname+location.search)}
document.querySelector('form').addEventListener('submit',e=>{if(e.submitter&&e.submitter.value==='approve')try{localStorage.removeItem('m4l_pending_auth')}catch(e){}});
`;
  return page(v, {
    title: t.authorize.title,
    script,
    body: html`
      <h1>${t.authorize.h1(html`<span style="white-space:nowrap">${consent.clientName}</span>`)}</h1>
      <p class="lead">${t.authorize.lead(consent.clientName)}</p>
      <div class="card">
        <form method="post" action="/authorize">
          <input type="hidden" name="handle" value="${handle}">
          <input type="hidden" name="query" value="${query}">
          <input type="text" name="username" value="Mcp4Lms" autocomplete="username" class="hidden" readonly>
          <label for="key">${t.authorize.keyLabel}</label>
          <p class="small muted" style="margin:2px 0 10px">${t.authorize.keyHint}</p>
          <input type="password" id="key" name="key" autocomplete="current-password" placeholder="m4l_…" required autofocus>
          ${error ? html`<p class="note err small" style="margin-top:12px">${error}</p>` : ""}
          <p class="small faint" style="margin:14px 0 18px">${t.authorize.redirect(consent.redirectHost)}
            ${consent.redirectIsLoopback ? html`<br>${t.authorize.loopback}` : ""}</p>
          <div class="row">
            <button class="btn" name="action" value="approve" type="submit">${t.authorize.approve}</button>
            <button class="btn ghost" name="action" value="deny" type="submit" formnovalidate>${t.authorize.cancel}</button>
          </div>
        </form>
      </div>
      <p class="small muted" style="margin-top:20px">${t.authorize.noKey}</p>`,
  });
}

/** Opens Moodle's Security keys page in a new tab, where the token can be reset at the LMS itself. */
const revokeLink = (v: View) =>
  html`<a class="btn ghost sm" href="${lmsTokenUrl(v.env)}" target="_blank" rel="noopener noreferrer">${strings[v.lang].account.revokeButton}</a>`;

/** After deleting the account: the token still works at the LMS until the student revokes it there. */
export function deletedPage(v: View) {
  const t = strings[v.lang].account;
  return page(v, {
    title: t.deletedTitle,
    body: html`<h1>${t.deletedTitle}</h1><p class="lead">${t.deleted}</p>
      <div class="card soft">
        <p class="muted" style="margin:0 0 12px">${t.deletedRevoke}</p>
        ${revokeLink(v)}
      </div>
      <p style="margin-top:24px"><a class="btn" href="/">${t.backHome}</a></p>`,
  });
}

export function messagePage(v: View, title: string, message: string, link?: { href: string; label: string }) {
  return page(v, {
    title,
    body: html`<h1>${title}</h1><p class="lead">${message}</p>${
      link ? html`<p><a class="btn" href="${link.href}">${link.label}</a></p>` : ""
    }`,
  });
}

// --- Account --------------------------------------------------------------------

export function accountLoginPage(v: View, error?: string) {
  const t = strings[v.lang];
  return page(v, {
    title: t.account.title,
    current: "/account",
    body: html`
      <h1>${t.account.title}</h1>
      <p class="lead">${t.account.lead}</p>
      <div class="card">
        <form method="post" action="/account">
          <input type="text" name="username" value="Mcp4Lms" autocomplete="username" class="hidden" readonly>
          <label for="key">${t.account.keyLabel}</label>
          <input type="password" id="key" name="key" autocomplete="current-password" placeholder="m4l_…" required style="margin:10px 0 14px">
          ${error ? html`<p class="note err small">${error}</p>` : ""}
          <button class="btn" type="submit">${t.account.continue}</button>
        </form>
      </div>
      <p class="small muted" style="margin-top:20px">${t.account.lostKey}</p>`,
  });
}

export function accountPage(
  v: View,
  opts: {
    key: string;
    name: string | null;
    createdAt: number;
    expiresAt: number;
    grants: { id: string; clientName: string; createdAt: number }[];
    notice?: string;
  },
) {
  const t = strings[v.lang];
  const { key, name, createdAt, expiresAt, grants, notice } = opts;
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return page(v, {
    title: t.account.title,
    current: "/account",
    body: html`
      <style>.app{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line);margin:0}.app:first-of-type{border-top:0;padding-top:0}
      ${raw(segCss)}</style>
      <h1>${t.account.title}</h1>
      ${notice ? html`<p class="note ok">${notice}</p>` : ""}
      <div class="card soft">
        <h2>${t.account.lmsTitle}</h2>
        <p class="muted" style="margin:0">${name ? t.account.connectedAs(name, day(createdAt)) : t.account.connectedOn(day(createdAt))}</p>
        <p class="muted" style="margin:6px 0 0">${t.account.expiresOn(day(expiresAt))}</p>
        <form method="post" action="/account/expiry" style="margin-top:14px">
          <input type="hidden" name="key" value="${key}">
          <p class="small muted" style="margin:0 0 8px">${t.account.expiryLead}</p>
          <div class="seg">${TTL_CHOICES.map((s) => html`<button type="submit" name="ttl" value="${s}">${t.ttl.options[s]}</button>`)}</div>
        </form>
      </div>
      <div class="card">
        <h2>${t.account.appsTitle}</h2>
        ${
          grants.length
            ? grants.map(
                (g) => html`<form method="post" action="/account/revoke" class="app">
                  <span><b>${g.clientName}</b> <span class="faint small">${t.account.since(day(g.createdAt * (g.createdAt < 1e12 ? 1000 : 1)))}</span></span>
                  <input type="hidden" name="key" value="${key}"><input type="hidden" name="grant" value="${g.id}">
                  <button class="btn ghost sm" type="submit">${t.account.disconnect}</button></form>`,
              )
            : html`<p class="muted" style="margin:0">${t.account.none}</p>`
        }
      </div>
      <div class="card">
        <h2>${t.account.deleteTitle}</h2>
        <p class="muted">${t.account.deleteLead}</p>
        <form method="post" action="/account/delete">
          <input type="hidden" name="key" value="${key}">
          <button class="btn danger" type="submit">${t.account.deleteButton}</button>
        </form>
        <p class="small muted" style="margin:18px 0 10px">${t.account.revokeLead}</p>
        ${revokeLink(v)}
      </div>`,
  });
}

// --- Privacy ---------------------------------------------------------------------

export function privacyPage(v: View) {
  const t = strings[v.lang];
  return page(v, {
    title: t.privacy.title,
    current: "/privacy",
    body: html`
      <style>
        .q{margin:36px 0 0}.q h2{margin-bottom:.4em}.q ul,.q ol{padding-left:1.2em;color:var(--ink-2)}.q li{margin:6px 0}.q p{color:var(--ink-2)}
        .crypto h3{font-size:1.05rem;font-weight:620;letter-spacing:-.01em;margin:26px 0 10px}
        .crypto ol{margin:0 0 4px}
        .diagram{margin:0 0 14px;background:var(--surface);border-radius:var(--r);padding:14px 10px}
        .diagram{overflow-x:auto;-webkit-overflow-scrolling:touch}.diagram img{display:block;width:100%;height:auto;min-width:520px}
        @media (min-width:600px){.diagram img{min-width:0}}
        .who{width:100%;border-collapse:separate;border-spacing:0;margin:28px 0 0;font-size:.95rem}
        .who caption{text-align:left;font-size:1.05rem;font-weight:620;letter-spacing:-.01em;margin-bottom:10px;color:var(--ink)}
        .who th,.who td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
        .who thead th{font-size:.78rem;font-weight:620;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);padding-top:0}
        .who tbody th{font-weight:600}
        .who td{text-align:right;white-space:nowrap}
        .who-note{display:block;font-weight:400;color:var(--ink-2);font-size:.9rem;margin-top:2px}
        .pill{display:inline-block;font-size:.78rem;font-weight:620;border-radius:999px;padding:3px 10px;line-height:1.5}
        .pill.yes{background:var(--ok-bg);color:var(--ok)}.pill.no{background:var(--surface-2);color:var(--ink-2)}.pill.mem{background:var(--warn-bg);color:#7a5200}.pill.lms{background:var(--surface-2);color:var(--ink-2)}
        .crypto details{margin-top:20px}.crypto details ul{margin-top:8px}
      </style>
      <h1>${t.privacy.title}</h1>
      <p class="lead">${t.privacy.lead}</p>
      <section class="q crypto"><h2>${t.privacy.cryptoTitle}</h2>
        <p>${t.privacy.cryptoLead}</p>
        <h3>${t.privacy.connectTitle}</h3>
        <figure class="diagram"><img src="/diagrams/connect-${v.lang}.svg" alt="${t.privacy.connectAlt}" loading="lazy"></figure>
        <ol>${t.privacy.connectPoints.map((s) => html`<li>${s}</li>`)}</ol>
        <h3>${t.privacy.requestTitle}</h3>
        <figure class="diagram"><img src="/diagrams/request-${v.lang}.svg" alt="${t.privacy.requestAlt}" loading="lazy"></figure>
        <ol>${t.privacy.requestPoints.map((s) => html`<li>${s}</li>`)}</ol>
        <table class="who">
          <caption>${t.privacy.whoTitle}</caption>
          <thead><tr><th scope="col">${t.privacy.whoCols.who}</th><th scope="col">${t.privacy.whoCols.can}</th></tr></thead>
          <tbody>
            ${t.privacy.who.map(
              (w) => html`<tr>
                <th scope="row">${w.who}<span class="who-note">${w.note}</span></th>
                <td><span class="pill ${w.kind}">${w.answer}</span></td>
              </tr>`,
            )}
          </tbody>
        </table>
        <details>
          <summary>${t.privacy.techTitle}</summary>
          <ul>${t.privacy.tech.map((s) => html`<li>${s}</li>`)}</ul>
        </details>
      </section>
      <section class="q"><h2>${t.privacy.storeTitle}</h2>
        <ul>${t.privacy.store.map((s) => html`<li>${s}</li>`)}</ul>
        <p>${t.privacy.storeNote}</p>
      </section>
      <section class="q"><h2>${t.privacy.neverTitle}</h2>
        <p>${t.privacy.never}</p>
      </section>
      <section class="q"><h2>${t.privacy.canTitle}</h2>
        <p>${t.privacy.can}</p>
      </section>
      <section class="q" id="lms-token"><h2>${t.privacy.tokenTitle}</h2>
        <p>${t.privacy.token}</p>
        <p>${t.privacy.tokenReset(lmsTokenUrl(v.env))}</p>
      </section>
      <section class="q"><h2>${t.privacy.knowTitle}</h2>
        <ul>
          ${t.privacy.know.map((s) => html`<li>${s}</li>`)}
          <li>${t.privacy.knowAccount}</li>
        </ul>
      </section>
      <section class="q" id="security"><h2>${t.privacy.securityTitle}</h2>
        ${t.privacy.security.map((p) => html`<p>${typeof p === "function" ? p(v.env.REPO_URL) : p}</p>`)}
      </section>
      <section class="q" id="opt-out"><h2>${t.privacy.optOutTitle}</h2>
        <ol>${t.privacy.optOut.map((s) => html`<li>${typeof s === "function" ? s(lmsTokenUrl(v.env)) : s}</li>`)}</ol>
      </section>
      <section class="q" id="disclaimer"><h2>${t.privacy.disclaimerTitle}</h2>
        ${t.privacy.disclaimer.map((p) => html`<p>${p}</p>`)}
      </section>`,
  });
}

export { raw };
