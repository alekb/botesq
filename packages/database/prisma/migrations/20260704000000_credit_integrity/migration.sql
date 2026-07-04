-- Backstop for atomic credit deduction: the application already guards with a
-- conditional UPDATE, but the balance must never go negative even if a future
-- code path forgets the guard.
ALTER TABLE "operators" ADD CONSTRAINT "credit_balance_non_negative" CHECK ("credit_balance" >= 0);

-- The column has always stored cents; rename it to say so.
ALTER TABLE "payments" RENAME COLUMN "amount_usd" TO "amount_cents";
