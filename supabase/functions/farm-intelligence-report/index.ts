// AI Farm Intelligence report engine.
// Takes a natural-language report request, reads farm data (read-only) and
// returns a structured, multi-section report the client renders as a branded PDF.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "period_label", "executive_summary", "kpis", "sections", "recommendations", "risks"],
  properties: {
    title: { type: "string" },
    period_label: { type: "string" },
    executive_summary: { type: "string" },
    kpis: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "narrative"],
        properties: {
          heading: { type: "string" },
          narrative: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          table: {
            type: "object",
            additionalProperties: false,
            required: ["columns", "rows"],
            properties: {
              columns: { type: "array", items: { type: "string" } },
              rows: { type: "array", items: { type: "array", items: { type: "string" } } },
            },
          },
        },
      },
    },
    recommendations: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM_PROMPT = `You are the Farm Intelligence reporting engine for a Kenyan farm (currency: Kenyan Shillings, written "KSh 12,500").

You turn a plain-language reporting request plus a read-only JSON snapshot of the farm into a professional, multi-page management report.

Rules:
- Use ONLY numbers present in the snapshot. Never invent figures. If data is missing for something requested, say so plainly in the relevant section.
- If the user names no period, cover the current calendar year to date and say so in period_label.
- Write 4-8 sections. Good defaults: Financial Performance, Crop Production, Livestock, Inventory & Inputs, Operations & Tasks, Outlook.
- Every section needs a narrative of 2-5 sentences. Add a table when comparing items (all table cells must be strings; format money as "KSh 1,234").
- Show the arithmetic behind key figures in plain language.
- 4-8 KPIs, 4-8 concrete recommendations, and 2-6 risks.
- Professional, warm, direct. No markdown syntax inside any field.`;

function sumNum(rows: any[], key: string) {
  return rows.reduce((s, r) => s + (Number(r?.[key]) || 0), 0);
}

