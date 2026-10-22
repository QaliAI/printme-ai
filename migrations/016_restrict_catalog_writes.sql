-- The curated catalog is server controlled. No production provider calls.
-- Read-only verification found all nine catalog tables publicly writable.
BEGIN;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'catalog_blueprints', 'catalog_print_providers', 'catalog_provider_variants',
    'catalog_print_placements', 'merchandising_products', 'approved_product_variants',
    'retail_prices', 'catalog_shipping_profiles', 'catalog_sync_runs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    -- Sync reports may contain internal provider data/errors; server access only.
    IF table_name <> 'catalog_sync_runs' THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', table_name);
      EXECUTE format('DROP POLICY IF EXISTS catalog_public_read ON public.%I', table_name);
      EXECUTE format('CREATE POLICY catalog_public_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', table_name);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Rollback: keep write privileges revoked. Reverting application code does not
-- require restoring anonymous writes; investigate policy regressions separately.
