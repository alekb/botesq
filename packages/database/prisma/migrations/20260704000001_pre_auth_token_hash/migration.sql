-- Pre-auth tokens are bearer secrets that can contractually bind an operator;
-- store only their SHA-256 hash, mirroring API-key handling.
ALTER TABLE "operators" RENAME COLUMN "pre_auth_token" TO "pre_auth_token_hash";

-- Any existing values are plaintext tokens, not hashes; clear them so
-- operators re-issue tokens under the hashed scheme.
UPDATE "operators" SET "pre_auth_token_hash" = NULL;
