-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT true;
