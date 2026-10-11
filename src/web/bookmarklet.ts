// The connect script. It runs on the LMS page (as a bookmarklet or pasted in
// the console), where the student is already logged in:
//   1. asks Moodle's mobile launch page for a token (confirmed=1 returns an
//      HTML page with the moodlemobile://token=… link instead of redirecting);
//   2. encrypts {siteId, token, passport, timestamp} with the server's RSA
//      public key;
//   3. opens <PUBLIC_URL>/connect/finish#c=<ciphertext>.
// Only ciphertext leaves the page, and only in the URL fragment, which is
// never sent to any server.
import { connectPublicJwk } from "../crypto";
import { DEFAULT_LANG, strings, type Lang } from "./i18n";

export function connectScript(env: Env, lang: Lang = DEFAULT_LANG): string {
  const jwk = connectPublicJwk(env.CONNECT_PRIVATE_KEY);
  const host = new URL(env.LMS_URL).host;
  const t = strings[lang].bookmarklet;
  // Dialog texts are baked in (the script runs on the LMS page, without our cookies).
  const cfg = JSON.stringify({
    S: env.LMS_URL.replace(/\/+$/, ""),
    A: env.PUBLIC_URL,
    K: jwk,
    M: { w: t.wrongSite.replace("{host}", host), l: t.login },
  });
  return `(async()=>{const{S,A,K,M}=${cfg};
if(location.origin!==new URL(S).origin){if(confirm(M.w))location.href=S+"/my/";return}
const p=crypto.randomUUID();let h;
try{const r=await fetch(S+"/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport="+p+"&urlscheme=moodlemobile&confirmed=1",{credentials:"include"});
h=new DOMParser().parseFromString(await r.text(),"text/html").querySelector("#launchapp")?.getAttribute("href")}catch(e){}
if(!h||!h.includes("token=")){alert(M.l);location.href=S+"/login/index.php";return}
const[s,t]=atob(h.split("token=")[1]).split(":::");
const k=await crypto.subtle.importKey("jwk",K,{name:"RSA-OAEP",hash:"SHA-256"},false,["encrypt"]);
const c=new Uint8Array(await crypto.subtle.encrypt({name:"RSA-OAEP"},k,new TextEncoder().encode(JSON.stringify({s,t,p,ts:Date.now()}))));
location.href=A+"/connect/finish#c="+btoa(String.fromCharCode(...c)).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"")})();`;
}

export function bookmarkletHref(env: Env, lang: Lang = DEFAULT_LANG): string {
  return "javascript:" + encodeURIComponent(connectScript(env, lang).replace(/\n/g, ""));
}
