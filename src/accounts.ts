// Accounts: one per LMS user. Stores only what is needed to check a user key
// and decrypt that user's LMS token with it, plus when that token stops being
// usable (chosen by the user).
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import {
  decryptToken,
  encryptToken,
  keyVerifier,
  newUserKey,
  parseUserKey,
  randomId,
  verifyUserKey,
  type UserKey,
} from "./crypto";

interface AccountRow {
  id: string;
  lms_url: string;
  lms_user_id: number;
  key_verifier: string;
  token_ciphertext: string;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
}

export interface UnlockedAccount {
  id: string;
  lmsUrl: string;
  lmsUserId: number;
  lmsToken: string;
  createdAt: number;
  expiresAt: number;
}

/** Lifetimes a user can give the stored token, in seconds: 24 hours, 7, 30 and 90 days (literals so the type is a union). */
export const TTL_CHOICES = [86400, 604800, 2592000, 7776000] as const;
export type Ttl = (typeof TTL_CHOICES)[number];
export const DEFAULT_TTL: Ttl = 7776000;

/** Coerces a user-supplied value (JSON number or form string) to an allowed lifetime; anything else is the default. */
export function normalizeTtl(x: unknown): Ttl {
  const n = typeof x === "string" ? Number(x) : x;
  return (TTL_CHOICES as readonly unknown[]).includes(n) ? (n as Ttl) : DEFAULT_TTL;
}

/** A missing expiry counts as expired, so a row can never outlive the feature by accident. */
export const isExpired = (expiresAt: number | null | undefined, now = Date.now()): boolean =>
  expiresAt == null || expiresAt <= now;

/**
 * Create the account for an LMS user, or give an existing one a new key.
 * Issuing a new key invalidates the old key and revokes every OAuth grant,
 * so a lost key can always be replaced by connecting again. The expiry is
 * always set fresh from `ttlSeconds`.
 */
export async function upsertAccount(
  env: Env,
  oauth: OAuthHelpers,
  lmsUrl: string,
  lmsUserId: number,
  lmsToken: string,
  ttlSeconds: Ttl,
): Promise<{ key: string; accountId: string; replaced: boolean; expiresAt: number }> {
  const existing = await env.DB.prepare("SELECT id FROM accounts WHERE lms_url = ? AND lms_user_id = ?")
    .bind(lmsUrl, lmsUserId)
    .first<{ id: string }>();

  const accountId = existing?.id ?? randomId();
  const { key, parsed } = newUserKey(accountId);
  const verifier = await keyVerifier(parsed);
  const ciphertext = await encryptToken(parsed, lmsToken);
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

  if (existing) {
    await env.DB.prepare(
      "UPDATE accounts SET key_verifier = ?, token_ciphertext = ?, updated_at = ?, expires_at = ? WHERE id = ?",
    )
      .bind(verifier, ciphertext, now, expiresAt, accountId)
      .run();
    await revokeAllGrants(oauth, accountId);
  } else {
    await env.DB.prepare(
      "INSERT INTO accounts (id, lms_url, lms_user_id, key_verifier, token_ciphertext, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(accountId, lmsUrl, lmsUserId, verifier, ciphertext, now, now, expiresAt)
      .run();
  }
  return { key, accountId, replaced: !!existing, expiresAt };
}

export type UnlockResult =
  | { ok: true; account: UnlockedAccount }
  | { ok: false; reason: "invalid" | "expired" };

/**
 * Check a user key and decrypt the LMS token. A wrong or malformed key is
 * "invalid"; a right key whose connection has passed its expiry is "expired"
 * (the token is not decrypted in that case).
 */
export async function unlockAccount(env: Env, rawKey: string): Promise<UnlockResult> {
  const k = parseUserKey(rawKey);
  if (!k) return { ok: false, reason: "invalid" };
  const row = await env.DB.prepare("SELECT * FROM accounts WHERE id = ?").bind(k.accountId).first<AccountRow>();
  if (!row || !(await verifyUserKey(k, row.key_verifier))) return { ok: false, reason: "invalid" };
  if (row.expires_at == null || row.expires_at <= Date.now()) return { ok: false, reason: "expired" };
  return {
    ok: true,
    account: {
      id: row.id,
      lmsUrl: row.lms_url,
      lmsUserId: row.lms_user_id,
      lmsToken: await decryptToken(k as UserKey, row.token_ciphertext),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    },
  };
}

/** Sets a new expiry, counted from now. Touches nothing else: no key change, no LMS call. */
export async function setAccountExpiry(env: Env, accountId: string, ttlSeconds: Ttl): Promise<number> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  await env.DB.prepare("UPDATE accounts SET expires_at = ? WHERE id = ?").bind(expiresAt, accountId).run();
  return expiresAt;
}

/** The account's expiry, or null when the row is missing (deleted) or has none. One indexed lookup. */
export async function accountExpiresAt(env: Env, accountId: string): Promise<number | null> {
  const row = await env.DB.prepare("SELECT expires_at FROM accounts WHERE id = ?")
    .bind(accountId)
    .first<{ expires_at: number | null }>();
  return row?.expires_at ?? null;
}

export async function deleteAccount(env: Env, oauth: OAuthHelpers, accountId: string): Promise<void> {
  await revokeAllGrants(oauth, accountId);
  await env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(accountId).run();
}

/**
 * Deletes every account past its expiry. Revoking the grants first is what
 * removes the per-grant encrypted copies of the LMS token from KV.
 * Returns how many accounts were removed.
 */
export async function purgeExpiredAccounts(env: Env, oauth: OAuthHelpers): Promise<number> {
  const { results } = await env.DB.prepare("SELECT id FROM accounts WHERE expires_at IS NULL OR expires_at <= ?")
    .bind(Date.now())
    .all<{ id: string }>();
  for (const { id } of results) await deleteAccount(env, oauth, id);
  return results.length;
}

export async function listGrants(oauth: OAuthHelpers, accountId: string) {
  const out: { id: string; clientId: string; clientName: string; createdAt: number }[] = [];
  let cursor: string | undefined;
  do {
    const page = await oauth.listUserGrants(accountId, { cursor });
    for (const g of page.items) {
      const client = await oauth.lookupClient(g.clientId).catch(() => null);
      out.push({
        id: g.id,
        clientId: g.clientId,
        clientName: client?.clientName ?? g.clientId,
        createdAt: g.createdAt,
      });
    }
    cursor = page.cursor;
  } while (cursor);
  return out;
}

export async function revokeAllGrants(oauth: OAuthHelpers, accountId: string): Promise<void> {
  for (const g of await listGrants(oauth, accountId)) await oauth.revokeGrant(g.id, accountId);
}
