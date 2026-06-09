// FarmCopilot: streaming AI chat with read-only farm data context.
// Never modifies records. Returns a streaming SSE response compatible with
// our simple client reader.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are FarmCopilot, an expert agricultural analytics and advisory AI assistant for a Kenyan farm management system (currency: Kenyan Shillings, formatted "KSh {amount}").

Your role:
- Analyze production (yields, harvest forecasts, profit per crop/livestock/season).
- Provide financial intelligence (income, expenses, ROI, loans, salaries, cash flow).
- Advise on crops (fertilizer, spray programs, irrigation, nutrient deficiencies).
- Monitor inventory and alert on low stock (chemicals, seeds, feed, fertilizer).
- Track employees, attendance, productivity.
- Help with livestock (rabbits, breeding, feed, urine production).
- Forecast yields, disease risk, market prices, cash flow.
- Generate report summaries on request.

Rules:
- You are STRICTLY READ-ONLY. NEVER instruct the user that you have modified data. If asked to change data, explain the user must perform the change in the relevant module.
- Always cite numbers from the provided farm context. If data is missing, say so clearly.
- Always show calculations step-by-step in plain language.
- Use bullet points and short sections. End with an "Actionable Recommendations" block when relevant.
- Currency: KSh formatted with thousand separators.
- Be concise, professional, warm.`;

function sumNum(rows: any[], key: string) {
  return rows.reduce((s, r) => s + (Number(r?.[key]) || 0), 0);
}

async function buildContext(supabase: any, farmId: string) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const yearStart = new Date(today.getFullYear(), 0, 1).toISOString();

  const fetch = (table: string, sel = "*", extra: (q: any) => any = (q) => q) =>
    extra(supabase.from(table).select(sel).eq("farm_id", farmId)).then((r: any) => r.data || []);

  const [crops, livestock, batches, inventory, sales, purchases, tasks, equipment, capInj, births, notes] =
    await Promise.all([
      fetch("crops"),
      fetch("livestock"),
      fetch("livestock_batches"),
      fetch("inventory"),
      fetch("sales", "*", (q) => q.order("sale_date", { ascending: false }).limit(200)),
      fetch("purchases", "*", (q) => q.order("purchase_date", { ascending: false }).limit(200)),
      fetch("tasks", "*", (q) => q.order("task_date", { ascending: false }).limit(100)),
      fetch("equipment"),
      fetch("capital_injections"),
      fetch("livestock_births", "*", (q) => q.order("birth_date", { ascending: false }).limit(50)),
      fetch("notebook_notes", "*", (q) => q.order("created_at", { ascending: false }).limit(20)),
    ]);

  const salesMonth = sales.filter((s: any) => s.sale_date >= monthStart);
  const purchMonth = purchases.filter((p: any) => p.purchase_date >= monthStart);
  const salesYear = sales.filter((s: any) => s.sale_date >= yearStart);
  const purchYear = purchases.filter((p: any) => p.purchase_date >= yearStart);

  const lowStock = inventory.filter((i: any) => Number(i.quantity) <= Number(i.min_threshold || 0));

  const summary = {
    as_of: today.toISOString(),
    counts: {
      crops: crops.length,
      livestock_individual: livestock.length,
      livestock_batches: batches.length,
      inventory_items: inventory.length,
      equipment: equipment.length,
      open_tasks: tasks.filter((t: any) => !t.completed).length,
    },
    finance_this_month: {
      revenue: sumNum(salesMonth, "total_amount"),
      expenses: sumNum(purchMonth, "total_cost"),
      profit: sumNum(salesMonth, "total_amount") - sumNum(purchMonth, "total_cost"),
    },
    finance_ytd: {
      revenue: sumNum(salesYear, "total_amount"),
      expenses: sumNum(purchYear, "total_cost"),
      profit: sumNum(salesYear, "total_amount") - sumNum(purchYear, "total_cost"),
      capital_injected: sumNum(capInj, "amount"),
    },
    low_stock_alerts: lowStock.map((i: any) => ({
      item: i.item_name, qty: i.quantity, unit: i.unit, min: i.min_threshold,
    })),
    top_selling_products: Object.entries(
      sales.reduce((acc: any, s: any) => {
        const k = s.product_name || "Unknown";
        acc[k] = (acc[k] || 0) + Number(s.total_amount || 0);
        return acc;
      }, {})
    ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5),
    crops: crops.map((c: any) => ({
      name: c.name, type: c.type, acreage: c.acreage, planting_date: c.planting_date,
      expected_harvest: c.expected_harvest_date, status: c.status, location: c.farm_location,
    })),
    livestock_summary: livestock.reduce((acc: any, l: any) => {
      acc[l.type] = (acc[l.type] || 0) + 1; return acc;
    }, {}),
    livestock_batches: batches.map((b: any) => ({
      batch_id: b.batch_id, type: b.type, count: b.count, status: b.status,
    })),
    recent_births: births.map((b: any) => ({
      mother: b.mother_tag, date: b.birth_date, males: b.male_count, females: b.female_count,
    })),
    upcoming_tasks: tasks.filter((t: any) => !t.completed).slice(0, 10).map((t: any) => ({
      title: t.title, date: t.task_date, priority: t.priority,
    })),
    recent_notes: notes.map((n: any) => ({ title: n.title, date: n.created_at })),
  };

  return summary;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");

    const authed = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await authed.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const body = await req.json();
    const { messages, farmId } = body as { messages: { role: string; content: string }[]; farmId: string };
    if (!farmId) return new Response("farmId required", { status: 400, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: member } = await admin
      .from("farm_members").select("id").eq("farm_id", farmId).eq("user_id", user.id).maybeSingle();
    if (!member) return new Response("Forbidden", { status: 403, headers: corsHeaders });

    const ctx = await buildContext(admin, farmId);

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: `Live farm data (read-only JSON snapshot):\n${JSON.stringify(ctx)}` },
          ...messages,
        ],
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await upstream.text();
      console.error("AI gateway error", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("farm-copilot error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
