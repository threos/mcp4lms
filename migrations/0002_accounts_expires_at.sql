-- When the stored LMS token stops being usable (ms epoch). The user picks the
-- lifetime when connecting (24 hours, 7 days, 30 days or 90 days; default 90)
-- and can change it on the account page. Expired accounts are refused and
-- deleted by the daily cron. Rows from before this column get the default,
-- counted from their last connect.
ALTER TABLE accounts ADD COLUMN expires_at INTEGER;
UPDATE accounts SET expires_at = updated_at + 90 * 86400 * 1000 WHERE expires_at IS NULL;
