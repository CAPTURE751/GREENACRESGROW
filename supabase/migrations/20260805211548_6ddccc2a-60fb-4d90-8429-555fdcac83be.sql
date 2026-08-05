CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  actor_id uuid,
  actor_name text,
  changed_fields text[],
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm members can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (farm_id IS NULL OR public.is_farm_member(auth.uid(), farm_id));

CREATE INDEX idx_audit_logs_record ON public.audit_logs (table_name, record_id, created_at DESC);
CREATE INDEX idx_audit_logs_farm ON public.audit_logs (farm_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_farm uuid;
  v_record uuid;
  v_actor uuid := auth.uid();
  v_name text;
  v_changed text[];
  k text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;

  v_farm := COALESCE((v_new ->> 'farm_id')::uuid, (v_old ->> 'farm_id')::uuid);
  v_record := COALESCE((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);

  IF v_actor IS NOT NULL THEN
    SELECT name INTO v_name FROM public.profiles WHERE user_id = v_actor;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_changed := ARRAY(
      SELECT key FROM jsonb_each(v_new)
      WHERE key NOT IN ('updated_at')
        AND (v_old -> key) IS DISTINCT FROM (v_new -> key)
    );
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (farm_id, table_name, record_id, action, actor_id, actor_name, changed_fields, old_data, new_data)
  VALUES (v_farm, TG_TABLE_NAME, v_record, lower(TG_OP), v_actor, v_name, v_changed, v_old, v_new);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sales','purchases','capital_injections','profit_disbursements','crops',
    'livestock','livestock_batches','livestock_births','inventory',
    'inventory_movements','tasks','equipment','equipment_maintenance'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.record_audit_log()', t);
  END LOOP;
END $$;