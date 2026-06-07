// Local signature settings for PDF reports.
const KEY = "farm_signature_settings_v1";

export type SignatureAlign = "left" | "center" | "right";

export const REPORT_TYPES = [
  "inventory",
  "calendar",
  "capital-injections",
  "profit-distribution",
  "notebook",
  "venture",
  "analytics",
  "pnl",
  "reports",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface SignatureSettings {
  enabled: boolean;
  image: string | null;       // dataURL (PNG/JPG)
  signerName: string;
  signerTitle: string;
  align: SignatureAlign;
  heightMm: number;           // signature image height in mm
  marginBottomMm: number;     // gap from footer line
  perReport: Record<string, boolean>;
}

const DEFAULTS: SignatureSettings = {
  enabled: false,
  image: null,
  signerName: "",
  signerTitle: "",
  align: "right",
  heightMm: 18,
  marginBottomMm: 22,
  perReport: Object.fromEntries(REPORT_TYPES.map((t) => [t, true])),
};

export function getSignatureSettings(): SignatureSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      perReport: { ...DEFAULTS.perReport, ...(parsed.perReport || {}) },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSignatureSettings(s: SignatureSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function isSignatureEnabledFor(reportType?: string): boolean {
  const s = getSignatureSettings();
  if (!s.enabled || !s.image) return false;
  if (!reportType) return true;
  return s.perReport[reportType] !== false;
}
