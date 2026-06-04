import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Relative import (not "@/lib/qr/types") so drizzle-kit can bundle the schema
// without tsconfig path-alias resolution.
import {
  QR_CODE_TYPES,
  QR_CONTENT_TYPES,
  type QrContent,
  type QrDesign,
} from "../qr/types";

// ── Enums ───────────────────────────────────────────────────────────────────
export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);
export const qrCodeTypeEnum = pgEnum("qr_code_type", QR_CODE_TYPES);
export const qrContentTypeEnum = pgEnum("qr_content_type", QR_CONTENT_TYPES);

// ── Users (global identity; credentials provider, JWT sessions) ──────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  // Nullable: SSO-provisioned users (from the CRM handoff) have no password.
  passwordHash: text("password_hash"),
  // Links a user to its CRM user id (null for locally-created staff users).
  externalId: text("external_id").unique(),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ── Organizations (tenants) ──────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Links an org to a CRM company id (null for locally-created orgs).
  externalId: text("external_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ── Memberships (users ↔ organizations, many-to-many) ────────────────────────
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("memberships_org_user_uniq").on(t.orgId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

// ── Invitations (join an org via a shareable token link) ─────────────────────
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgRoleEnum("role").notNull().default("member"),
    token: text("token").notNull().unique(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("invitations_org_idx").on(t.orgId)],
);

// ── QR codes ──────────────────────────────────────────────────────────────────
// orgId is the tenant boundary. `slug` powers the dynamic short link /q/[slug].
export const qrCodes = pgTable(
  "qr_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    codeType: qrCodeTypeEnum("code_type").notNull().default("static"),
    contentType: qrContentTypeEnum("content_type").notNull().default("url"),
    // Structured payload fields for static codes.
    content: jsonb("content").$type<QrContent>().notNull().default({}),
    // Editable redirect destination for dynamic codes.
    targetUrl: text("target_url"),
    // Visual styling consumed by qr-code-styling.
    design: jsonb("design").$type<QrDesign>().notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("qr_codes_org_id_idx").on(t.orgId)],
);

// ── QR scans (dynamic codes only) ─────────────────────────────────────────────
// Privacy-light: we store coarse signals (UA, referer, derived device, country
// header) but never a raw IP address.
export const qrScans = pgTable(
  "qr_scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeId: uuid("code_id")
      .notNull()
      .references(() => qrCodes.id, { onDelete: "cascade" }),
    scannedAt: timestamp("scanned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    userAgent: text("user_agent"),
    referer: text("referer"),
    country: text("country"),
    deviceType: text("device_type"), // mobile | tablet | desktop | unknown
  },
  (t) => [
    index("qr_scans_code_id_idx").on(t.codeId),
    index("qr_scans_scanned_at_idx").on(t.scannedAt),
  ],
);

// ── Relations ─────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  qrCodes: many(qrCodes),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  invitations: many(invitations),
  qrCodes: many(qrCodes),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.orgId],
    references: [organizations.id],
  }),
}));

export const qrCodesRelations = relations(qrCodes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [qrCodes.orgId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [qrCodes.createdByUserId],
    references: [users.id],
  }),
  scans: many(qrScans),
}));

export const qrScansRelations = relations(qrScans, ({ one }) => ({
  code: one(qrCodes, {
    fields: [qrScans.codeId],
    references: [qrCodes.id],
  }),
}));

// ── Inferred types ────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type OrgRole = (typeof orgRoleEnum.enumValues)[number];
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
export type QrScan = typeof qrScans.$inferSelect;
export type NewQrScan = typeof qrScans.$inferInsert;
