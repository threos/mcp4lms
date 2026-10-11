import OAuthProvider, { getOAuthApi, type OAuthProviderOptions } from "@cloudflare/workers-oauth-provider";
import { purgeExpiredAccounts } from "./accounts";
import app, { SCOPE } from "./app";
import { mcpApiHandler } from "./mcp";

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
  fetch(request, env, ctx) {
    return new OAuthProvider<Env>(options(env)).fetch(request, env, ctx);
  },
  async scheduled(_event, env) {
    const opts = options(env);
    await new OAuthProvider<Env>(opts).purgeExpiredData(env);
    // Accounts past the expiry their user chose: revoke every grant (which deletes the
    // per-grant encrypted copies of the LMS token) and drop the row.
    await purgeExpiredAccounts(env, getOAuthApi(opts, env));
  },
} satisfies ExportedHandler<Env>;
