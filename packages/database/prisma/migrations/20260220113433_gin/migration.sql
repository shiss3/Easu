-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "Hotel_name_idx" ON "Hotel" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Hotel_city_idx" ON "Hotel" USING GIN ("city" gin_trgm_ops);
