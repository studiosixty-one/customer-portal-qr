/**
 * Shared domain types for the QR generator.
 *
 * Single source of truth for the QR type/content-type unions and the shapes
 * stored in JSONB columns. Imported by the Drizzle schema (which derives the
 * Postgres enums from these arrays) and by UI code, so it must NOT import from
 * the schema (avoids a circular dependency).
 */

// ── QR code type ──────────────────────────────────────────────────────────────
// static  = encodes its payload directly (any content type), no tracking.
// dynamic = encodes /q/[slug]; the redirect target is editable and scans are logged.
export const QR_CODE_TYPES = ["static", "dynamic"] as const;
export type QrCodeType = (typeof QR_CODE_TYPES)[number];

// ── Content types (static codes) ────────────────────────────────────────────────
export const QR_CONTENT_TYPES = [
  "url",
  "text",
  "email",
  "phone",
  "sms",
  "wifi",
  "vcard",
  "geo",
] as const;
export type QrContentType = (typeof QR_CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<QrContentType, string> = {
  url: "Website / URL",
  text: "Plain text",
  email: "Email",
  phone: "Phone",
  sms: "SMS",
  wifi: "Wi-Fi",
  vcard: "Contact card (vCard)",
  geo: "Location",
};

// ── Structured content (only the active type's field is populated) ────────────────
export type QrContent = {
  url?: string;
  text?: string;
  email?: { to?: string; subject?: string; body?: string };
  phone?: string;
  sms?: { number?: string; message?: string };
  wifi?: {
    ssid?: string;
    password?: string;
    encryption?: "WPA" | "WEP" | "nopass";
    hidden?: boolean;
  };
  vcard?: {
    firstName?: string;
    lastName?: string;
    org?: string;
    title?: string;
    phone?: string;
    email?: string;
    url?: string;
    address?: string;
  };
  geo?: { lat?: string; lng?: string };
};

// ── Design (consumed by qr-code-styling) ─────────────────────────────────────────
export type QrDotType =
  | "square"
  | "dots"
  | "rounded"
  | "classy"
  | "classy-rounded"
  | "extra-rounded";
export type QrCornerSquareType = "square" | "dot" | "extra-rounded";
export type QrCornerDotType = "square" | "dot";
export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export type QrDesign = {
  size?: number; // px, rendered/exported square size
  margin?: number; // quiet-zone (px)
  errorCorrection?: QrErrorCorrection;
  foreground?: string; // dots color (hex)
  background?: string; // background color (hex)
  gradient?: boolean; // 2-color linear gradient for the dots
  gradientColor?: string; // second gradient stop
  dotType?: QrDotType;
  cornerSquareType?: QrCornerSquareType;
  cornerDotType?: QrCornerDotType;
  logo?: string; // uploaded logo as a data URL (optional)
  logoSize?: number; // 0..1 relative size of the logo
  logoMargin?: number; // px margin carved out around the logo
};

export const DEFAULT_DESIGN: QrDesign = {
  size: 300,
  margin: 2,
  errorCorrection: "M",
  foreground: "#000000",
  background: "#ffffff",
  gradient: false,
  gradientColor: "#3b82f6",
  dotType: "square",
  cornerSquareType: "square",
  cornerDotType: "square",
  logoSize: 0.4,
  logoMargin: 6,
};

export const DOT_TYPE_OPTIONS: { value: QrDotType; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "dots", label: "Dots" },
  { value: "rounded", label: "Rounded" },
  { value: "classy", label: "Classy" },
  { value: "classy-rounded", label: "Classy rounded" },
  { value: "extra-rounded", label: "Extra rounded" },
];

export const CORNER_SQUARE_OPTIONS: { value: QrCornerSquareType; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
  { value: "extra-rounded", label: "Extra rounded" },
];

export const CORNER_DOT_OPTIONS: { value: QrCornerDotType; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
];

export const ERROR_CORRECTION_OPTIONS: {
  value: QrErrorCorrection;
  label: string;
}[] = [
  { value: "L", label: "Low (7%)" },
  { value: "M", label: "Medium (15%)" },
  { value: "Q", label: "Quartile (25%)" },
  { value: "H", label: "High (30%)" },
];
