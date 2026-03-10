import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // 1. Generate recurring tasks
    await supabase.rpc("generate_recurring_tasks");

    // 2. Find tasks due today or tomorrow that haven't had reminders sent
    const { data: dueTasks, error: fetchErr } = await supabase
      .from("tasks")
      .select("id, title, task_date, task_type, priority, created_by, assigned_to")
      .eq("completed", false)
      .eq("reminder_sent", false)
      .lte("task_date", tomorrow)
      .gte("task_date", today);

    if (fetchErr) throw fetchErr;

    // 3. Find overdue tasks
    const { data: overdueTasks, error: overdueErr } = await supabase
      .from("tasks")
      .select("id, title, task_date, task_type, priority, created_by, assigned_to")
      .eq("completed", false)
      .lt("task_date", today);

    if (overdueErr) throw overdueErr;

    const notifications: Array<{ task_id: string; user_id: string; message: string; type: string }> = [];

    // Create reminder notifications for upcoming tasks
    for (const task of dueTasks || []) {
      const isToday = task.task_date === today;
      const msg = isToday
        ? `Task "${task.title}" is due today!`
        : `Task "${task.title}" is due tomorrow.`;

      notifications.push({
        task_id: task.id,
        user_id: task.created_by,
        message: msg,
        type: "reminder",
      });

      if (task.assigned_to && task.assigned_to !== task.created_by) {
        notifications.push({
          task_id: task.id,
          user_id: task.assigned_to,
          message: msg,
          type: "reminder",
        });
      }
    }

    // Create overdue notifications
    for (const task of overdueTasks || []) {
      const daysOverdue = Math.floor(
        (Date.now() - new Date(task.task_date).getTime()) / 86400000
      );
      const msg = `Task "${task.title}" is ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue!`;

      notifications.push({
        task_id: task.id,
        user_id: task.created_by,
        message: msg,
        type: "overdue",
      });

      if (task.assigned_to && task.assigned_to !== task.created_by) {
        notifications.push({
          task_id: task.id,
          user_id: task.assigned_to,
          message: msg,
          type: "overdue",
        });
      }
    }

    // Insert notifications (using service role bypasses RLS)
    if (notifications.length > 0) {
      const { error: insertErr } = await supabase
        .from("task_notifications")
        .insert(notifications);
      if (insertErr) throw insertErr;
    }

    // Mark reminder_sent on upcoming tasks
    const dueIds = (dueTasks || []).map((t) => t.id);
    if (dueIds.length > 0) {
      await supabase
        .from("tasks")
        .update({ reminder_sent: true })
        .in("id", dueIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders: (dueTasks || []).length,
        overdue: (overdueTasks || []).length,
        notifications_created: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
