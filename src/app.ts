// Web routes: landing page, connect flow, OAuth consent, account management.
import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import {
  deleteAccount,
  listGrants,
  normalizeTtl,
  setAccountExpiry,
  unlockAccount,
  upsertAccount,
  type UnlockedAccount,
} from "./accounts";
import { decryptConnectPayload, md5Hex, sha256Hex } from "./crypto";
import { deleteDownloadLinks, openDownloadLink } from "./downloads";
import { fetchFile, fileNameOf } from "./files";
import { MoodleClient, MoodleError, normalizeSiteUrl } from "./moodle";
import type { GrantProps } from "./mcp";
import { SECURITY_HEADERS, type View } from "./web/layout";
import { connectScript } from "./web/bookmarklet";
import { DEFAULT_LANG, isLang, langFromAcceptLanguage, strings, type Lang } from "./web/i18n";
import {
  accountLoginPage,
  accountPage,
  authorizePage,
  connectPage,
  deletedPage,
  finishPage,
  homePage,
  messagePage,
  privacyPage,
} from "./web/pages";

type Bindings = Env & { OAUTH_PROVIDER: OAuthHelpers };
type AppEnv = { Bindings: Bindings; Variables: { lang: Lang } };
type Ctx = Context<AppEnv>;
const app = new Hono<AppEnv>();

export const SCOPE = "lms.read";
const CONNECT_MAX_AGE_MS = 10 * 60 * 1000;
const LANG_COOKIE = "lang";

// Language: ?lang= wins (and is remembered in a cookie), then the cookie, then Accept-Language, then English.
app.use("*", async (c, next) => {
  const fromQuery = c.req.query(LANG_COOKIE);
  const fromCookie = getCookie(c, LANG_COOKIE);
  const lang: Lang = isLang(fromQuery)
    ? fromQuery
    : isLang(fromCookie)
      ? fromCookie
      : (langFromAcceptLanguage(c.req.header("Accept-Language")) ?? DEFAULT_LANG);
  c.set("lang", lang);
  await next();
  if (isLang(fromQuery) && fromQuery !== fromCookie) {
    setCookie(c, LANG_COOKIE, lang, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "Lax" });
  }
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!c.res.headers.has(k)) c.res.headers.set(k, v);
});

/** What the page renderers need from a request. `path` keeps the query string so the language toggle can preserve it. */
function view(c: Ctx, path?: string): View {
  const u = new URL(c.req.url);
  return { env: c.env, lang: c.get("lang"), path: path ?? u.pathname + u.search };
}
const t = (c: Ctx) => strings[c.get("lang")];

