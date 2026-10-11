// User keys, LMS token encryption and the connect-payload decryption.
//
// A user key looks like `m4l_<accountId>_<secret>`. The secret is 32 random
// bytes that only the user keeps. From it we derive (HKDF-SHA256):
//   - a verifier, stored in D1, to check the key on login;
//   - an AES-256-GCM key that encrypts the LMS token in D1.
// Without the user key, the stored token cannot be decrypted.

const enc = new TextEncoder();
const dec = new TextDecoder();

const KEY_PREFIX = "m4l";

export function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of u8) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomId(bytes = 10): string {
  // Lowercase hex: no "_" so it can sit between separators in the user key.
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

export interface UserKey {
  accountId: string;
  secret: Uint8Array;
}

export function newUserKey(accountId: string): { key: string; parsed: UserKey } {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  return { key: `${KEY_PREFIX}_${accountId}_${b64urlEncode(secret)}`, parsed: { accountId, secret } };
}

export function parseUserKey(raw: string): UserKey | null {
  const key = raw.trim();
  const m = /^m4l_([0-9a-f]{20})_([A-Za-z0-9_-]{43})$/.exec(key);
  if (!m) return null;
  const secret = b64urlDecode(m[2]);
  if (secret.length !== 32) return null;
  return { accountId: m[1], secret };
}

async function hkdf(secret: Uint8Array, salt: string, info: string): Promise<ArrayBuffer> {
  const base = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode(salt), info: enc.encode(info) },
    base,
    256,
  );
}

export async function keyVerifier(k: UserKey): Promise<string> {
  return toHex(await hkdf(k.secret, k.accountId, "mcp4lms/v1/verify"));
}

export async function verifyUserKey(k: UserKey, storedVerifier: string): Promise<boolean> {
  const a = enc.encode(await keyVerifier(k));
  const b = enc.encode(storedVerifier);
  if (a.length !== b.length) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

async function tokenKey(k: UserKey): Promise<CryptoKey> {
  const raw = await hkdf(k.secret, k.accountId, "mcp4lms/v1/lms-token");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(k: UserKey, token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: enc.encode(k.accountId) },
    await tokenKey(k),
    enc.encode(token),
  );
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), iv.length);
  return b64urlEncode(out);
}

export async function decryptToken(k: UserKey, stored: string): Promise<string> {
  const data = b64urlDecode(stored);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: data.slice(0, 12), additionalData: enc.encode(k.accountId) },
    await tokenKey(k),
    data.slice(12),
  );
  return dec.decode(pt);
}

export async function md5Hex(s: string): Promise<string> {
  // MD5 is supported by the Workers runtime; Moodle uses it for the launch "site id".
  return toHex(await crypto.subtle.digest("MD5", enc.encode(s)));
}

export async function sha256Hex(s: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

// --- Connect payload (bookmarklet -> server) --------------------------------
//
// The bookmarklet encrypts {s: siteId, t: token, p: passport, ts} with the
// server's RSA-OAEP public key, so the LMS token never appears in plain text
// in a URL, the browser history or the console.

export interface ConnectPayload {
  s: string; // md5(wwwroot + passport), from Moodle
  t: string; // LMS token
  p: string; // passport (one-time nonce chosen by the bookmarklet)
  ts: number; // ms since epoch, set by the bookmarklet
}

const RSA = { name: "RSA-OAEP", hash: "SHA-256" } as const;

function parsePrivateJwk(secret: string): JsonWebKey {
  let jwk: JsonWebKey;
  try {
    jwk = JSON.parse(secret);
  } catch {
    throw new Error("CONNECT_PRIVATE_KEY must be an RSA private JWK (run `npm run keys`).");
  }
  if (jwk.kty !== "RSA" || !jwk.d) throw new Error("CONNECT_PRIVATE_KEY is not an RSA private JWK.");
  return jwk;
}

export function connectPublicJwk(secret: string): JsonWebKey {
  const { kty, n, e } = parsePrivateJwk(secret);
  return { kty, n, e, alg: "RSA-OAEP-256", ext: true, key_ops: ["encrypt"] };
}

export async function decryptConnectPayload(secret: string, ciphertext: string): Promise<ConnectPayload> {
  const jwk = parsePrivateJwk(secret);
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, d: jwk.d, p: jwk.p, q: jwk.q, dp: jwk.dp, dq: jwk.dq, qi: jwk.qi, alg: "RSA-OAEP-256" },
    RSA,
    false,
    ["decrypt"],
  );
  const pt = await crypto.subtle.decrypt(RSA, key, b64urlDecode(ciphertext));
  const obj = JSON.parse(dec.decode(pt));
  if (
    typeof obj?.s !== "string" ||
    typeof obj?.t !== "string" ||
    typeof obj?.p !== "string" ||
    typeof obj?.ts !== "number"
  ) {
    throw new Error("Malformed connect payload");
  }
  return obj as ConnectPayload;
}
