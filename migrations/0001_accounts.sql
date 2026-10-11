-- One row per connected LMS user. The LMS token is encrypted with a key
-- derived from the user's secret key, which the server never stores.
CREATE TABLE accounts (
  id               TEXT PRIMARY KEY,          -- public account id (part of the user key)
  lms_url          TEXT NOT NULL,
  lms_user_id      INTEGER NOT NULL,
  key_verifier     TEXT NOT NULL,             -- HKDF(secret, "verify"), hex
  token_ciphertext TEXT NOT NULL,             -- AES-256-GCM(HKDF(secret, "token"), lms token), base64url(iv || ct)
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  UNIQUE (lms_url, lms_user_id)
);
