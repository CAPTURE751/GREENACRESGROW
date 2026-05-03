
-- notebook_notes
CREATE TABLE public.notebook_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid,
  crop_id uuid,
  title text NOT NULL,
  content text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notebook_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View notebook notes" ON public.notebook_notes FOR SELECT TO authenticated
  USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])) OR created_by = auth.uid());
CREATE POLICY "Create notebook notes" ON public.notebook_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update notebook notes" ON public.notebook_notes FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]));
CREATE POLICY "Delete notebook notes" ON public.notebook_notes FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role);

CREATE TRIGGER notebook_notes_updated_at BEFORE UPDATE ON public.notebook_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_notebook_notes_farm ON public.notebook_notes(farm_id);
CREATE INDEX idx_notebook_notes_crop ON public.notebook_notes(crop_id);

-- season_challenges
CREATE TABLE public.season_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  season text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.season_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View season challenges" ON public.season_challenges FOR SELECT TO authenticated
  USING ((get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role])) OR created_by = auth.uid());
CREATE POLICY "Create season challenges" ON public.season_challenges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update season challenges" ON public.season_challenges FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'staff'::user_role]));
CREATE POLICY "Delete season challenges" ON public.season_challenges FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role);

CREATE TRIGGER season_challenges_updated_at BEFORE UPDATE ON public.season_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_season_challenges_farm ON public.season_challenges(farm_id);

-- Extend tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_time text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS workers text[],
  ADD COLUMN IF NOT EXISTS inputs_used jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text;
