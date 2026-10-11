// Per-IP rate limits for the endpoints that cost something (KV/D1 writes, outbound LMS calls)
// or take a secret (user key, download link). Runs before the OAuth library, so it also covers
// the routes the library owns (/register, /token). Workers rate limits are counted per
// Cloudflare location and are approximate, which is fine for abuse protection.
//
// Limits are per IP, and many users can share one: students behind a campus NAT, and Claude's
// servers, which call /register and /token for every claude.ai user. So the limits stay
// generous enough for those, and /mcp is not limited by IP at all (it needs a valid OAuth token
// and each call only spends the caller's own LMS token).

type Rule = {
  /** Counter key prefix, so counters stay apart even if two rules share a binding. */
  id: string;
  methods: string[];
  match: (path: string) => boolean;
  limiter: (env: Env) => RateLimit;
  /** Error body: plain text for pages, the app's `{ error }` for /api/connect (the connect page
   * shows it), and an OAuth-style error for the library's endpoints. */
  body: "text" | "json" | "oauth";
};

const RULES: Rule[] = [
  // Each call is an RSA decrypt, a KV nonce write and a call to the LMS; the RSA key is public,
  // so anyone can craft payloads.
  { id: "connect", methods: ["POST"], match: (p) => p === "/api/connect", limiter: (e) => e.RL_CONNECT, body: "json" },
  // Dynamic client registration writes a client to KV.
  { id: "register", methods: ["POST"], match: (p) => p === "/register", limiter: (e) => e.RL_REGISTER, body: "oauth" },
  { id: "token", methods: ["POST"], match: (p) => p === "/token", limiter: (e) => e.RL_TOKEN, body: "oauth" },
  // Forms that take a user key.
  {
    id: "key",
    methods: ["POST"],
    match: (p) => p === "/authorize" || p === "/account" || p.startsWith("/account/"),
    limiter: (e) => e.RL_KEY,
    body: "text",
  },
  { id: "dl", methods: ["GET", "HEAD"], match: (p) => p.startsWith("/dl/"), limiter: (e) => e.RL_DOWNLOAD, body: "text" },
];

/** Matches the longest `period` in wrangler.jsonc; the binding doesn't say when the window resets. */
const RETRY_AFTER_S = 60;

/** A 429 response if the request is over its limit, otherwise null. */
export async function rateLimit(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const rule = RULES.find((r) => r.methods.includes(request.method) && r.match(path));
  if (!rule) return null;
  // Always set by Cloudflare in production; missing only in some local setups.
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const { success } = await rule.limiter(env).limit({ key: `${rule.id}:${ip}` });
  if (success) return null;
  const headers = { "Retry-After": String(RETRY_AFTER_S), "Cache-Control": "no-store" };
  const msg = "Too many requests. Try again in a minute.";
  if (rule.body === "text") return new Response(msg, { status: 429, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
  const body = rule.body === "oauth" ? { error: "rate_limited", error_description: msg } : { error: msg };
  return Response.json(body, { status: 429, headers });
}
