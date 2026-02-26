-- CreateIndex
CREATE INDEX IF NOT EXISTS "Hotel_name_trgm_idx" ON "Hotel" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Hotel_city_trgm_idx" ON "Hotel" USING GIN ("city" gin_trgm_ops);
