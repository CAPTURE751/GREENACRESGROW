
CREATE TABLE public.copilot_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copilot_threads TO authenticated;
GRANT ALL ON public.copilot_threads TO service_role;
ALTER TABLE public.copilot_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm members read threads" ON public.copilot_threads FOR SELECT TO authenticated
  USING (public.is_farm_member(auth.uid(), farm_id));
CREATE POLICY "Owner manages own threads" ON public.copilot_threads FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_farm_member(auth.uid(), farm_id))
  WITH CHECK (auth.uid() = user_id AND public.is_farm_member(auth.uid(), farm_id));
CREATE INDEX copilot_threads_farm_user_idx ON public.copilot_threads(farm_id, user_id, updated_at DESC);
CREATE TRIGGER copilot_threads_updated BEFORE UPDATE ON public.copilot_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.copilot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.copilot_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copilot_messages TO authenticated;
GRANT ALL ON public.copilot_messages TO service_role;
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read thread messages" ON public.copilot_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.copilot_threads t WHERE t.id = thread_id AND public.is_farm_member(auth.uid(), t.farm_id)));
CREATE POLICY "Members write thread messages" ON public.copilot_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.copilot_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
CREATE POLICY "Owner deletes thread messages" ON public.copilot_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.copilot_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
CREATE INDEX copilot_messages_thread_idx ON public.copilot_messages(thread_id, created_at);
