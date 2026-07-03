-- Stage 2: Latest live location cache in Postgres.
-- UNLOGGED keeps this hot table lighter because latest coordinates can be
-- rebuilt from the next driver ping after a database crash.
CREATE UNLOGGED TABLE IF NOT EXISTS "trip_location_cache" (
    "trip_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "last_ping_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_location_cache_pkey" PRIMARY KEY ("trip_id"),
    CONSTRAINT "trip_location_cache_trip_id_fkey"
        FOREIGN KEY ("trip_id") REFERENCES "trips"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "trip_location_cache_last_ping_at_idx"
ON "trip_location_cache"("last_ping_at");

CREATE OR REPLACE FUNCTION public.touch_trip_location_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trip_location_cache_set_updated_at" ON "trip_location_cache";
CREATE TRIGGER "trip_location_cache_set_updated_at"
BEFORE UPDATE ON "trip_location_cache"
FOR EACH ROW
EXECUTE FUNCTION public.touch_trip_location_cache_updated_at();
