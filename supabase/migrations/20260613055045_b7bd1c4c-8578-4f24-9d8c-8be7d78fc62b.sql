
-- TEMPLATES
CREATE TABLE public.programme_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  crop_type text,
  next_crop_family text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programme_templates TO authenticated;
GRANT ALL ON public.programme_templates TO service_role;
ALTER TABLE public.programme_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read templates" ON public.programme_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert templates" ON public.programme_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "owner update templates" ON public.programme_templates FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "owner delete templates" ON public.programme_templates FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE TRIGGER trg_programme_templates_updated BEFORE UPDATE ON public.programme_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TEMPLATE STAGES
CREATE TABLE public.template_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.programme_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  day_offset integer NOT NULL DEFAULT 0,
  task_type text DEFAULT 'general',
  priority text DEFAULT 'medium',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_stages TO authenticated;
GRANT ALL ON public.template_stages TO service_role;
ALTER TABLE public.template_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read tstages" ON public.template_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner manage tstages" ON public.template_stages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.programme_templates t WHERE t.id = template_id AND t.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.programme_templates t WHERE t.id = template_id AND t.created_by = auth.uid()));

-- PROGRAMMES
CREATE TABLE public.crop_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  crop_id uuid REFERENCES public.crops(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.programme_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  anchor_stage text NOT NULL DEFAULT 'Planting',
  anchor_date date NOT NULL,
  next_crop_family text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_programmes TO authenticated;
GRANT ALL ON public.crop_programmes TO service_role;
ALTER TABLE public.crop_programmes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read programmes" ON public.crop_programmes FOR SELECT TO authenticated USING (public.is_farm_member(auth.uid(), farm_id));
CREATE POLICY "members insert programmes" ON public.crop_programmes FOR INSERT TO authenticated WITH CHECK (public.is_farm_member(auth.uid(), farm_id));
CREATE POLICY "members update programmes" ON public.crop_programmes FOR UPDATE TO authenticated USING (public.is_farm_member(auth.uid(), farm_id));
CREATE POLICY "members delete programmes" ON public.crop_programmes FOR DELETE TO authenticated USING (public.is_farm_member(auth.uid(), farm_id));
CREATE TRIGGER trg_crop_programmes_updated BEFORE UPDATE ON public.crop_programmes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ACTIVITIES
CREATE TABLE public.programme_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.crop_programmes(id) ON DELETE CASCADE,
  name text NOT NULL,
  day_offset integer NOT NULL DEFAULT 0,
  scheduled_date date NOT NULL,
  task_type text DEFAULT 'general',
  priority text DEFAULT 'medium',
  notes text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programme_activities TO authenticated;
GRANT ALL ON public.programme_activities TO service_role;
ALTER TABLE public.programme_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage activities" ON public.programme_activities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crop_programmes p WHERE p.id = programme_id AND public.is_farm_member(auth.uid(), p.farm_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.crop_programmes p WHERE p.id = programme_id AND public.is_farm_member(auth.uid(), p.farm_id)));
CREATE TRIGGER trg_programme_activities_updated BEFORE UPDATE ON public.programme_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_activities_programme ON public.programme_activities(programme_id);
CREATE INDEX idx_stages_template ON public.template_stages(template_id);
CREATE INDEX idx_programmes_farm ON public.crop_programmes(farm_id);
