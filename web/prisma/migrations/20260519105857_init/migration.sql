-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "near_account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "near_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relayed_transaction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "tx_hash" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gas_used" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "relayed_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relayer_key" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "encrypted_private_key" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "relayer_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_installation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "agent_url" TEXT NOT NULL,
    "encrypted_shared_key" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "key_fingerprint" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "install_intent_record" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_installation_id" TEXT NOT NULL,
    "marketplace_slug" TEXT NOT NULL,
    "marketplace_version" TEXT NOT NULL,
    "nonce_hash" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "redirect_url" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "install_intent_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "account_user_id_idx" ON "account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_id_account_id_key" ON "account"("provider_id", "account_id");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "near_account_user_id_idx" ON "near_account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "near_account_account_id_network_key" ON "near_account"("account_id", "network");

-- CreateIndex
CREATE INDEX "relayed_transaction_user_id_idx" ON "relayed_transaction"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "relayed_transaction_tx_hash_key" ON "relayed_transaction"("tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "relayer_key_network_key" ON "relayer_key"("network");

-- CreateIndex
CREATE INDEX "agent_installation_user_id_idx" ON "agent_installation"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_installation_user_id_agent_url_key" ON "agent_installation"("user_id", "agent_url");

-- CreateIndex
CREATE INDEX "install_intent_record_user_id_idx" ON "install_intent_record"("user_id");

-- CreateIndex
CREATE INDEX "install_intent_record_agent_installation_id_idx" ON "install_intent_record"("agent_installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "install_intent_record_nonce_hash_key" ON "install_intent_record"("nonce_hash");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "near_account" ADD CONSTRAINT "near_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relayed_transaction" ADD CONSTRAINT "relayed_transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_installation" ADD CONSTRAINT "agent_installation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "install_intent_record" ADD CONSTRAINT "install_intent_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "install_intent_record" ADD CONSTRAINT "install_intent_record_agent_installation_id_fkey" FOREIGN KEY ("agent_installation_id") REFERENCES "agent_installation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
