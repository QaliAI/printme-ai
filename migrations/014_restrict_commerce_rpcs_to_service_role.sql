-- Migration 014: commerce RPCs callable only by service_role
--
-- 005, 006, 007 and 012 revoke EXECUTE from PUBLIC only. On Supabase, default
-- privileges also grant EXECUTE on new public functions to anon and
-- authenticated, so these SECURITY DEFINER functions stayed callable through
-- PostgREST with the public anon key. That would let anyone create pending
-- orders, claim or finish webhook events, lock fulfillment jobs, or move a
-- Printify order's status.
--
-- Every caller in the app uses the service-role admin client
-- (lib/supabase/admin.ts), so nothing in the app loses access.
-- 013 already restricts attach_commerce_stripe_session and
-- complete_stripe_checkout_payment the same way.
--
-- Depends on: 005, 006, 007, 012 (the functions must exist).
-- Same statements as the end of the canonical launch migration in docs/launch/.
-- Not applied anywhere.

BEGIN;

REVOKE ALL ON FUNCTION create_commerce_pending_order(
  UUID, UUID, TEXT, TEXT, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_commerce_pending_order(
  UUID, UUID, TEXT, TEXT, INTEGER, TEXT
) TO service_role;

REVOKE ALL ON FUNCTION lock_fulfillment_job(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION lock_fulfillment_job(UUID, TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION begin_commerce_webhook_event(TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION begin_commerce_webhook_event(TEXT, TEXT, TEXT, JSONB)
  TO service_role;

REVOKE ALL ON FUNCTION claim_failed_commerce_webhook_event(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_failed_commerce_webhook_event(TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION finish_commerce_webhook_event(TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION finish_commerce_webhook_event(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION apply_printify_order_transition(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_printify_order_transition(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

COMMIT;

-- Verify (expect no commerce functions; anything else listed predates these
-- migrations and needs its own review):
-- SELECT p.proname, r.rolname
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
-- CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
-- WHERE p.prosecdef
--   AND p.prorettype <> 'trigger'::regtype
--   AND has_function_privilege(r.rolname, p.oid, 'EXECUTE');
--
-- Rollback (re-exposes the functions to the anon key; not recommended):
-- GRANT EXECUTE ON FUNCTION <each signature above> TO anon, authenticated;
