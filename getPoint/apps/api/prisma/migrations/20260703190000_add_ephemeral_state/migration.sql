-- Stage 1: Postgres-backed ephemeral key/value state.
-- The cleanup job is best-effort; application reads also filter expired rows.
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS "ephemeral_state" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ephemeral_state_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "ephemeral_state_expires_at_idx" ON "ephemeral_state"("expires_at");

CREATE OR REPLACE FUNCTION public.touch_ephemeral_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "ephemeral_state_set_updated_at" ON "ephemeral_state";
CREATE TRIGGER "ephemeral_state_set_updated_at"
BEFORE UPDATE ON "ephemeral_state"
FOR EACH ROW
EXECUTE FUNCTION public.touch_ephemeral_state_updated_at();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM cron.job
        WHERE jobname = 'cleanup_ephemeral_state'
    ) THEN
        PERFORM cron.unschedule('cleanup_ephemeral_state');
    END IF;
END
$$;

SELECT cron.schedule(
    'cleanup_ephemeral_state',
    '* * * * *',
    $$DELETE FROM public.ephemeral_state WHERE expires_at < now();$$
);