app.get("/", (c) => c.html(homePage(view(c))));
app.get("/privacy", (c) => c.html(privacyPage(view(c))));
// RFC 9116 security contact. "Expires" is required; it rolls forward so the file never goes stale.
app.get("/.well-known/security.txt", (c) => {
  const expires = new Date(Date.now() + 365 * 86400 * 1000).toISOString();
  const base = c.env.PUBLIC_URL;
  return c.text(
    [
      "Contact: mailto:security@mcp4lms.com",
      `Expires: ${expires}`,
      "Preferred-Languages: en, tr",
      `Canonical: ${base}/.well-known/security.txt`,
      `Policy: ${base}/privacy#security`,
      "",
    ].join("\n"),
    200,
    { "Content-Type": "text/plain; charset=utf-8" },
  );
});
app.get("/connect", (c) => c.html(connectPage(view(c))));
app.get("/connect/finish", (c) => c.html(finishPage(view(c))));
app.get("/connect.js", (c) =>
  c.text(connectScript(c.env, c.get("lang")), 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);

// --- Connect API: receives the encrypted token from the bookmarklet ----------

app.post("/api/connect", async (c) => {
  const env = c.env;
  const m = t(c).api;
  const origin = c.req.header("Origin");
  if (origin && origin !== new URL(env.PUBLIC_URL).origin) return c.json({ error: "Bad origin" }, 403);

  const body = await c.req.json<{ c?: string; ttl?: unknown }>().catch(() => ({}) as { c?: string; ttl?: unknown });
  if (!body.c || body.c.length > 1024) return c.json({ error: m.missing }, 400);
  const ttl = normalizeTtl(body.ttl); // one of the four allowed lifetimes; anything else is the 90-day default

  let payload;
  try {
    payload = await decryptConnectPayload(env.CONNECT_PRIVATE_KEY, body.c);
  } catch {
    return c.json({ error: m.invalid }, 400);
  }

  const age = Date.now() - payload.ts;
  if (age > CONNECT_MAX_AGE_MS || age < -2 * 60 * 1000) {
    return c.json({ error: m.expired }, 400);
  }
  if (!/^[0-9a-f]{32}$/.test(payload.t) || !/^[0-9a-f]{32}$/.test(payload.s) || payload.p.length > 100) {
    return c.json({ error: m.unexpected }, 400);
  }

  // Each connect payload works once.
  const nonceKey = `connect-nonce:${await sha256Hex(payload.p)}`;
  if (await env.OAUTH_KV.get(nonceKey)) return c.json({ error: m.used }, 400);
  await env.OAUTH_KV.put(nonceKey, "1", { expirationTtl: 3600 });

  let info;
  try {
    info = await new MoodleClient(env.LMS_URL, payload.t).siteInfo();
  } catch (e) {
    const msg = e instanceof MoodleError && e.isAuthError ? m.rejected : m.unreachable;
    return c.json({ error: `${msg} ${m.tryAgain}` }, 502);
  }
  if (normalizeSiteUrl(info.siteurl) !== normalizeSiteUrl(env.LMS_URL)) {
    return c.json({ error: m.otherSite }, 400);
  }
  // Moodle's launch "site id" is md5(wwwroot + passport): proves the token came from this launch.
  if ((await md5Hex(info.siteurl + payload.p)) !== payload.s) {
    return c.json({ error: m.unverified }, 400);
  }

  const { key, replaced, expiresAt } = await upsertAccount(
    env,
    env.OAUTH_PROVIDER,
    env.LMS_URL,
    info.userid,
    payload.t,
    ttl,
  );
  return c.json({ key, replaced, name: info.firstname || null, expiresAt });
});

// --- OAuth consent ------------------------------------------------------------

async function renderAuthorize(c: Ctx, query: string, error?: string) {
  const env = c.env;
  const oauth = env.OAUTH_PROVIDER;
  const authRequest = await oauth.parseAuthRequest(new Request(`${env.PUBLIC_URL}/authorize?${query}`));
  const consent = await oauth.describeConsent(authRequest);
  const tx = await oauth.beginConsent(authRequest);
  // The toggle must keep the OAuth request, also when re-rendering after a POST.
  const v = view(c, `/authorize?${query}`);
  const res = new Response(String(await authorizePage(v, { consent, handle: tx.handle, query, error })), {
    status: error ? 400 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  tx.headers.forEach((v, k) => res.headers.append(k, v));
  return res;
}

app.get("/authorize", async (c) => {
  try {
    return await renderAuthorize(c, new URL(c.req.url).search.slice(1));
  } catch (e) {
    const s = t(c).authorize;
    return c.html(messagePage(view(c), s.invalidTitle, s.invalid((e as Error).message)), 400);
  }
});

app.post("/authorize", async (c) => {
  const env = c.env;
  const s = t(c).authorize;
  const oauth = env.OAUTH_PROVIDER;
  const form = await c.req.formData();
  const handle = String(form.get("handle") ?? "");
  const query = String(form.get("query") ?? "");

  try {
    if (form.get("action") !== "approve") {
      const denied = await oauth.denyConsent(c.req.raw, handle);
      return new Response(null, { status: 302, headers: denied.headers });
    }

    const unlocked = await unlockAccount(env, String(form.get("key") ?? ""));
    if (!unlocked.ok) return renderAuthorize(c, query, unlocked.reason === "expired" ? s.keyExpired : s.wrongKey);
    const { account } = unlocked;

    try {
      await new MoodleClient(account.lmsUrl, account.lmsToken).siteInfo();
    } catch (e) {
      if (e instanceof MoodleError && e.isAuthError) {
        return renderAuthorize(c, query, s.expired);
      }
      throw e;
    }

    const approved = await oauth.approveConsent(c.req.raw, handle, { scope: [SCOPE] });
    const props: GrantProps = {
      accountId: account.id,
      lmsUrl: account.lmsUrl,
      lmsUserId: account.lmsUserId,
      lmsToken: account.lmsToken,
    };
    const { redirectTo } = await oauth.completeAuthorization({
      request: approved.request as AuthRequest,
      userId: account.id,
      scope: [SCOPE],
      metadata: { connectedAt: Date.now() },
      props,
    });
    const headers = new Headers(approved.headers);
    headers.set("Location", redirectTo);
    return new Response(null, { status: 302, headers });
  } catch (e) {
    return c.html(messagePage(view(c), s.failedTitle, s.failed((e as Error).message)), 400);
  }
});

// --- Account management ----------------------------------------------------------

async function renderAccount(
  c: Ctx,
  key: string,
  account: UnlockedAccount,
  notice?: Parameters<typeof accountPage>[1]["notice"],
  error?: string,
) {
  const env = c.env;
  let name: string | null = null;
  try {
    name = (await new MoodleClient(account.lmsUrl, account.lmsToken).siteInfo()).fullname;
  } catch {
    // LMS rejected or unreachable: still let the user manage and delete their data.
  }
  const grants = await listGrants(env.OAUTH_PROVIDER, account.id);
  return accountPage(view(c), {
    key,
    name,
    createdAt: account.createdAt,
    expiresAt: account.expiresAt,
    grants,
    notice,
    error,
  });
}

/** The login form again, saying whether the key was wrong or the connection has expired. */
const refuseAccount = (c: Ctx, reason: "invalid" | "expired") =>
  c.html(accountLoginPage(view(c), reason === "expired" ? t(c).account.keyExpired : t(c).account.wrongKey), 400);

// Temporary signed link from the MCP tools: streams one LMS file with the token added server-side.
app.get("/dl/:link", async (c) => {
  // Hono serves HEAD through GET routes. Links work once, so a HEAD (link previews, sandboxes
  // probing before they fetch) must not use one up: answer without even looking the link up.
  if (c.req.method === "HEAD") return c.body(null, 200, { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  const s = t(c).download;
  const link = await openDownloadLink(c.env, c.req.param("link"));
  if (!link) return c.html(messagePage(view(c), s.invalidTitle, s.invalid), 410);
  const res = await fetchFile(link.target, link.token).catch(() => null);
  const type = res?.headers.get("content-type") ?? "";
  const name = fileNameOf(link.target);
  // Moodle answers a token or permission problem with a JSON error instead of the file.
  if (!res?.ok || !res.body || (type.startsWith("application/json") && !name.toLowerCase().endsWith(".json"))) {
    return c.html(messagePage(view(c), s.failedTitle, s.failed), 502);
  }
  const headers = new Headers({
    "Content-Type": type || "application/octet-stream",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    "X-Robots-Tag": "noindex",
    "Cache-Control": "private, no-store",
  });
  const length = res.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(res.body, { headers });
});

app.get("/account", (c) => c.html(accountLoginPage(view(c))));

app.post("/account", async (c) => {
  const key = String((await c.req.formData()).get("key") ?? "");
  const u = await unlockAccount(c.env, key);
  if (!u.ok) return refuseAccount(c, u.reason);
  return c.html(await renderAccount(c, key, u.account));
});

app.post("/account/revoke", async (c) => {
  const form = await c.req.formData();
  const key = String(form.get("key") ?? "");
  const u = await unlockAccount(c.env, key);
  if (!u.ok) return refuseAccount(c, u.reason);
  await c.env.OAUTH_PROVIDER.revokeGrant(String(form.get("grant") ?? ""), u.account.id);
  // Links aren't tied to a grant, so revoking any grant ends all of the account's download links.
  await deleteDownloadLinks(c.env, u.account.id);
  return c.html(await renderAccount(c, key, u.account, t(c).account.revoked));
});

// Makes the same kind of read-only calls the MCP tools make, so a blocked or expired token shows up here.
app.post("/account/test", async (c) => {
  const key = String((await c.req.formData()).get("key") ?? "");
  const u = await unlockAccount(c.env, key);
  if (!u.ok) return refuseAccount(c, u.reason);
  const s = t(c).account;
  const client = new MoodleClient(u.account.lmsUrl, u.account.lmsToken);
  try {
    const info = await client.siteInfo();
    const courses = await client.call<unknown[]>("core_enrol_get_users_courses", { userid: info.userid });
    return c.html(await renderAccount(c, key, u.account, s.testOk(info.fullname, courses.length)));
  } catch (e) {
    const error =
      e instanceof MoodleError ? (e.isAuthError ? s.testAuthFailed : s.testLmsError(e.message)) : s.testUnreachable;
    return c.html(await renderAccount(c, key, u.account, undefined, error));
  }
});

// Only moves the expiry; the key, the stored token and the LMS are not touched.
app.post("/account/expiry", async (c) => {
  const form = await c.req.formData();
  const key = String(form.get("key") ?? "");
  const u = await unlockAccount(c.env, key);
  if (!u.ok) return refuseAccount(c, u.reason);
  const expiresAt = await setAccountExpiry(c.env, u.account.id, normalizeTtl(form.get("ttl")));
  return c.html(await renderAccount(c, key, { ...u.account, expiresAt }, t(c).account.expiryUpdated));
});

app.post("/account/delete", async (c) => {
  const key = String((await c.req.formData()).get("key") ?? "");
  const u = await unlockAccount(c.env, key);
  if (!u.ok) return refuseAccount(c, u.reason);
  await deleteAccount(c.env, c.env.OAUTH_PROVIDER, u.account.id);
  return c.html(deletedPage(view(c)));
});

app.notFound((c) => {
  const s = t(c).notFound;
  return c.html(messagePage(view(c), s.title, s.message, { href: "/", label: s.home }), 404);
});

export default app;
