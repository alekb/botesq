-- Session bearer tokens are secrets; store only their SHA-256 hash, mirroring
-- API-key handling. Existing sessions hold plaintext tokens that would never
-- match a hashed lookup, so clear them (sessions are short-lived — clients
-- simply re-authenticate).
DELETE FROM "sessions";

ALTER TABLE "sessions" RENAME COLUMN "token" TO "token_hash";

ALTER INDEX "sessions_token_key" RENAME TO "sessions_token_hash_key";
ALTER INDEX "sessions_token_idx" RENAME TO "sessions_token_hash_idx";
