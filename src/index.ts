import OAuthProvider from "@cloudflare/workers-oauth-provider";
import app, { SCOPE } from "./app";
import { mcpApiHandler } from "./mcp";

function provider(env: Env) {
  return new OAuthProvider<Env>({
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
  });
}

export default {
  fetch(request, env, ctx) {
    return provider(env).fetch(request, env, ctx);
  },
  async scheduled(_event, env) {
    await provider(env).purgeExpiredData(env);
  },
} satisfies ExportedHandler<Env>;
