-- OPTIONAL Pets generation ledger. NOT applied to production by this release.
-- Independent of commerce migration 015/016. Requires existing private
-- user-uploads storage. Do not enable generation until storage/privacy, model
-- cost ceiling, concurrent PostgreSQL execution and role grants are verified.
BEGIN;

CREATE TABLE IF NOT EXISTS pets_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_hash TEXT NOT NULL CHECK (owner_hash ~ '^[a-f0-9]{64}$'),
  ip_hash TEXT NOT NULL CHECK (ip_hash ~ '^[a-f0-9]{64}$'),
  request_id UUID NOT NULL,
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','completed','failed','uncertain')),
  budget_day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  reserved_cost_cents INTEGER NOT NULL CHECK (reserved_cost_cents > 0),
  original_path TEXT,
  preview_path TEXT,
  provider_request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_hash, request_id),
  CHECK (status <> 'completed' OR (original_path = 'pets/' || id::text || '/original.png'
    AND preview_path = 'pets/' || id::text || '/preview.png'
    AND original_path IS NOT NULL AND preview_path IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS pets_jobs_budget_day ON pets_generation_jobs(budget_day);
CREATE INDEX IF NOT EXISTS pets_jobs_owner_day ON pets_generation_jobs(owner_hash,budget_day);
CREATE INDEX IF NOT EXISTS pets_jobs_ip_day ON pets_generation_jobs(ip_hash,budget_day);
ALTER TABLE pets_generation_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE pets_generation_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE pets_generation_jobs TO service_role;

CREATE OR REPLACE FUNCTION pets_generation_ledger_version()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN to_regclass('public.pets_generation_jobs') IS NOT NULL THEN 1 ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION reserve_pets_generation(
  p_owner_hash TEXT, p_ip_hash TEXT, p_request_id UUID, p_request_hash TEXT,
  p_estimated_cost_cents INTEGER, p_daily_budget_cents INTEGER,
  p_owner_limit INTEGER, p_ip_limit INTEGER, p_global_limit INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE target pets_generation_jobs%ROWTYPE;
  today DATE := (now() AT TIME ZONE 'UTC')::date;
  owner_count BIGINT; ip_count BIGINT; global_count BIGINT; committed_cents BIGINT;
BEGIN
  IF p_owner_hash IS NULL OR p_owner_hash !~ '^[a-f0-9]{64}$'
    OR p_ip_hash IS NULL OR p_ip_hash !~ '^[a-f0-9]{64}$'
    OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' OR p_request_id IS NULL
    OR coalesce(p_estimated_cost_cents,0) <= 0 OR coalesce(p_daily_budget_cents,0) <= 0
    OR coalesce(p_owner_limit,0) <= 0 OR coalesce(p_ip_limit,0) <= 0 OR coalesce(p_global_limit,0) <= 0 THEN
    RAISE EXCEPTION 'invalid generation reservation' USING ERRCODE='23514';
  END IF;
  -- Every worker takes locks in the same order. A day-wide lock serializes spend
  -- admission across users/IPs/serverless instances, not just this Node process.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner_hash || ':' || p_request_id::text,17));
  SELECT * INTO target FROM pets_generation_jobs WHERE owner_hash=p_owner_hash AND request_id=p_request_id FOR UPDATE;
  IF target.id IS NOT NULL THEN
    IF target.request_hash <> p_request_hash THEN
      RAISE EXCEPTION 'idempotency request conflict' USING ERRCODE='23505';
    END IF;
    IF target.status='reserved' AND target.updated_at <= now() - interval '5 minutes' THEN
      UPDATE pets_generation_jobs SET status='uncertain',updated_at=now() WHERE id=target.id RETURNING * INTO target;
    END IF;
    RETURN jsonb_build_object('job',to_jsonb(target),'should_run',false);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pets-budget:' || today::text,18));
  SELECT count(*),coalesce(sum(reserved_cost_cents),0),
    count(*) FILTER(WHERE owner_hash=p_owner_hash),count(*) FILTER(WHERE ip_hash=p_ip_hash)
    INTO global_count,committed_cents,owner_count,ip_count FROM pets_generation_jobs WHERE budget_day=today;
  IF owner_count >= p_owner_limit OR ip_count >= p_ip_limit OR global_count >= p_global_limit
    OR committed_cents + p_estimated_cost_cents > p_daily_budget_cents THEN
    RAISE EXCEPTION 'generation allowance reached' USING ERRCODE='P0001';
  END IF;
  INSERT INTO pets_generation_jobs(owner_hash,ip_hash,request_id,request_hash,reserved_cost_cents,budget_day)
    VALUES(p_owner_hash,p_ip_hash,p_request_id,p_request_hash,p_estimated_cost_cents,today) RETURNING * INTO target;
  RETURN jsonb_build_object('job',to_jsonb(target),'should_run',true);
END $$;

CREATE OR REPLACE FUNCTION finish_pets_generation(
  p_job_id UUID, p_owner_hash TEXT, p_status TEXT, p_original_path TEXT,
  p_preview_path TEXT, p_provider_request_id TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE target pets_generation_jobs%ROWTYPE;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('completed','failed','uncertain') THEN
    RAISE EXCEPTION 'invalid generation state' USING ERRCODE='23514';
  END IF;
  SELECT * INTO target FROM pets_generation_jobs WHERE id=p_job_id AND owner_hash=p_owner_hash FOR UPDATE;
  IF target.id IS NULL THEN RAISE EXCEPTION 'generation not found' USING ERRCODE='P0002'; END IF;
  -- A lost acknowledgement must not overwrite completed output or permit a new
  -- paid generation. Failure/uncertainty retains all cost and quota reservations.
  IF target.status <> 'reserved' THEN RETURN; END IF;
  IF p_status='completed' AND (p_original_path IS DISTINCT FROM 'pets/' || p_job_id::text || '/original.png'
    OR p_preview_path IS DISTINCT FROM 'pets/' || p_job_id::text || '/preview.png') THEN
    RAISE EXCEPTION 'invalid portrait storage path' USING ERRCODE='23514';
  END IF;
  UPDATE pets_generation_jobs SET status=p_status,
    original_path=CASE WHEN p_status='completed' THEN p_original_path ELSE NULL END,
    preview_path=CASE WHEN p_status='completed' THEN p_preview_path ELSE NULL END,
    provider_request_id=p_provider_request_id,updated_at=now() WHERE id=p_job_id;
END $$;

REVOKE ALL ON FUNCTION pets_generation_ledger_version() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION reserve_pets_generation(TEXT,TEXT,UUID,TEXT,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION finish_pets_generation(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pets_generation_ledger_version() TO service_role;
GRANT EXECUTE ON FUNCTION reserve_pets_generation(TEXT,TEXT,UUID,TEXT,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION finish_pets_generation(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;

COMMIT;
