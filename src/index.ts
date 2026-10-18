import OAuthProvider, { getOAuthApi, type OAuthProviderOptions } from "@cloudflare/workers-oauth-provider";
import { purgeExpiredAccounts } from "./accounts";
import { purgeExpiredDownloadLinks } from "./downloads";
import app, { SCOPE } from "./app";
import { mcpApiHandler } from "./mcp";
import { rateLimit } from "./ratelimit";
import { strings } from "./web/i18n";

function options(env: Env): OAuthProviderOptions<Env> {
  return {
    apiRoute: "/mcp",
    apiHandler: mcpApiHandler,
    defaultHandler: app as unknown as ExportedHandler<Env>,
    authorizeEndpoint: "/authorize",
    tokenEndpoint: "/token",
    clientRegistrationEndpoint: "/register",
    scopesSupported: [SCOPE],
    accessTokenTTL: 3600,
    refreshTokenTTL: 90 * 24 * 3600,
    resourceMetadata: { resource: `${env.PUBLIC_URL}/mcp`, resource_name: "Mcp4Lms" },
  };
}

export default {
  async fetch(request, env, ctx) {
    // www.<host> → <host> (PUBLIC_URL), keeping path and query.
    const url = new URL(request.url);
    const canonical = new URL(env.PUBLIC_URL);
    if (url.hostname === `www.${canonical.hostname}`) {
      url.protocol = canonical.protocol;
      url.host = canonical.host;
      return Response.redirect(url.toString(), 301);
    }
    // Shut down: the university does not allow access to its LMS through third-party services.
    // No MCP calls, client registrations or token exchanges; the web pages explain why.
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/") || url.pathname === "/register" || url.pathname === "/token") {
      return new Response(`${strings.en.shutdown.mcp}\n${strings.tr.shutdown.mcp}\n${env.PUBLIC_URL}/connect\n`, {
        status: 410,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    // Before the OAuth library, so its own routes (/register, /token) are limited too.
    const limited = await rateLimit(request, env);
    if (limited) return limited;
    return new OAuthProvider<Env>(options(env)).fetch(request, env, ctx);
  },
  // Runs hourly (cron in wrangler.jsonc).
  async scheduled(_event, env) {
    const opts = options(env);
    await new OAuthProvider<Env>(opts).purgeExpiredData(env);
    // Accounts past the expiry their user chose: revoke every grant (which deletes the
    // per-grant encrypted copies of the LMS token) and drop the row.
    await purgeExpiredAccounts(env, getOAuthApi(opts, env));
    await purgeExpiredDownloadLinks(env);
  },
} satisfies ExportedHandler<Env>;
