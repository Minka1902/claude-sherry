-- DropIndex
DROP INDEX "SellerProfile_isActive_idx";

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "avgResponseMs" INTEGER,
ADD COLUMN     "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "SellerProfile_isActive_ratingAvg_idx" ON "SellerProfile"("isActive", "ratingAvg");

-- CreateIndex
CREATE INDEX "SellerProfile_isActive_avgResponseMs_idx" ON "SellerProfile"("isActive", "avgResponseMs");

-- CreateIndex
CREATE INDEX "SellerProfile_isActive_ratePer10k_idx" ON "SellerProfile"("isActive", "ratePer10k");
