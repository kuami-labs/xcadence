-- CreateTable
CREATE TABLE "summary_recipients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "unsubscribe_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "summary_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "summary_recipients_unsubscribe_token_key" ON "summary_recipients"("unsubscribe_token");

-- CreateIndex
CREATE UNIQUE INDEX "summary_recipients_organization_id_email_key" ON "summary_recipients"("organization_id", "email");

-- AddForeignKey
ALTER TABLE "summary_recipients" ADD CONSTRAINT "summary_recipients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
