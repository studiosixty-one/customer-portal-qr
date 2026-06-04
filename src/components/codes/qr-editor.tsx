"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Download,
  ImagePlus,
  Save,
  Trash2,
} from "lucide-react";

import { updateCode } from "@/lib/qr/actions";
import { encodeStaticPayload } from "@/lib/qr/encode";
import { publicCodeUrl } from "@/lib/public-url";
import type { ScanStats } from "@/lib/qr/queries";
import {
  CONTENT_TYPE_LABELS,
  CORNER_DOT_OPTIONS,
  CORNER_SQUARE_OPTIONS,
  DEFAULT_DESIGN,
  DOT_TYPE_OPTIONS,
  ERROR_CORRECTION_OPTIONS,
  QR_CONTENT_TYPES,
  type QrCodeType,
  type QrContent,
  type QrContentType,
  type QrDesign,
} from "@/lib/qr/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { QrPreview, type QrPreviewHandle } from "@/components/codes/qr-preview";
import { ScanAnalytics } from "@/components/codes/qr-analytics";

export type EditorCode = {
  id: string;
  slug: string;
  name: string;
  codeType: QrCodeType;
  contentType: QrContentType;
  content: QrContent;
  targetUrl: string | null;
  design: QrDesign;
  isActive: boolean;
};

const MAX_LOGO_BYTES = 1_000_000;

