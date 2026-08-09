import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

async function call(name: string, headers: Record<string, string> = {}, body: unknown = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

const JWT_PROTECTED = [
  "venture-ai-advisor",
  "calculate-profit-loss",
  "generate-farm-report",
  "bulk-inventory-update",
  "farm-copilot",
  "manage-users",
];

Deno.test("JWT-protected functions reject a missing Authorization header", async () => {
  for (const name of JWT_PROTECTED) {
    const { status } = await call(name);
    assertEquals(status, 401, `${name} did not return 401 without a token`);
  }
});

Deno.test("JWT-protected functions reject a malformed bearer token", async () => {
  for (const name of JWT_PROTECTED) {
    const { status } = await call(name, { Authorization: "Bearer not-a-real-jwt" });
    assertEquals(status, 401, `${name} accepted a malformed token`);
  }
});

Deno.test("JWT-protected functions reject a non-bearer Authorization scheme", async () => {
  for (const name of JWT_PROTECTED) {
    const { status } = await call(name, { Authorization: "Basic dXNlcjpwYXNz" });
    assertEquals(status, 401, `${name} accepted a non-bearer scheme`);
  }
});

Deno.test("rejected calls never leak internal error details", async () => {
  for (const name of JWT_PROTECTED) {
    const { body } = await call(name, { Authorization: "Bearer not-a-real-jwt" });
    const lowered = body.toLowerCase();
    assertEquals(lowered.includes("relation "), false, `${name} leaked SQL detail`);
    assertEquals(lowered.includes("supabase_admin"), false, `${name} leaked a database role`);
    assertEquals(lowered.includes("service_role"), false, `${name} leaked a key name`);
    assertEquals(lowered.includes("at async"), false, `${name} leaked a stack trace`);
  }
});

Deno.test("admin-only manage-users rejects an unauthenticated create attempt", async () => {
  const { status } = await call("manage-users", {}, {
    action: "create",
    email: "attacker@example.com",
    password: "Password123!",
    name: "Attacker",
    role: "admin",
  });
  assertEquals(status, 401);
});
