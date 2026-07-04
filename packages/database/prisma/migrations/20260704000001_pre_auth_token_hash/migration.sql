-- Pre-auth tokens are bearer secrets that can contractually bind an operator;
-- store only their SHA-256 hash, mirroring API-key handling.
ALTER TABLE "operators" RENAME COLUMN "pre_auth_token" TO "pre_auth_token_hash";

-- Keep the unique index name in sync with the column so a replayed migration
-- reproduces schema.prisma exactly.
ALTER INDEX "operators_pre_auth_token_key" RENAME TO "operators_pre_auth_token_hash_key";

-- Any existing values are plaintext tokens, not hashes; clear them so
-- operators re-issue tokens under the hashed scheme.
UPDATE "operators" SET "pre_auth_token_hash" = NULL;
