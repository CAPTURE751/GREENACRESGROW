import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FN = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;

async function call(name: string, headers: Record<string, string> = {}) {
  const res = await fetch(FN(name), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...headers,
    },
    body: JSON.stringify({}),
  });
  const body = await res.text();
  return { status: res.status, body };
}

// --- Cron endpoints must reject callers without the shared cron secret ---

Deno.test("task-reminders rejects requests with no cron secret", async () => {
  const { status } = await call("task-reminders");
  assertEquals(status, 401);
});

Deno.test("task-reminders rejects a wrong cron secret", async () => {
  const { status } = await call("task-reminders", { "x-cron-secret": "not-the-secret" });
  assertEquals(status, 401);
});

Deno.test("task-reminders rejects a user JWT instead of the cron secret", async () => {
  const { status } = await call("task-reminders", {
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  });
  assertEquals(status, 401);
});

Deno.test("inventory-alerts rejects requests with no cron secret", async () => {
  const { status } = await call("inventory-alerts");
  assertEquals(status, 401);
});

Deno.test("inventory-alerts rejects a wrong cron secret", async () => {
  const { status } = await call("inventory-alerts", { "x-cron-secret": "not-the-secret" });
  assertEquals(status, 401);
});

Deno.test("inventory-alerts rejects a wrong secret combined with a bogus JWT", async () => {
  const { status } = await call("inventory-alerts", {
    "x-cron-secret": "not-the-secret",
    Authorization: "Bearer not-a-real-jwt",
  });
  assertEquals(status, 401);
});

// --- Cron endpoints must never leak internal error details ---

Deno.test("cron endpoints return a generic body, never SQL or stack details", async () => {
  for (const name of ["task-reminders", "inventory-alerts"]) {
    const { body } = await call(name, { "x-cron-secret": "wrong" });
    const lowered = body.toLowerCase();
    assertEquals(lowered.includes("relation"), false, `${name} leaked SQL detail`);
    assertEquals(lowered.includes("permission denied"), false, `${name} leaked SQL detail`);
    assertEquals(lowered.includes("at async"), false, `${name} leaked a stack trace`);
  }
});

// --- Realtime: broadcast/presence must be denied for every client role ---

Deno.test({
  name: "anonymous clients cannot join a private broadcast channel",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const status = await new Promise<string>((resolve) => {
    const channel = client.channel("farm:cross-farm-probe", {
      config: { private: true, broadcast: { self: true } },
    });
    const timer = setTimeout(() => resolve("TIMED_OUT"), 8000);
    channel.subscribe((s) => {
      if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR" || s === "CLOSED" || s === "TIMED_OUT") {
        clearTimeout(timer);
        resolve(s);
      }
    });
  });

    await client.removeAllChannels();
    client.realtime.disconnect();
    // realtime.messages has RLS on with no permissive policy, so joining must fail.
    assertEquals(status === "SUBSCRIBED", false, `private channel join was allowed: ${status}`);
  },
});

Deno.test({
  name: "anonymous clients cannot broadcast onto another farm's channel",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const channel = client.channel("farm:00000000-0000-0000-0000-000000000000", {
    config: { private: true, broadcast: { self: true } },
  });

  const received: unknown[] = [];
  channel.on("broadcast", { event: "leak" }, (p) => received.push(p));

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 6000);
    channel.subscribe((s) => {
      if (s !== "SUBSCRIBED") return;
      clearTimeout(timer);
      resolve();
    });
  });

  const result = await channel.send({
    type: "broadcast",
    event: "leak",
    payload: { secret: "cross-farm" },
  });

    await client.removeAllChannels();
    client.realtime.disconnect();
    assertEquals(result === "ok" && received.length > 0, false, "cross-farm broadcast was delivered");
  },
});
