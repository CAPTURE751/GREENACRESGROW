
-- 1. Add columns first
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_end_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;

-- 2. Fix tasks RLS: Drop old RESTRICTIVE policies, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view tasks they created or admin/staff can view all" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks, admin/staff can update all" ON public.tasks;
DROP POLICY IF EXISTS "Admin can delete tasks" ON public.tasks;
-- Drop any from failed previous migration
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;

CREATE POLICY "Users can view tasks" ON public.tasks FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR get_user_role(auth.uid()) IN ('admin', 'staff'));

CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR get_user_role(auth.uid()) IN ('admin', 'staff'));

CREATE POLICY "Admin or owner can delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR get_user_role(auth.uid()) = 'admin');

-- 3. Create task_notifications table
CREATE TABLE IF NOT EXISTS public.task_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'reminder',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task notifications" ON public.task_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own task notifications" ON public.task_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can insert task notifications" ON public.task_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. Function to generate recurring task instances
CREATE OR REPLACE FUNCTION public.generate_recurring_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t RECORD;
  next_date date;
  existing_count int;
BEGIN
  FOR t IN
    SELECT * FROM public.tasks
    WHERE recurrence IS NOT NULL
      AND recurrence != 'none'
      AND parent_task_id IS NULL
      AND (recurrence_end_date IS NULL OR recurrence_end_date >= CURRENT_DATE)
  LOOP
    SELECT MAX(task_date)::date INTO next_date
    FROM public.tasks
    WHERE parent_task_id = t.id OR id = t.id;

    IF next_date IS NULL THEN
      next_date := t.task_date;
    END IF;

    LOOP
      CASE t.recurrence
        WHEN 'daily' THEN next_date := next_date + INTERVAL '1 day';
        WHEN 'weekly' THEN next_date := next_date + INTERVAL '1 week';
        WHEN 'biweekly' THEN next_date := next_date + INTERVAL '2 weeks';
        WHEN 'monthly' THEN next_date := next_date + INTERVAL '1 month';
        ELSE EXIT;
      END CASE;

      EXIT WHEN next_date > CURRENT_DATE + INTERVAL '30 days';
      EXIT WHEN t.recurrence_end_date IS NOT NULL AND next_date > t.recurrence_end_date;

      SELECT COUNT(*) INTO existing_count
      FROM public.tasks
      WHERE parent_task_id = t.id AND task_date = next_date;

      IF existing_count = 0 THEN
        INSERT INTO public.tasks (title, description, task_date, task_type, priority, created_by, farm_id, assigned_to, parent_task_id, completed)
        VALUES (t.title, t.description, next_date, t.task_type, t.priority, t.created_by, t.farm_id, t.assigned_to, t.id, false);
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
