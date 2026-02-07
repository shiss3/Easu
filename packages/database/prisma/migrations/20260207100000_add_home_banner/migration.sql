-- CreateTable
CREATE TABLE "HomeBanner" (
    "id" SERIAL NOT NULL,
    "targetCity" TEXT,
    "hotelId" INTEGER NOT NULL,
    "title" TEXT,
    "subTitle" TEXT,
    "imageUrlOverride" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "trackCode" TEXT,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeBanner_targetCity_status_sortOrder_idx" ON "HomeBanner"("targetCity", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "HomeBanner_hotelId_idx" ON "HomeBanner"("hotelId");

-- AddForeignKey
ALTER TABLE "HomeBanner" ADD CONSTRAINT "HomeBanner_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

