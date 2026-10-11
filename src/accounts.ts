// Accounts: one per LMS user. Stores only what is needed to check a user key
// and decrypt that user's LMS token with it.
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
}

export interface UnlockedAccount {
  id: string;
  lmsUrl: string;
  lmsUserId: number;
  lmsToken: string;
  createdAt: number;
}

/**
 * Create the account for an LMS user, or give an existing one a new key.
 * Issuing a new key invalidates the old key and revokes every OAuth grant,
 * so a lost key can always be replaced by connecting again.
 */
export async function upsertAccount(
  env: Env,
  oauth: OAuthHelpers,
  lmsUrl: string,
  lmsUserId: number,
  lmsToken: string,
): Promise<{ key: string; accountId: string; replaced: boolean }> {
  const existing = await env.DB.prepare("SELECT id FROM accounts WHERE lms_url = ? AND lms_user_id = ?")
    .bind(lmsUrl, lmsUserId)
    .first<{ id: string }>();

  const accountId = existing?.id ?? randomId();
  const { key, parsed } = newUserKey(accountId);
  const verifier = await keyVerifier(parsed);
  const ciphertext = await encryptToken(parsed, lmsToken);
  const now = Date.now();

  if (existing) {
    await env.DB.prepare(
      "UPDATE accounts SET key_verifier = ?, token_ciphertext = ?, updated_at = ? WHERE id = ?",
    )
      .bind(verifier, ciphertext, now, accountId)
      .run();
    await revokeAllGrants(oauth, accountId);
  } else {
    await env.DB.prepare(
      "INSERT INTO accounts (id, lms_url, lms_user_id, key_verifier, token_ciphertext, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(accountId, lmsUrl, lmsUserId, verifier, ciphertext, now, now)
      .run();
  }
  return { key, accountId, replaced: !!existing };
}

/** Check a user key and decrypt the LMS token. Returns null for any invalid key. */
export async function unlockAccount(env: Env, rawKey: string): Promise<UnlockedAccount | null> {
  const k = parseUserKey(rawKey);
  if (!k) return null;
  const row = await env.DB.prepare("SELECT * FROM accounts WHERE id = ?").bind(k.accountId).first<AccountRow>();
  if (!row || !(await verifyUserKey(k, row.key_verifier))) return null;
  return {
    id: row.id,
    lmsUrl: row.lms_url,
    lmsUserId: row.lms_user_id,
    lmsToken: await decryptToken(k as UserKey, row.token_ciphertext),
    createdAt: row.created_at,
  };
}

export async function deleteAccount(env: Env, oauth: OAuthHelpers, accountId: string): Promise<void> {
  await revokeAllGrants(oauth, accountId);
  await env.DB.prepare("DELETE FROM accounts WHERE id = ?").bind(accountId).run();
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
