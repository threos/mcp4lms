// Temporary download links for an LMS file in its original form.
//
// A link looks like `/dl/<id>.<secret>`. The secret is 32 random bytes that only the
// link holds. From it we derive (HKDF-SHA256) an AES-256-GCM key that encrypts the file
// url and the LMS token in D1 (`download_links`). The server stores neither the secret
// nor anything derived from it, so a row can't be decrypted without its link, and once
// the row is deleted (expiry, reconnect, revoke, account deletion) the link is useless,
// even to someone who later gets the database. The file itself is never stored: it is
// streamed from the LMS when the link is opened. The file name is left out of the link
// so it doesn't end up in browser history or logs.
import { b64urlDecode, b64urlEncode, randomId } from "./crypto";
import { lmsFileUrl } from "./files";

export const DOWNLOAD_TTL_MS = 15 * 60 * 1000;

const enc = new TextEncoder();
const dec = new TextDecoder();

async function linkKey(secret: Uint8Array, id: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode(id), info: enc.encode("mcp4lms/v1/download-link") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Binds the ciphertext to its row, so a row's columns can't be swapped or its expiry moved. */
const aad = (id: string, accountId: string, expiresAt: number) => enc.encode(`${id}|${accountId}|${expiresAt}`);

export async function createDownloadLink(
  env: Env,
  accountId: string,
  lmsToken: string,
  target: URL,
): Promise<{ url: string; expiresAt: string }> {
  const id = randomId(16);
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const expiresAt = Date.now() + DOWNLOAD_TTL_MS;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(id, accountId, expiresAt) },
    await linkKey(secret, id),
    enc.encode(JSON.stringify({ u: target.toString(), t: lmsToken })),
  );
  const data = new Uint8Array(iv.length + ct.byteLength);
  data.set(iv);
  data.set(new Uint8Array(ct), iv.length);
  await env.DB.prepare("INSERT INTO download_links (id, account_id, data, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, accountId, b64urlEncode(data), expiresAt)
    .run();
  return { url: `${env.PUBLIC_URL}/dl/${id}.${b64urlEncode(secret)}`, expiresAt: new Date(expiresAt).toISOString() };
}

/** The file a link points to, or null if the link is malformed, unknown, expired, or its account is no longer active. */
export async function openDownloadLink(env: Env, link: string): Promise<{ target: URL; token: string } | null> {
  const m = /^([0-9a-f]{32})\.([A-Za-z0-9_-]{43})$/.exec(link);
  if (!m) return null;
  const [, id, secretB64] = m;
  const row = await env.DB.prepare(
    "SELECT d.account_id, d.data, d.expires_at, a.expires_at AS account_expires_at FROM download_links d JOIN accounts a ON a.id = d.account_id WHERE d.id = ?",
  )
    .bind(id)
    .first<{ account_id: string; data: string; expires_at: number; account_expires_at: number | null }>();
  if (!row) return null;
  const now = Date.now();
  if (row.expires_at <= now || row.account_expires_at == null || row.account_expires_at <= now) {
    await env.DB.prepare("DELETE FROM download_links WHERE id = ?").bind(id).run();
    return null;
  }
  let payload: { u: string; t: string };
  try {
    const data = b64urlDecode(row.data);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: data.slice(0, 12), additionalData: aad(id, row.account_id, row.expires_at) },
      await linkKey(b64urlDecode(secretB64), id),
      data.slice(12),
    );
    payload = JSON.parse(dec.decode(pt));
  } catch {
    return null; // wrong secret
  }
  const target = lmsFileUrl(env.LMS_URL, payload.u);
  return target ? { target, token: payload.t } : null;
}

/** Ends every download link of an account (reconnect, grant revoked, account deleted). */
export async function deleteDownloadLinks(env: Env, accountId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM download_links WHERE account_id = ?").bind(accountId).run();
}

export async function purgeExpiredDownloadLinks(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM download_links WHERE expires_at <= ?").bind(Date.now()).run();
}
