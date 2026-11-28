export interface InventoryBulkChange {
  id: string;
  changes: Record<string, string | number>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVENTORY_NUMBER_FIELDS = ["quantity", "unit_cost", "min_threshold"] as const;
const INVENTORY_TEXT_FIELDS = ["location", "supplier"] as const;

export function buildInventoryBulkChange(value: unknown): InventoryBulkChange | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !UUID_PATTERN.test(record.id)) return null;

  const changes: Record<string, string | number> = {};
  for (const field of INVENTORY_NUMBER_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) continue;
    if (typeof record[field] !== "number" || !Number.isFinite(record[field])) return null;
    changes[field] = record[field];
  }

  for (const field of INVENTORY_TEXT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) continue;
    if (typeof record[field] !== "string" || record[field].length > 500) return null;
    changes[field] = record[field];
  }

  if (Object.keys(changes).length === 0) return null;
  return { id: record.id, changes };
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export function normalizeCopilotMessages(value: unknown): CopilotMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const normalized: CopilotMessage[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
    const message = entry as Record<string, unknown>;
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") {
      return null;
    }
    normalized.push({ role: message.role, content: message.content });
  }

  return normalized;
}