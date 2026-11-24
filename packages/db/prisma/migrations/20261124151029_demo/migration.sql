-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "owner" TEXT;
