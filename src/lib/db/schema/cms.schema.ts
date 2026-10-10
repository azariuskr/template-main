import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema";

export const cmsProfileStatusEnum = pgEnum("cms_profile_status", [
  "draft",
  "active",
  "archived",
]);

export const cmsVersionStatusEnum = pgEnum("cms_version_status", [
  "draft",
  "published",
  "rolled_back",
]);

export const cmsSectionTypeEnum = pgEnum("cms_section_type", [
  "hero",
  "banner",
  "feature_grid",
  "rich_text",
  "faq",
  "custom",
]);

export const cmsProfile = pgTable(
  "cms_profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    isDefault: boolean("is_default").default(false).notNull(),
    status: cmsProfileStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cms_profile_slug_idx").on(table.slug),
    index("cms_profile_status_idx").on(table.status),
    index("cms_profile_is_default_idx").on(table.isDefault),
  ],
);

export const cmsLocale = pgTable(
  "cms_locale",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(), // e.g. bg-BG, bg, en
    language: text("language").notNull(), // e.g. bg, en
    region: text("region"), // e.g. BG
    displayName: text("display_name").notNull(),
    fallbackCode: text("fallback_code"),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cms_locale_code_idx").on(table.code),
    index("cms_locale_language_idx").on(table.language),
    index("cms_locale_is_default_idx").on(table.isDefault),
    index("cms_locale_is_active_idx").on(table.isActive),
  ],
);

export const cmsSection = pgTable(
  "cms_section",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => cmsProfile.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // unique within profile (e.g. home.hero.primary)
    type: cmsSectionTypeEnum("type").default("custom").notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cms_section_profile_id_idx").on(table.profileId),
    index("cms_section_key_idx").on(table.key),
    uniqueIndex("cms_section_profile_key_unique_idx").on(
      table.profileId,
      table.key,
    ),
  ],
);

export const cmsSectionTranslation = pgTable(
  "cms_section_translation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => cmsSection.id, { onDelete: "cascade" }),
    localeCode: text("locale_code").notNull(),
    title: text("title"),
    subtitle: text("subtitle"),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    seo: jsonb("seo").$type<Record<string, unknown>>(),
    isPublished: boolean("is_published").default(false).notNull(),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cms_section_translation_section_id_idx").on(table.sectionId),
    index("cms_section_translation_locale_code_idx").on(table.localeCode),
    uniqueIndex("cms_section_translation_section_locale_unique_idx").on(
      table.sectionId,
      table.localeCode,
    ),
  ],
);

export const cmsAssetBinding = pgTable(
  "cms_asset_binding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionTranslationId: uuid("section_translation_id")
      .notNull()
      .references(() => cmsSectionTranslation.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(), // e.g. hero.background, card.1.image
    fileId: uuid("file_id"), // intentionally no FK yet to keep integration simple
    assetUrl: text("asset_url"),
    altText: text("alt_text"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cms_asset_binding_translation_id_idx").on(table.sectionTranslationId),
    index("cms_asset_binding_slot_idx").on(table.slot),
    uniqueIndex("cms_asset_binding_translation_slot_unique_idx").on(
      table.sectionTranslationId,
      table.slot,
    ),
  ],
);

export const cmsVersion = pgTable(
  "cms_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => cmsProfile.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: cmsVersionStatusEnum("status").default("draft").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    notes: text("notes"),
    publishedAt: timestamp("published_at"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cms_version_profile_id_idx").on(table.profileId),
    index("cms_version_status_idx").on(table.status),
    uniqueIndex("cms_version_profile_version_unique_idx").on(
      table.profileId,
      table.version,
    ),
  ],
);

export const cmsProfileRelations = relations(cmsProfile, ({ many }) => ({
  sections: many(cmsSection),
  versions: many(cmsVersion),
}));

export const cmsSectionRelations = relations(cmsSection, ({ one, many }) => ({
  profile: one(cmsProfile, {
    fields: [cmsSection.profileId],
    references: [cmsProfile.id],
  }),
  translations: many(cmsSectionTranslation),
}));

export const cmsSectionTranslationRelations = relations(
  cmsSectionTranslation,
  ({ one, many }) => ({
    section: one(cmsSection, {
      fields: [cmsSectionTranslation.sectionId],
      references: [cmsSection.id],
    }),
    assets: many(cmsAssetBinding),
  }),
);

export const cmsAssetBindingRelations = relations(cmsAssetBinding, ({ one }) => ({
  sectionTranslation: one(cmsSectionTranslation, {
    fields: [cmsAssetBinding.sectionTranslationId],
    references: [cmsSectionTranslation.id],
  }),
}));

export const cmsVersionRelations = relations(cmsVersion, ({ one }) => ({
  profile: one(cmsProfile, {
    fields: [cmsVersion.profileId],
    references: [cmsProfile.id],
  }),
  author: one(user, {
    fields: [cmsVersion.createdBy],
    references: [user.id],
  }),
}));
