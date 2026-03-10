
-- Fix the overly permissive INSERT policy on task_notifications
DROP POLICY IF EXISTS "Authenticated can insert task notifications" ON public.task_notifications;

CREATE POLICY "Users can insert own task notifications" ON public.task_notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