export function QrEditor({
  code,
  stats,
}: {
  code: EditorCode;
  stats: ScanStats | null;
}) {
  const [name, setName] = useState(code.name);
  const [codeType, setCodeType] = useState<QrCodeType>(code.codeType);
  const [contentType, setContentType] = useState<QrContentType>(
    code.contentType,
  );
  const [content, setContent] = useState<QrContent>(code.content ?? {});
  const [targetUrl, setTargetUrl] = useState(code.targetUrl ?? "");
  const [isActive, setIsActive] = useState(code.isActive);
  const [design, setDesign] = useState<QrDesign>({
    ...DEFAULT_DESIGN,
    ...code.design,
  });
  const [pending, startTransition] = useTransition();
  const previewRef = useRef<QrPreviewHandle>(null);

  const shortUrl = publicCodeUrl(code.slug);

  const previewData = useMemo(() => {
    if (codeType === "dynamic") return shortUrl;
    return encodeStaticPayload(contentType, content);
  }, [codeType, contentType, content, shortUrl]);

  function patchContent<K extends keyof QrContent>(key: K, value: QrContent[K]) {
    setContent((c) => ({ ...c, [key]: value }));
  }
  function patchDesign(value: Partial<QrDesign>) {
    setDesign((d) => ({ ...d, ...value }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateCode(code.id, {
          name,
          codeType,
          contentType,
          content,
          targetUrl: codeType === "dynamic" ? targetUrl.trim() || null : null,
          design,
          isActive,
        });
        toast.success("Saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save changes");
      }
    });
  }

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo is too large (max 1 MB). Use a small PNG/SVG.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patchDesign({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function copyShortUrl() {
    await navigator.clipboard.writeText(shortUrl);
    toast.success("Short link copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin" aria-label="Back to codes">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Edit code</h1>
            <p className="text-sm text-muted-foreground">
              Design it on the left, preview and download on the right.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={pending}>
          <Save className="size-4" />
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── Controls ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Internal name (e.g. Poster — spring campaign)"
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <TypeButton
                    active={codeType === "static"}
                    title="Static"
                    desc="Encodes data directly"
                    onClick={() => setCodeType("static")}
                  />
                  <TypeButton
                    active={codeType === "dynamic"}
                    title="Dynamic"
                    desc="Editable link + scan tracking"
                    onClick={() => setCodeType("dynamic")}
                  />
                </div>
              </div>

              {codeType === "dynamic" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">Destination URL</Label>
                    <Input
                      id="target"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://example.com/landing"
                      inputMode="url"
                    />
                    <p className="text-xs text-muted-foreground">
                      The printed code points at a short link you can re-target
                      anytime — without reprinting.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Short link</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={shortUrl} className="font-mono text-xs" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyShortUrl}
                        aria-label="Copy short link"
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <span className="text-sm">
                      <span className="font-medium">Active</span>
                      <span className="block text-xs text-muted-foreground">
                        When off, the link returns “not available”.
                      </span>
                    </span>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Content type</Label>
                    <Select
                      value={contentType}
                      onValueChange={(v) => setContentType(v as QrContentType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QR_CONTENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {CONTENT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ContentFields
                    contentType={contentType}
                    content={content}
                    patch={patchContent}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Design</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ColorField
                  label="Foreground"
                  value={design.foreground ?? "#000000"}
                  onChange={(v) => patchDesign({ foreground: v })}
                />
                <ColorField
                  label="Background"
                  value={design.background ?? "#ffffff"}
                  onChange={(v) => patchDesign({ background: v })}
                />
              </div>

              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Gradient dots</span>
                <Switch
                  checked={design.gradient ?? false}
                  onCheckedChange={(c) => patchDesign({ gradient: c })}
                />
              </label>
              {design.gradient && (
                <ColorField
                  label="Gradient end color"
                  value={design.gradientColor ?? "#3b82f6"}
                  onChange={(v) => patchDesign({ gradientColor: v })}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Dot style"
                  value={design.dotType ?? "square"}
                  options={DOT_TYPE_OPTIONS}
                  onChange={(v) =>
                    patchDesign({ dotType: v as QrDesign["dotType"] })
                  }
                />
                <SelectField
                  label="Error correction"
                  value={design.errorCorrection ?? "M"}
                  options={ERROR_CORRECTION_OPTIONS}
                  onChange={(v) =>
                    patchDesign({
                      errorCorrection: v as QrDesign["errorCorrection"],
                    })
                  }
                />
                <SelectField
                  label="Corner square"
                  value={design.cornerSquareType ?? "square"}
                  options={CORNER_SQUARE_OPTIONS}
                  onChange={(v) =>
                    patchDesign({
                      cornerSquareType: v as QrDesign["cornerSquareType"],
                    })
                  }
                />
                <SelectField
                  label="Corner dot"
                  value={design.cornerDotType ?? "square"}
                  options={CORNER_DOT_OPTIONS}
                  onChange={(v) =>
                    patchDesign({
                      cornerDotType: v as QrDesign["cornerDotType"],
                    })
                  }
                />
              </div>

              <SliderField
                label="Quiet zone (margin)"
                value={design.margin ?? 2}
                min={0}
                max={20}
                step={1}
                onChange={(v) => patchDesign({ margin: v })}
              />
              <SliderField
                label="Size"
                value={design.size ?? 300}
                min={120}
                max={1000}
                step={20}
                suffix="px"
                onChange={(v) => patchDesign({ size: v })}
              />

              <div className="space-y-2">
                <Label>Logo (optional)</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <ImagePlus className="size-4" />
                      {design.logo ? "Replace logo" : "Upload logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onLogoFile}
                      />
                    </label>
                  </Button>
                  {design.logo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patchDesign({ logo: undefined })}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  )}
                </div>
                {design.logo && (
                  <SliderField
                    label="Logo size"
                    value={Math.round((design.logoSize ?? 0.4) * 100)}
                    min={10}
                    max={50}
                    step={5}
                    suffix="%"
                    onChange={(v) => patchDesign({ logoSize: v / 100 })}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Preview / download / analytics ───────────────────────── */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center rounded-lg border bg-[var(--background)] p-4">
                {previewData ? (
                  <QrPreview
                    ref={previewRef}
                    data={previewData}
                    design={design}
                    fileName={code.slug}
                    className="[&>canvas]:!h-auto [&>canvas]:!w-full [&>canvas]:max-w-[280px]"
                  />
                ) : (
                  <div className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-md bg-muted text-center text-sm text-muted-foreground">
                    Add content to generate the code.
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={!previewData}
                  onClick={() => previewRef.current?.download("png")}
                >
                  <Download className="size-4" />
                  PNG
                </Button>
                <Button
                  variant="outline"
                  disabled={!previewData}
                  onClick={() => previewRef.current?.download("svg")}
                >
                  <Download className="size-4" />
                  SVG
                </Button>
              </div>
            </CardContent>
          </Card>

          {codeType === "dynamic" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <ScanAnalytics stats={stats} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Save this code as dynamic to start tracking scans.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small field helpers ─────────────────────────────────────────────────────

function TypeButton({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-lg border p-3 text-left transition-colors " +
        (active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:bg-muted/50")
      }
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs uppercase"
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

// ── Per-content-type field sets ─────────────────────────────────────────────

function ContentFields({
  contentType,
  content,
  patch,
}: {
  contentType: QrContentType;
  content: QrContent;
  patch: <K extends keyof QrContent>(key: K, value: QrContent[K]) => void;
}) {
  switch (contentType) {
    case "url":
      return (
        <Field label="URL">
          <Input
            value={content.url ?? ""}
            onChange={(e) => patch("url", e.target.value)}
            placeholder="https://example.com"
            inputMode="url"
          />
        </Field>
      );
    case "text":
      return (
        <Field label="Text">
          <Textarea
            value={content.text ?? ""}
            onChange={(e) => patch("text", e.target.value)}
            placeholder="Any plain text…"
            rows={4}
          />
        </Field>
      );
    case "email":
      return (
        <div className="space-y-4">
          <Field label="To">
            <Input
              type="email"
              value={content.email?.to ?? ""}
              onChange={(e) =>
                patch("email", { ...content.email, to: e.target.value })
              }
              placeholder="hello@example.com"
            />
          </Field>
          <Field label="Subject">
            <Input
              value={content.email?.subject ?? ""}
              onChange={(e) =>
                patch("email", { ...content.email, subject: e.target.value })
              }
            />
          </Field>
          <Field label="Body">
            <Textarea
              value={content.email?.body ?? ""}
              onChange={(e) =>
                patch("email", { ...content.email, body: e.target.value })
              }
              rows={3}
            />
          </Field>
        </div>
      );
    case "phone":
      return (
        <Field label="Phone number">
          <Input
            type="tel"
            value={content.phone ?? ""}
            onChange={(e) => patch("phone", e.target.value)}
            placeholder="+44 20 7946 0000"
          />
        </Field>
      );
    case "sms":
      return (
        <div className="space-y-4">
          <Field label="Phone number">
            <Input
              type="tel"
              value={content.sms?.number ?? ""}
              onChange={(e) =>
                patch("sms", { ...content.sms, number: e.target.value })
              }
            />
          </Field>
          <Field label="Message">
            <Textarea
              value={content.sms?.message ?? ""}
              onChange={(e) =>
                patch("sms", { ...content.sms, message: e.target.value })
              }
              rows={3}
            />
          </Field>
        </div>
      );
    case "wifi":
      return (
        <div className="space-y-4">
          <Field label="Network name (SSID)">
            <Input
              value={content.wifi?.ssid ?? ""}
              onChange={(e) =>
                patch("wifi", { ...content.wifi, ssid: e.target.value })
              }
            />
          </Field>
          <Field label="Password">
            <Input
              value={content.wifi?.password ?? ""}
              onChange={(e) =>
                patch("wifi", { ...content.wifi, password: e.target.value })
              }
            />
          </Field>
          <Field label="Encryption">
            <Select
              value={content.wifi?.encryption ?? "WPA"}
              onValueChange={(v) =>
                patch("wifi", {
                  ...content.wifi,
                  encryption: v as "WPA" | "WEP" | "nopass",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WPA">WPA/WPA2</SelectItem>
                <SelectItem value="WEP">WEP</SelectItem>
                <SelectItem value="nopass">None</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">Hidden network</span>
            <Switch
              checked={content.wifi?.hidden ?? false}
              onCheckedChange={(c) =>
                patch("wifi", { ...content.wifi, hidden: c })
              }
            />
          </label>
        </div>
      );
    case "vcard":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <Input
                value={content.vcard?.firstName ?? ""}
                onChange={(e) =>
                  patch("vcard", { ...content.vcard, firstName: e.target.value })
                }
              />
            </Field>
            <Field label="Last name">
              <Input
                value={content.vcard?.lastName ?? ""}
                onChange={(e) =>
                  patch("vcard", { ...content.vcard, lastName: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Organization">
            <Input
              value={content.vcard?.org ?? ""}
              onChange={(e) =>
                patch("vcard", { ...content.vcard, org: e.target.value })
              }
            />
          </Field>
          <Field label="Title">
            <Input
              value={content.vcard?.title ?? ""}
              onChange={(e) =>
                patch("vcard", { ...content.vcard, title: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                value={content.vcard?.phone ?? ""}
                onChange={(e) =>
                  patch("vcard", { ...content.vcard, phone: e.target.value })
                }
              />
            </Field>
            <Field label="Email">
              <Input
                value={content.vcard?.email ?? ""}
                onChange={(e) =>
                  patch("vcard", { ...content.vcard, email: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Website">
            <Input
              value={content.vcard?.url ?? ""}
              onChange={(e) =>
                patch("vcard", { ...content.vcard, url: e.target.value })
              }
            />
          </Field>
          <Field label="Address">
            <Input
              value={content.vcard?.address ?? ""}
              onChange={(e) =>
                patch("vcard", { ...content.vcard, address: e.target.value })
              }
            />
          </Field>
        </div>
      );
    case "geo":
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <Input
              value={content.geo?.lat ?? ""}
              onChange={(e) =>
                patch("geo", { ...content.geo, lat: e.target.value })
              }
              placeholder="51.5074"
              inputMode="decimal"
            />
          </Field>
          <Field label="Longitude">
            <Input
              value={content.geo?.lng ?? ""}
              onChange={(e) =>
                patch("geo", { ...content.geo, lng: e.target.value })
              }
              placeholder="-0.1278"
              inputMode="decimal"
            />
          </Field>
        </div>
      );
    default:
      return null;
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
