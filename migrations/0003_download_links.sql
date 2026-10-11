-- Temporary download links (default 15 minutes). The link holds a random secret
-- that the server never stores; `data` is AES-256-GCM(HKDF(secret), {file url,
-- LMS token}), so a row is useless without its link. Rows are deleted when they
-- expire (on use and by the daily cron) and whenever the account is reconnected,
-- has a grant revoked or is deleted.
CREATE TABLE download_links (
  id         TEXT PRIMARY KEY,                -- random, public (part of the link)
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  data       TEXT NOT NULL,                   -- base64url(iv || ct), AAD = id, account id, expiry
  expires_at INTEGER NOT NULL                 -- ms epoch
);
CREATE INDEX download_links_account ON download_links (account_id);
CREATE INDEX download_links_expires ON download_links (expires_at);
