// Recognizes where an OAuth consent will send the user's access, so the consent page can warn
// about apps we don't know. Nothing is blocked: unknown redirects only get a prominent warning.
import type { ConsentDescription } from "@cloudflare/workers-oauth-provider";

/** Web hosts of well-known MCP clients. A host matches itself and its subdomains (exact suffix with a dot). */
const KNOWN_HOSTS = [
  "claude.ai",
  "claude.com",
  "anthropic.com",
  "chatgpt.com",
  "openai.com",
  "gemini.google.com", // not all of google.com
  "vscode.dev",
  "insiders.vscode.dev",
];

/** Private-use URL schemes of desktop apps; the OS hands these to the installed app. */
const KNOWN_SCHEMES = ["vscode:", "vscode-insiders:", "cursor:"];

/** Names that only the matching vendor's clients should use. Checked case-insensitively against the client name. */
const BRANDS: [needle: string, name: string][] = [
  ["claude", "Claude"],
  ["anthropic", "Anthropic"],
  ["chatgpt", "ChatGPT"],
  ["openai", "OpenAI"],
  ["codex", "Codex"],
  ["gemini", "Gemini"],
];

export interface RedirectTrust {
  /** The redirect goes to a loopback app, a known web host or a known desktop app scheme. */
  known: boolean;
  /** Where the access goes, for display: the hostname for http(s), `scheme://host` (or the whole URI) otherwise. */
  host: string;
  /** For an unknown redirect whose client name claims a known brand: that brand. Likely phishing. */
  brand: string | null;
}

const normalizeHost = (h: string) => h.toLowerCase().replace(/\.+$/, "");

export function classifyRedirect(
  consent: Pick<ConsentDescription, "clientName" | "redirectUri" | "redirectHost" | "redirectIsLoopback">,
): RedirectTrust {
  const host = normalizeHost(consent.redirectHost);
  let protocol = "";
  try {
    protocol = new URL(consent.redirectUri).protocol.toLowerCase();
  } catch {
    // Unparseable: treated as unknown.
  }
  const web = protocol === "https:" || protocol === "http:";
  const known =
    (web && consent.redirectIsLoopback) ||
    (protocol === "https:" && KNOWN_HOSTS.some((k) => host === k || host.endsWith(`.${k}`))) ||
    KNOWN_SCHEMES.includes(protocol);

  // describeConsent gives a custom scheme's host without the scheme ("cursor://x" -> "x"), or the whole URI when there is no host.
  const display =
    consent.redirectHost === consent.redirectUri ? consent.redirectUri : web || !protocol ? host : `${protocol}//${host}`;

  const name = consent.clientName.toLowerCase();
  const brand = known ? null : (BRANDS.find(([needle]) => name.includes(needle))?.[1] ?? null);
  return { known, host: display, brand };
}