async function buildContext(supabase: any, farmId: string) {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const grab = (table: string, extra: (q: any) => any = (q) => q) =>
    extra(supabase.from(table).select("*").eq("farm_id", farmId)).then((r: any) => r.data || []);

  const [crops, harvests, livestock, batches, births, inventory, movements, sales, purchases, tasks, equipment, capInj, disb] =
    await Promise.all([
      grab("crops"),
      grab("crop_harvests", (q: any) => q.order("harvest_date", { ascending: false }).limit(300)),
      grab("livestock"),
      grab("livestock_batches"),
      grab("livestock_births", (q: any) => q.order("birth_date", { ascending: false }).limit(100)),
      grab("inventory"),
      grab("inventory_movements", (q: any) => q.order("movement_date", { ascending: false }).limit(200)),
      grab("sales", (q: any) => q.order("sale_date", { ascending: false }).limit(500)),
      grab("purchases", (q: any) => q.order("purchase_date", { ascending: false }).limit(500)),
      grab("tasks", (q: any) => q.order("task_date", { ascending: false }).limit(200)),
      grab("equipment"),
      grab("capital_injections"),
      grab("profit_disbursements", (q: any) => q.order("disbursed_on", { ascending: false }).limit(200)),
    ]);

  const byMonth = (rows: any[], dateKey: string, amtKey: string) =>
    rows.reduce((acc: any, r: any) => {
      const m = String(r[dateKey] || "").slice(0, 7);
      if (!m) return acc;
      acc[m] = (acc[m] || 0) + Number(r[amtKey] || 0);
      return acc;
    }, {});

  const salesYTD = sales.filter((s: any) => s.sale_date >= yearStart);
  const purchYTD = purchases.filter((p: any) => p.purchase_date >= yearStart);

  return {
    as_of: today.toISOString().slice(0, 10),
    year_start: yearStart,
    month_start: monthStart,
    finance: {
      revenue_ytd: sumNum(salesYTD, "total_amount"),
      expenses_ytd: sumNum(purchYTD, "total_cost"),
      profit_ytd: sumNum(salesYTD, "total_amount") - sumNum(purchYTD, "total_cost"),
      capital_injected_total: sumNum(capInj, "amount"),
      disbursed_total: sumNum(disb, "amount"),
      revenue_by_month: byMonth(sales, "sale_date", "total_amount"),
      expenses_by_month: byMonth(purchases, "purchase_date", "total_cost"),
      expenses_by_category: purchases.reduce((acc: any, p: any) => {
        const k = p.category || "Uncategorised";
        acc[k] = (acc[k] || 0) + Number(p.total_cost || 0);
        return acc;
      }, {}),
      revenue_by_product: sales.reduce((acc: any, s: any) => {
        const k = s.product_name || "Unknown";
        acc[k] = (acc[k] || 0) + Number(s.total_amount || 0);
        return acc;
      }, {}),
      unpaid_sales: sales.filter((s: any) => s.payment_status && s.payment_status !== "paid").length,
    },
    crops: crops.map((c: any) => ({
      id: c.id, name: c.name, variety: c.variety, type: c.type, acreage: c.acreage,
      method: c.establishment_method, status: c.status, archived: c.archived,
      nursery_start: c.nursery_start_date, expected_transplant: c.expected_transplant_date,
      actual_transplant: c.actual_transplant_date, planting_date: c.planting_date,
      expected_harvest: c.expected_harvest_date, actual_harvest: c.actual_harvest_date,
      location: c.farm_location,
    })),
    crop_harvests: harvests.map((h: any) => ({
      crop_id: h.crop_id, date: h.harvest_date, qty: h.quantity, unit: h.unit, grade: h.quality_grade,
    })),
    livestock: {
      individual_count: livestock.length,
      by_type: livestock.reduce((acc: any, l: any) => { acc[l.type] = (acc[l.type] || 0) + 1; return acc; }, {}),
      batches: batches.map((b: any) => ({
        batch_id: b.batch_id, type: b.animal_type, breed: b.breed,
        current: b.current_quantity, initial: b.initial_quantity, mortality: b.mortality_count,
        arrival: b.arrival_date, feed_consumed: b.feed_consumed,
      })),
      total_animals: livestock.length + sumNum(batches, "current_quantity"),
      recent_births: births.map((b: any) => ({ date: b.birth_date, newborns: b.newborn_count })),
    },
    inventory: {
      items: inventory.map((i: any) => ({
        item: i.item_name, category: i.category, qty: i.quantity, unit: i.unit,
        min: i.min_threshold, unit_cost: i.unit_cost,
      })),
      low_stock: inventory
        .filter((i: any) => i.min_threshold != null && Number(i.quantity) <= Number(i.min_threshold))
        .map((i: any) => ({ item: i.item_name, qty: i.quantity, min: i.min_threshold, unit: i.unit })),
      recent_movements: movements.slice(0, 40).map((m: any) => ({
        item_id: m.inventory_id, type: m.movement_type, qty: m.quantity, date: m.movement_date, purpose: m.purpose,
      })),
    },
    operations: {
      open_tasks: tasks.filter((t: any) => !t.completed).length,
      completed_tasks: tasks.filter((t: any) => t.completed).length,
      overdue_tasks: tasks.filter((t: any) => !t.completed && t.task_date < today.toISOString().slice(0, 10)).length,
      upcoming: tasks.filter((t: any) => !t.completed).slice(0, 15).map((t: any) => ({
        title: t.title, date: t.task_date, type: t.task_type, priority: t.priority,
      })),
      equipment: equipment.map((e: any) => ({ name: e.name, status: e.status, next_service: e.maintenance_date })),
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await admin.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, 2000) : "";
    const farmId = typeof body?.farmId === "string" ? body.farmId : "";
    if (!farmId || !prompt) {
      return new Response(JSON.stringify({ error: "farmId and prompt are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: member } = await admin
      .from("farm_members").select("id").eq("farm_id", farmId).eq("user_id", user.id).maybeSingle();
    if (!member) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ctx = await buildContext(admin, farmId);

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: `Farm data snapshot (read-only JSON):\n${JSON.stringify(ctx)}` },
          { role: "user", content: `Report request: ${prompt}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "farm_report", strict: false, schema: REPORT_SCHEMA },
        },
      }),
    });

    if (!upstream.ok) {
      const status = upstream.status;
      const msg =
        status === 429 ? "Rate limit reached. Try again shortly."
        : status === 402 ? "AI credits exhausted. Please top up your workspace."
        : "AI gateway error";
      console.error("intelligence-report gateway error", status, await upstream.text());
      return new Response(JSON.stringify({ error: msg }),
        { status: status === 429 || status === 402 ? status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await upstream.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let report: any;
    try {
      report = JSON.parse(content);
    } catch {
      const m = String(content).match(/\{[\s\S]*\}/);
      report = m ? JSON.parse(m[0]) : null;
    }
    if (!report?.sections) {
      return new Response(JSON.stringify({ error: "The report could not be generated. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("farm-intelligence-report error", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
