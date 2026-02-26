-- DropIndex
DROP INDEX "Hotel_city_idx";

-- DropIndex
DROP INDEX "Hotel_name_idx";

-- AlterTable
ALTER TABLE "RoomType" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "childrenFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasBreakfast" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasWindow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[];

-- CreateIndex
CREATE INDEX "RoomInventory_date_quota_idx" ON "RoomInventory"("date", "quota");

-- CreateIndex
CREATE INDEX "RoomType_hotelId_idx" ON "RoomType"("hotelId");
