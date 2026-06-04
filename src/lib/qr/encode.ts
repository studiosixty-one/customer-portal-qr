import type { QrContent, QrContentType } from "./types";

// WIFI payloads escape \ ; , : and "  (per the de-facto MECARD-style format).
function wifiEsc(s: string): string {
  return s.replace(/([\\;,:"])/g, "\\$1");
}

// vCard 3.0 escapes \ ; , and newlines.
function vcardEsc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Build the raw string a STATIC QR code should encode for the given content
 * type. (Dynamic codes always encode their /q/[slug] short link instead — see
 * publicCodeUrl — so this is only used for static codes and live previews.)
 */
export function encodeStaticPayload(
  contentType: QrContentType,
  content: QrContent,
): string {
  switch (contentType) {
    case "url":
      return content.url?.trim() ?? "";
    case "text":
      return content.text ?? "";
    case "email": {
      const e = content.email ?? {};
      const params = new URLSearchParams();
      if (e.subject) params.set("subject", e.subject);
      if (e.body) params.set("body", e.body);
      const qs = params.toString();
      return `mailto:${e.to ?? ""}${qs ? `?${qs}` : ""}`;
    }
    case "phone":
      return `tel:${(content.phone ?? "").replace(/\s+/g, "")}`;
    case "sms": {
      const s = content.sms ?? {};
      const num = (s.number ?? "").replace(/\s+/g, "");
      return s.message ? `SMSTO:${num}:${s.message}` : `SMSTO:${num}`;
    }
    case "wifi": {
      const w = content.wifi ?? {};
      const enc = w.encryption ?? "WPA";
      const parts = [`T:${enc}`, `S:${wifiEsc(w.ssid ?? "")}`];
      if (enc !== "nopass") parts.push(`P:${wifiEsc(w.password ?? "")}`);
      if (w.hidden) parts.push("H:true");
      return `WIFI:${parts.join(";")};;`;
    }
    case "vcard": {
      const v = content.vcard ?? {};
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${vcardEsc(v.lastName ?? "")};${vcardEsc(v.firstName ?? "")};;;`,
        `FN:${vcardEsc(`${v.firstName ?? ""} ${v.lastName ?? ""}`.trim())}`,
      ];
      if (v.org) lines.push(`ORG:${vcardEsc(v.org)}`);
      if (v.title) lines.push(`TITLE:${vcardEsc(v.title)}`);
      if (v.phone) lines.push(`TEL;TYPE=CELL:${vcardEsc(v.phone)}`);
      if (v.email) lines.push(`EMAIL:${vcardEsc(v.email)}`);
      if (v.url) lines.push(`URL:${vcardEsc(v.url)}`);
      if (v.address) lines.push(`ADR:;;${vcardEsc(v.address)};;;;`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    case "geo": {
      const g = content.geo ?? {};
      return `geo:${g.lat ?? "0"},${g.lng ?? "0"}`;
    }
    default:
      return "";
  }
}
