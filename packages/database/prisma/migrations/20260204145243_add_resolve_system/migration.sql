-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ResolveAgentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ResolveTransactionStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ResolveDisputeClaimType" AS ENUM ('NON_PERFORMANCE', 'PARTIAL_PERFORMANCE', 'QUALITY_ISSUE', 'PAYMENT_DISPUTE', 'MISREPRESENTATION', 'BREACH_OF_TERMS', 'OTHER');

-- CreateEnum
CREATE TYPE "ResolveDisputeStatus" AS ENUM ('FILED', 'AWAITING_RESPONSE', 'RESPONSE_RECEIVED', 'IN_ARBITRATION', 'RULED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ResolveDisputeRuling" AS ENUM ('CLAIMANT', 'RESPONDENT', 'SPLIT', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ResolveEvidenceSubmitter" AS ENUM ('CLAIMANT', 'RESPONDENT');

-- CreateEnum
CREATE TYPE "ResolveEvidenceType" AS ENUM ('TEXT_STATEMENT', 'COMMUNICATION_LOG', 'AGREEMENT_EXCERPT', 'TIMELINE', 'OTHER');

-- DropIndex
DROP INDEX "operator_sessions_operator_id_idx";

-- CreateTable
CREATE TABLE "attorney_sessions" (
    "id" TEXT NOT NULL,
    "attorney_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attorney_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "subtotal_credits" INTEGER NOT NULL,
    "subtotal_usd" INTEGER NOT NULL,
    "tax_usd" INTEGER NOT NULL DEFAULT 0,
    "total_usd" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdf_url" TEXT,
    "pdf_s3_key" TEXT,
    "sent_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_credits" INTEGER NOT NULL,
    "total_credits" INTEGER NOT NULL,
    "total_usd" INTEGER NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_sessions" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolve_agents" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "agent_identifier" TEXT NOT NULL,
    "display_name" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "trust_score" INTEGER NOT NULL DEFAULT 50,
    "total_transactions" INTEGER NOT NULL DEFAULT 0,
    "completed_transactions" INTEGER NOT NULL DEFAULT 0,
    "disputes_as_claimant" INTEGER NOT NULL DEFAULT 0,
    "disputes_as_respondent" INTEGER NOT NULL DEFAULT 0,
    "disputes_won" INTEGER NOT NULL DEFAULT 0,
    "disputes_lost" INTEGER NOT NULL DEFAULT 0,
    "disputes_this_month" INTEGER NOT NULL DEFAULT 0,
    "monthly_dispute_reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ResolveAgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolve_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolve_agent_trust_history" (
    "id" TEXT NOT NULL,
    "resolve_agent_id" TEXT NOT NULL,
    "previous_score" INTEGER NOT NULL,
    "new_score" INTEGER NOT NULL,
    "change_amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolve_agent_trust_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolve_transactions" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "proposer_agent_id" TEXT NOT NULL,
    "receiver_agent_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "terms" JSONB NOT NULL,
    "stated_value" INTEGER,
    "stated_value_currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "ResolveTransactionStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolve_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolve_disputes" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "claimant_agent_id" TEXT NOT NULL,
    "respondent_agent_id" TEXT NOT NULL,
    "claim_type" "ResolveDisputeClaimType" NOT NULL,
    "claim_summary" TEXT NOT NULL,
    "claim_details" TEXT,
    "requested_resolution" TEXT NOT NULL,
    "response_submitted_at" TIMESTAMP(3),
    "response_summary" TEXT,
    "response_details" TEXT,
    "response_deadline" TIMESTAMP(3) NOT NULL,
    "status" "ResolveDisputeStatus" NOT NULL DEFAULT 'FILED',
    "ruling" "ResolveDisputeRuling",
    "ruling_reasoning" TEXT,
    "ruling_details" JSONB,
    "ruled_at" TIMESTAMP(3),
    "claimant_score_change" INTEGER,
    "respondent_score_change" INTEGER,
    "stated_value" INTEGER,
    "credits_charged" INTEGER NOT NULL DEFAULT 0,
    "was_free" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolve_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolve_evidence" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "submitted_by" "ResolveEvidenceSubmitter" NOT NULL,
    "submitted_by_agent_id" TEXT NOT NULL,
    "evidence_type" "ResolveEvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolve_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attorney_sessions_token_key" ON "attorney_sessions"("token");

-- CreateIndex
CREATE INDEX "attorney_sessions_token_idx" ON "attorney_sessions"("token");

-- CreateIndex
CREATE INDEX "attorney_sessions_expires_at_idx" ON "attorney_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_operator_id_period_start_idx" ON "invoices"("operator_id", "period_start");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_sessions_token_key" ON "provider_sessions"("token");

-- CreateIndex
CREATE INDEX "provider_sessions_provider_id_idx" ON "provider_sessions"("provider_id");

-- CreateIndex
CREATE INDEX "provider_sessions_expires_at_idx" ON "provider_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "resolve_agents_external_id_key" ON "resolve_agents"("external_id");

-- CreateIndex
CREATE INDEX "resolve_agents_operator_id_status_idx" ON "resolve_agents"("operator_id", "status");

-- CreateIndex
CREATE INDEX "resolve_agents_trust_score_idx" ON "resolve_agents"("trust_score");

-- CreateIndex
CREATE UNIQUE INDEX "resolve_agents_operator_id_agent_identifier_key" ON "resolve_agents"("operator_id", "agent_identifier");

-- CreateIndex
CREATE INDEX "resolve_agent_trust_history_resolve_agent_id_created_at_idx" ON "resolve_agent_trust_history"("resolve_agent_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "resolve_transactions_external_id_key" ON "resolve_transactions"("external_id");

-- CreateIndex
CREATE INDEX "resolve_transactions_proposer_agent_id_status_idx" ON "resolve_transactions"("proposer_agent_id", "status");

-- CreateIndex
CREATE INDEX "resolve_transactions_receiver_agent_id_status_idx" ON "resolve_transactions"("receiver_agent_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "resolve_disputes_external_id_key" ON "resolve_disputes"("external_id");

-- CreateIndex
CREATE INDEX "resolve_disputes_transaction_id_idx" ON "resolve_disputes"("transaction_id");

-- CreateIndex
CREATE INDEX "resolve_disputes_claimant_agent_id_status_idx" ON "resolve_disputes"("claimant_agent_id", "status");

-- CreateIndex
CREATE INDEX "resolve_disputes_respondent_agent_id_status_idx" ON "resolve_disputes"("respondent_agent_id", "status");

-- CreateIndex
CREATE INDEX "resolve_evidence_dispute_id_submitted_by_idx" ON "resolve_evidence"("dispute_id", "submitted_by");

-- CreateIndex
CREATE INDEX "email_verification_tokens_operator_id_idx" ON "email_verification_tokens"("operator_id");

-- CreateIndex
CREATE INDEX "operator_sessions_token_idx" ON "operator_sessions"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_operator_id_idx" ON "password_reset_tokens"("operator_id");

-- AddForeignKey
ALTER TABLE "attorney_sessions" ADD CONSTRAINT "attorney_sessions_attorney_id_fkey" FOREIGN KEY ("attorney_id") REFERENCES "attorneys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_sessions" ADD CONSTRAINT "provider_sessions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_agent_trust_history" ADD CONSTRAINT "resolve_agent_trust_history_resolve_agent_id_fkey" FOREIGN KEY ("resolve_agent_id") REFERENCES "resolve_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_transactions" ADD CONSTRAINT "resolve_transactions_proposer_agent_id_fkey" FOREIGN KEY ("proposer_agent_id") REFERENCES "resolve_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_transactions" ADD CONSTRAINT "resolve_transactions_receiver_agent_id_fkey" FOREIGN KEY ("receiver_agent_id") REFERENCES "resolve_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_disputes" ADD CONSTRAINT "resolve_disputes_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "resolve_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_disputes" ADD CONSTRAINT "resolve_disputes_claimant_agent_id_fkey" FOREIGN KEY ("claimant_agent_id") REFERENCES "resolve_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_disputes" ADD CONSTRAINT "resolve_disputes_respondent_agent_id_fkey" FOREIGN KEY ("respondent_agent_id") REFERENCES "resolve_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolve_evidence" ADD CONSTRAINT "resolve_evidence_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "resolve_disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
