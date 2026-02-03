-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MatterType" AS ENUM ('CONTRACT_REVIEW', 'ENTITY_FORMATION', 'COMPLIANCE', 'IP_TRADEMARK', 'IP_COPYRIGHT', 'GENERAL_CONSULTATION', 'LITIGATION_CONSULTATION');

-- CreateEnum
CREATE TYPE "MatterStatus" AS ENUM ('PENDING_RETAINER', 'ACTIVE', 'ON_HOLD', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MatterUrgency" AS ENUM ('LOW', 'STANDARD', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('AGENT', 'OPERATOR', 'SYSTEM', 'AI', 'ATTORNEY');

-- CreateEnum
CREATE TYPE "RetainerStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "FeeArrangement" AS ENUM ('FLAT_FEE', 'HOURLY', 'CONTINGENT', 'HYBRID');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "DocumentAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('QUEUED', 'AI_PROCESSING', 'PENDING_REVIEW', 'IN_REVIEW', 'NEEDS_INFO', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsultationComplexity" AS ENUM ('SIMPLE', 'STANDARD', 'COMPLEX', 'URGENT');

-- CreateEnum
CREATE TYPE "AttorneyRole" AS ENUM ('ASSOCIATE', 'SENIOR', 'PARTNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AttorneyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'DEDUCTION', 'REFUND', 'ADJUSTMENT', 'PROMO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('OPERATOR', 'AGENT', 'ATTORNEY', 'ADMIN', 'SYSTEM', 'PROVIDER');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProviderServiceType" AS ENUM ('LEGAL_QA', 'DOCUMENT_REVIEW', 'CONSULTATION', 'CONTRACT_DRAFTING', 'ENTITY_FORMATION', 'TRADEMARK', 'LITIGATION');

-- CreateEnum
CREATE TYPE "PriceModel" AS ENUM ('FLAT', 'PER_PAGE', 'PER_HOUR', 'COMPLEXITY_BASED');

-- CreateEnum
CREATE TYPE "ProviderRequestStatus" AS ENUM ('PENDING', 'SENT_TO_PROVIDER', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "operators" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_type" TEXT,
    "jurisdiction" TEXT,
    "phone" TEXT,
    "billing_address" JSONB,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "tos_accepted_at" TIMESTAMP(3),
    "tos_version" TEXT,
    "credit_balance" INTEGER NOT NULL DEFAULT 0,
    "pre_auth_token" TEXT,
    "pre_auth_scope" JSONB,
    "pre_auth_max_credits" INTEGER,
    "stripe_customer_id" TEXT,
    "status" "OperatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "name" TEXT,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "identifier" TEXT,
    "metadata" JSONB,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matters" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "retainer_id" TEXT,
    "external_id" TEXT NOT NULL,
    "type" "MatterType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "urgency" "MatterUrgency" NOT NULL DEFAULT 'STANDARD',
    "status" "MatterStatus" NOT NULL DEFAULT 'PENDING_RETAINER',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matter_messages" (
    "id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matter_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matter_assignments" (
    "id" TEXT NOT NULL,
    "matter_id" TEXT NOT NULL,
    "attorney_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "time_spent_minutes" INTEGER,

    CONSTRAINT "matter_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retainers" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "fee_arrangement" "FeeArrangement" NOT NULL,
    "estimated_fee" INTEGER,
    "conflict_check" TEXT,
    "engagement_terms" TEXT NOT NULL,
    "status" "RetainerStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_at" TIMESTAMP(3),
    "accepted_by" TEXT,
    "signature_method" TEXT,
    "signature_ip" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "matter_id" TEXT,
    "external_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "page_count" INTEGER,
    "s3_key" TEXT NOT NULL,
    "s3_bucket" TEXT NOT NULL,
    "document_type" TEXT,
    "notes" TEXT,
    "analysis" JSONB,
    "analysis_status" "DocumentAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analyzed_at" TIMESTAMP(3),
    "confidence_score" DOUBLE PRECISION,
    "attorney_review_recommended" BOOLEAN NOT NULL DEFAULT false,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "matter_id" TEXT,
    "operator_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "context" TEXT,
    "jurisdiction" TEXT,
    "complexity" "ConsultationComplexity" NOT NULL DEFAULT 'STANDARD',
    "status" "ConsultationStatus" NOT NULL DEFAULT 'QUEUED',
    "ai_draft" TEXT,
    "ai_confidence" DOUBLE PRECISION,
    "ai_metadata" JSONB,
    "final_response" TEXT,
    "response_metadata" JSONB,
    "attorney_id" TEXT,
    "credits_charged" INTEGER NOT NULL DEFAULT 0,
    "sla_deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attorneys" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "bar_number" TEXT,
    "bar_state" TEXT,
    "role" "AttorneyRole" NOT NULL DEFAULT 'ASSOCIATE',
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "AttorneyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "attorneys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "amount_usd" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "webhook_url" TEXT,
    "webhook_secret" TEXT,
    "jurisdictions" TEXT[],
    "specialties" "MatterType"[],
    "service_types" "ProviderServiceType"[],
    "max_concurrent" INTEGER NOT NULL DEFAULT 10,
    "avg_response_mins" INTEGER,
    "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue_share_pct" INTEGER NOT NULL DEFAULT 70,
    "stripe_connect_id" TEXT,
    "status" "ProviderStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "verified_at" TIMESTAMP(3),
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_services" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "service_type" "ProviderServiceType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "base_price" INTEGER NOT NULL,
    "price_model" "PriceModel" NOT NULL DEFAULT 'FLAT',
    "price_per_unit" INTEGER,
    "max_concurrent" INTEGER NOT NULL DEFAULT 5,
    "current_load" INTEGER NOT NULL DEFAULT 0,
    "target_response_mins" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_requests" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "matter_id" TEXT,
    "consultation_id" TEXT,
    "external_id" TEXT NOT NULL,
    "service_type" "ProviderServiceType" NOT NULL,
    "status" "ProviderRequestStatus" NOT NULL DEFAULT 'PENDING',
    "request_payload" JSONB NOT NULL,
    "response_payload" JSONB,
    "response_at" TIMESTAMP(3),
    "routing_reason" TEXT,
    "credits_charged" INTEGER NOT NULL DEFAULT 0,
    "provider_earnings" INTEGER NOT NULL DEFAULT 0,
    "sla_deadline" TIMESTAMP(3),
    "sla_met" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_reviews" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "request_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_settlements" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_requests" INTEGER NOT NULL,
    "total_credits" INTEGER NOT NULL,
    "provider_share" INTEGER NOT NULL,
    "platform_share" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_transfer_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_provider_preferences" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "service_types" "ProviderServiceType"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_provider_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operators_email_key" ON "operators"("email");

-- CreateIndex
CREATE UNIQUE INDEX "operators_pre_auth_token_key" ON "operators"("pre_auth_token");

-- CreateIndex
CREATE UNIQUE INDEX "operators_stripe_customer_id_key" ON "operators"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "agents_operator_id_identifier_key" ON "agents"("operator_id", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "matters_retainer_id_key" ON "matters"("retainer_id");

-- CreateIndex
CREATE UNIQUE INDEX "matters_external_id_key" ON "matters"("external_id");

-- CreateIndex
CREATE INDEX "matters_operator_id_status_idx" ON "matters"("operator_id", "status");

-- CreateIndex
CREATE INDEX "matters_external_id_idx" ON "matters"("external_id");

-- CreateIndex
CREATE INDEX "matter_messages_matter_id_created_at_idx" ON "matter_messages"("matter_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "retainers_external_id_key" ON "retainers"("external_id");

-- CreateIndex
CREATE INDEX "retainers_operator_id_idx" ON "retainers"("operator_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_external_id_key" ON "documents"("external_id");

-- CreateIndex
CREATE INDEX "documents_operator_id_idx" ON "documents"("operator_id");

-- CreateIndex
CREATE INDEX "documents_matter_id_idx" ON "documents"("matter_id");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_external_id_key" ON "consultations"("external_id");

-- CreateIndex
CREATE INDEX "consultations_status_created_at_idx" ON "consultations"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "attorneys_email_key" ON "attorneys"("email");

-- CreateIndex
CREATE INDEX "credit_transactions_operator_id_created_at_idx" ON "credit_transactions"("operator_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_checkout_session_id_key" ON "payments"("stripe_checkout_session_id");

-- CreateIndex
CREATE INDEX "payments_operator_id_idx" ON "payments"("operator_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_actor_id_idx" ON "audit_logs"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "providers_external_id_key" ON "providers"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "providers_email_key" ON "providers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "providers_stripe_connect_id_key" ON "providers"("stripe_connect_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_services_provider_id_service_type_key" ON "provider_services"("provider_id", "service_type");

-- CreateIndex
CREATE UNIQUE INDEX "provider_requests_external_id_key" ON "provider_requests"("external_id");

-- CreateIndex
CREATE INDEX "provider_requests_provider_id_status_idx" ON "provider_requests"("provider_id", "status");

-- CreateIndex
CREATE INDEX "provider_requests_status_created_at_idx" ON "provider_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "provider_reviews_provider_id_idx" ON "provider_reviews"("provider_id");

-- CreateIndex
CREATE INDEX "provider_settlements_provider_id_period_start_idx" ON "provider_settlements"("provider_id", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "operator_provider_preferences_operator_id_provider_id_key" ON "operator_provider_preferences"("operator_id", "provider_id");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_retainer_id_fkey" FOREIGN KEY ("retainer_id") REFERENCES "retainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matter_messages" ADD CONSTRAINT "matter_messages_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matter_assignments" ADD CONSTRAINT "matter_assignments_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matter_assignments" ADD CONSTRAINT "matter_assignments_attorney_id_fkey" FOREIGN KEY ("attorney_id") REFERENCES "attorneys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retainers" ADD CONSTRAINT "retainers_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_matter_id_fkey" FOREIGN KEY ("matter_id") REFERENCES "matters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_attorney_id_fkey" FOREIGN KEY ("attorney_id") REFERENCES "attorneys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_requests" ADD CONSTRAINT "provider_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_settlements" ADD CONSTRAINT "provider_settlements_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_provider_preferences" ADD CONSTRAINT "operator_provider_preferences_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
