import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
	CMS_SEED_DEFAULTS,
	PARTYPOP_THEME,
} from "@/components/admin/cms/cms-constants";
import { accessMiddleware } from "@/lib/auth/middleware";
import {
	getCachedCmsDefaultLocale,
	getCachedCmsSection,
	invalidateAllCmsCache,
	invalidateCmsSectionCache,
	setCachedCmsDefaultLocale,
	setCachedCmsSection,
} from "@/lib/cache/redis";
import { db } from "@/lib/db";
import {
	cmsAssetBinding,
	cmsLocale,
	cmsProfile,
	cmsSection,
	cmsSectionTranslation,
	cmsVersion,
} from "@/lib/db/schema";
import {
	sendCmsProfilePublishedEvent,
	sendCmsVersionCleanupEvent,
} from "@/lib/inngest/cms-events";
import { badRequest, notFound, safe } from "@/lib/result";
import { validate } from "@/lib/validation";

const ResolveCmsContentSchema = z.object({
	sectionKey: z.string().min(1),
	locale: z.string().min(2).default("en"),
	profileSlug: z.string().optional(),
});

const BootstrapCmsSchema = z.object({
	profileSlug: z.string().min(1).default("default"),
	profileName: z.string().min(1).default("Default"),
	createdBy: z.string().min(1),
});

const PublishCmsSchema = z.object({
	profileId: z.string().min(1),
	createdBy: z.string().min(1),
	notes: z.string().optional(),
});

const RollbackCmsSchema = z.object({
	profileId: z.string().min(1),
	targetVersion: z.number().int().positive(),
	createdBy: z.string().min(1),
	notes: z.string().optional(),
});

const AdminGetCmsSectionsSchema = z.object({
	profileSlug: z.string().min(1).default("default"),
});

const SetDefaultCmsLocaleSchema = z.object({
	localeCode: z.enum(["en", "bg"]),
});

const UpsertCmsSectionTranslationSchema = z.object({
	profileSlug: z.string().min(1).default("default"),
	sectionKey: z.string().min(1),
	localeCode: z.enum(["en", "bg", "bg-BG"]),
	type: z
		.enum(["hero", "banner", "feature_grid", "rich_text", "faq", "custom"])
		.default("custom"),
	title: z.string().optional(),
	subtitle: z.string().optional(),
	content: z.record(z.string(), z.unknown()).default({}),
	seo: z.record(z.string(), z.unknown()).optional(),
});

export type CmsResolvedSectionData = {
	profile: { id: string; slug: string; name: string };
	section: { id: string; key: string; type: string; schemaVersion: number };
	locale: { requested: string; resolved: string; fallbackChain: string[] };
	translation: {
		id: string;
		title: string | null;
		subtitle: string | null;
		content: Record<string, unknown> | null;
		seo: Record<string, unknown> | null;
		isPublished: boolean;
		publishedAt: Date | null;
	};
	assets: Array<(typeof cmsAssetBinding.$inferSelect)>;
};

function buildFallbackChain(inputLocale: string): string[] {
	const locale = inputLocale.trim();
	if (!locale) return ["en"];

	const parts = locale.split("-");
	const language = parts[0]?.toLowerCase();

	const chain = [locale];
	if (language && language !== locale) chain.push(language);
	if (!chain.includes("en")) chain.push("en");

	return chain;
}

export const $getResolvedCmsSection = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(ResolveCmsContentSchema, data))
	// @ts-expect-error TanStack Start handler type inference quirk with Result wrappers
	.handler(async ({ data }) => {
		return safe<CmsResolvedSectionData>(async (): Promise<CmsResolvedSectionData> => {
			if (!data.ok) throw data.error;

			// Cache-first: check Redis
			const cached = (await getCachedCmsSection(
				data.data.sectionKey,
				data.data.locale,
			)) as CmsResolvedSectionData | null;
			if (cached) return cached;

			const fallbackChain = buildFallbackChain(data.data.locale);

			const activeProfile = data.data.profileSlug
				? await db.query.cmsProfile.findFirst({
						where: and(
							eq(cmsProfile.slug, data.data.profileSlug),
							eq(cmsProfile.status, "active"),
						),
					})
				: await db.query.cmsProfile.findFirst({
						where: and(
							eq(cmsProfile.isDefault, true),
							eq(cmsProfile.status, "active"),
						),
					});

			if (!activeProfile) {
				throw notFound("No active CMS profile found").error;
			}

			const section = await db.query.cmsSection.findFirst({
				where: and(
					eq(cmsSection.profileId, activeProfile.id),
					eq(cmsSection.key, data.data.sectionKey),
					eq(cmsSection.isEnabled, true),
				),
			});

			if (!section) {
				throw notFound(`CMS section not found: ${data.data.sectionKey}`).error;
			}

			const translations = await db
				.select()
				.from(cmsSectionTranslation)
				.where(
					and(
						eq(cmsSectionTranslation.sectionId, section.id),
						inArray(cmsSectionTranslation.localeCode, fallbackChain),
					),
				);

			const selectedTranslation =
				fallbackChain
					.map((code) => translations.find((tr) => tr.localeCode === code))
					.find(Boolean) ?? null;

			if (!selectedTranslation) {
				throw notFound(
					`No translation found for section ${data.data.sectionKey} in locale chain ${fallbackChain.join(" -> ")}`,
				).error;
			}

			const assets = await db
				.select()
				.from(cmsAssetBinding)
				.where(eq(cmsAssetBinding.sectionTranslationId, selectedTranslation.id))
				.orderBy(asc(cmsAssetBinding.sortOrder));

			const result = {
				profile: {
					id: activeProfile.id,
					slug: activeProfile.slug,
					name: activeProfile.name,
				},
				section: {
					id: section.id,
					key: section.key,
					type: section.type,
					schemaVersion: section.schemaVersion,
				},
				locale: {
					requested: data.data.locale,
					resolved: selectedTranslation.localeCode,
					fallbackChain,
				},
				translation: {
					id: selectedTranslation.id,
					title: selectedTranslation.title,
					subtitle: selectedTranslation.subtitle,
					content: selectedTranslation.content,
					seo: selectedTranslation.seo,
					isPublished: selectedTranslation.isPublished,
					publishedAt: selectedTranslation.publishedAt,
				},
				assets,
			};

			// Populate cache
			await setCachedCmsSection(data.data.sectionKey, data.data.locale, result);

			return result;
		});
	});

export const $adminBootstrapCms = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(BootstrapCmsSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const profile = await db.transaction(async (tx) => {
				const existing = await tx.query.cmsProfile.findFirst({
					where: eq(cmsProfile.slug, data.data.profileSlug),
				});

				if (existing) return existing;

				const [created] = await tx
					.insert(cmsProfile)
					.values({
						slug: data.data.profileSlug,
						name: data.data.profileName,
						status: "active",
						isDefault: true,
					})
					.returning();

				await tx
					.insert(cmsLocale)
					.values([
						{
							code: "bg-BG",
							language: "bg",
							region: "BG",
							displayName: "Bulgarian (Bulgaria)",
							fallbackCode: "bg",
							isDefault: true,
							isActive: true,
							sortOrder: 1,
						},
						{
							code: "bg",
							language: "bg",
							displayName: "Bulgarian",
							fallbackCode: "en",
							isDefault: false,
							isActive: true,
							sortOrder: 2,
						},
						{
							code: "en",
							language: "en",
							displayName: "English",
							isDefault: false,
							isActive: true,
							sortOrder: 3,
						},
					])
					.onConflictDoNothing();

				const [heroSection] = await tx
					.insert(cmsSection)
					.values({
						profileId: created.id,
						key: "home.hero",
						type: "hero",
						sortOrder: 1,
						isEnabled: true,
					})
					.returning();

				await tx
					.insert(cmsSectionTranslation)
					.values([
						{
							sectionId: heroSection.id,
							localeCode: "en",
							title: "Welcome to our store",
							subtitle: "Hand-picked products, ready to ship",
							content: {
								ctaPrimary: { label: "Shop now", href: "/store/products" },
							},
							isPublished: true,
							publishedAt: new Date(),
						},
						{
							sectionId: heroSection.id,
							localeCode: "bg",
							title: "Добре дошли в нашия магазин",
							subtitle: "Подбрани продукти, готови за доставка",
							content: {
								ctaPrimary: { label: "Пазарувай", href: "/store/products" },
							},
							isPublished: true,
							publishedAt: new Date(),
						},
					])
					.onConflictDoNothing();

				return created;
			});

			return {
				profile,
				message: "CMS bootstrap completed",
			};
		});
	});

export const $adminPublishCmsProfile = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(PublishCmsSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["publish"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const profile = await db.query.cmsProfile.findFirst({
				where: eq(cmsProfile.id, data.data.profileId),
			});

			if (!profile) {
				throw notFound("CMS profile not found").error;
			}

			const allTranslations = await db
				.select({
					sectionId: cmsSectionTranslation.sectionId,
					localeCode: cmsSectionTranslation.localeCode,
					title: cmsSectionTranslation.title,
					subtitle: cmsSectionTranslation.subtitle,
					content: cmsSectionTranslation.content,
					seo: cmsSectionTranslation.seo,
					isPublished: cmsSectionTranslation.isPublished,
					publishedAt: cmsSectionTranslation.publishedAt,
				})
				.from(cmsSectionTranslation)
				.innerJoin(
					cmsSection,
					eq(cmsSection.id, cmsSectionTranslation.sectionId),
				)
				.where(eq(cmsSection.profileId, profile.id));

			if (allTranslations.length === 0) {
				throw badRequest("Cannot publish empty CMS profile").error;
			}

			const [latest] = await db
				.select({
					maxVersion: sql<number>`coalesce(max(${cmsVersion.version}), 0)`,
				})
				.from(cmsVersion)
				.where(eq(cmsVersion.profileId, profile.id));

			const nextVersion = (latest?.maxVersion ?? 0) + 1;

			const [version] = await db
				.insert(cmsVersion)
				.values({
					profileId: profile.id,
					version: nextVersion,
					status: "published",
					notes: data.data.notes,
					snapshot: {
						profile: {
							id: profile.id,
							slug: profile.slug,
							name: profile.name,
						},
						publishedAt: new Date().toISOString(),
						sections: allTranslations,
					},
					createdBy: data.data.createdBy,
					publishedAt: new Date(),
				})
				.returning();

			await db
				.update(cmsSectionTranslation)
				.set({ isPublished: true, publishedAt: new Date() })
				.where(
					inArray(
						cmsSectionTranslation.sectionId,
						(
							await db
								.select({ id: cmsSection.id })
								.from(cmsSection)
								.where(eq(cmsSection.profileId, profile.id))
						).map((item) => item.id),
					),
				);

			// Invalidate all CMS cache on publish
			await invalidateAllCmsCache();

			// Fire Inngest events (best-effort)
			await sendCmsProfilePublishedEvent({
				profileId: profile.id,
				version: version.version,
				userId: data.data.createdBy,
			});
			await sendCmsVersionCleanupEvent({
				profileId: profile.id,
				keepCount: 20,
			});

			return {
				profileId: profile.id,
				version: version.version,
				status: version.status,
				publishedAt: version.publishedAt,
			};
		});
	});

export const $adminGetCmsSections = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) => validate(AdminGetCmsSectionsSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["read"] } })])
	// @ts-expect-error TanStack Start handler type inference quirk with named schemas
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const profile = await db.query.cmsProfile.findFirst({
				where: eq(cmsProfile.slug, data.data.profileSlug),
			});

			if (!profile) {
				throw notFound("CMS profile not found").error;
			}

			const sections = await db.query.cmsSection.findMany({
				where: eq(cmsSection.profileId, profile.id),
				orderBy: [asc(cmsSection.sortOrder), asc(cmsSection.key)],
			});

			const sectionIds = sections.map((s) => s.id);
			const translations = sectionIds.length
				? await db
						.select()
						.from(cmsSectionTranslation)
						.where(inArray(cmsSectionTranslation.sectionId, sectionIds))
				: [];

			return {
				profile,
				sections: sections.map((section) => ({
					...section,
					translations: translations.filter((t) => t.sectionId === section.id),
				})),
			};
		});
	});

export const $getDefaultCmsLocale = createServerFn({ method: "GET" }).handler(
	async () => {
		return safe<{ locale: "en" | "bg"; code: string }>(async () => {
			// Cache-first
			const cached = await getCachedCmsDefaultLocale();
			if (cached) {
				const resolved = cached.startsWith("bg") ? "bg" : "en";
				return { locale: resolved as "en" | "bg", code: cached };
			}

			const defaultLocale =
				(await db.query.cmsLocale.findFirst({
					where: and(
						eq(cmsLocale.isDefault, true),
						eq(cmsLocale.isActive, true),
					),
					orderBy: [asc(cmsLocale.sortOrder), asc(cmsLocale.code)],
				})) ??
				(await db.query.cmsLocale.findFirst({
					where: eq(cmsLocale.code, "bg"),
				})) ??
				(await db.query.cmsLocale.findFirst({
					where: eq(cmsLocale.code, "en"),
				}));

			const resolved =
				defaultLocale?.language === "bg" ||
				defaultLocale?.code.toLowerCase().startsWith("bg")
					? "bg"
					: "en";

			// Populate cache
			await setCachedCmsDefaultLocale(defaultLocale?.code ?? resolved);

			return {
				locale: resolved as "en" | "bg",
				code: defaultLocale?.code ?? resolved,
			};
		});
	},
);

export const $adminSetDefaultCmsLocale = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(SetDefaultCmsLocaleSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			await db.transaction(async (tx) => {
				await tx.update(cmsLocale).set({ isDefault: false });

				const normalizedCode = data.data.localeCode === "bg" ? "bg" : "en";

				const existing = await tx.query.cmsLocale.findFirst({
					where: eq(cmsLocale.code, normalizedCode),
				});

				if (existing) {
					await tx
						.update(cmsLocale)
						.set({ isDefault: true, isActive: true, updatedAt: new Date() })
						.where(eq(cmsLocale.id, existing.id));
				} else {
					await tx.insert(cmsLocale).values({
						code: normalizedCode,
						language: normalizedCode,
						displayName: normalizedCode === "bg" ? "Bulgarian" : "English",
						fallbackCode: normalizedCode === "bg" ? "en" : undefined,
						isDefault: true,
						isActive: true,
						sortOrder: normalizedCode === "bg" ? 1 : 3,
					});
				}
			});

			// Invalidate locale cache
			await setCachedCmsDefaultLocale(data.data.localeCode);

			return {
				locale: data.data.localeCode,
			};
		});
	});

export const $adminUpsertCmsSectionTranslation = createServerFn({
	method: "POST",
})
	.inputValidator((data: unknown) =>
		validate(UpsertCmsSectionTranslationSchema, data),
	)
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	// @ts-expect-error TanStack Start handler type inference quirk with named schemas
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const profile = await db.query.cmsProfile.findFirst({
				where: eq(cmsProfile.slug, data.data.profileSlug),
			});

			if (!profile) {
				throw notFound("CMS profile not found").error;
			}

			const section =
				(await db.query.cmsSection.findFirst({
					where: and(
						eq(cmsSection.profileId, profile.id),
						eq(cmsSection.key, data.data.sectionKey),
					),
				})) ??
				(
					await db
						.insert(cmsSection)
						.values({
							profileId: profile.id,
							key: data.data.sectionKey,
							type: data.data.type,
							isEnabled: true,
						})
						.returning()
				)[0];

			const existing = await db.query.cmsSectionTranslation.findFirst({
				where: and(
					eq(cmsSectionTranslation.sectionId, section.id),
					eq(cmsSectionTranslation.localeCode, data.data.localeCode),
				),
			});

			const [saved] = existing
				? await db
						.update(cmsSectionTranslation)
						.set({
							title: data.data.title,
							subtitle: data.data.subtitle,
							content: data.data.content,
							seo: data.data.seo,
							updatedAt: new Date(),
						})
						.where(eq(cmsSectionTranslation.id, existing.id))
						.returning()
				: await db
						.insert(cmsSectionTranslation)
						.values({
							sectionId: section.id,
							localeCode: data.data.localeCode,
							title: data.data.title,
							subtitle: data.data.subtitle,
							content: data.data.content,
							seo: data.data.seo,
						})
						.returning();

			// Invalidate cache for this section
			await invalidateCmsSectionCache(data.data.sectionKey);

			return {
				profileId: profile.id,
				sectionId: section.id,
				translation: saved,
			};
		});
	});

export const $adminGetCmsVersions = createServerFn({ method: "GET" })
	.inputValidator((data: unknown) =>
		validate(
			z.object({
				profileId: z.string().min(1),
				limit: z.number().int().positive().max(100).default(20),
				offset: z.number().int().min(0).default(0),
			}),
			data,
		),
	)
	.middleware([accessMiddleware({ permissions: { products: ["read"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const versions = await db
				.select({
					id: cmsVersion.id,
					version: cmsVersion.version,
					status: cmsVersion.status,
					notes: cmsVersion.notes,
					publishedAt: cmsVersion.publishedAt,
					createdAt: cmsVersion.createdAt,
				})
				.from(cmsVersion)
				.where(eq(cmsVersion.profileId, data.data.profileId))
				.orderBy(desc(cmsVersion.version))
				.limit(data.data.limit)
				.offset(data.data.offset);

			return versions;
		});
	});

export const $adminRollbackCmsProfile = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(RollbackCmsSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["publish"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const target = await db.query.cmsVersion.findFirst({
				where: and(
					eq(cmsVersion.profileId, data.data.profileId),
					eq(cmsVersion.version, data.data.targetVersion),
				),
			});

			if (!target) {
				throw notFound("Target CMS version not found").error;
			}

			const rollbackVersion = await db.transaction(async (tx) => {
				const [latest] = await tx
					.select({
						maxVersion: sql<number>`coalesce(max(${cmsVersion.version}), 0)`,
					})
					.from(cmsVersion)
					.where(eq(cmsVersion.profileId, data.data.profileId));

				const nextVersion = (latest?.maxVersion ?? 0) + 1;

				const [version] = await tx
					.insert(cmsVersion)
					.values({
						profileId: data.data.profileId,
						version: nextVersion,
						status: "rolled_back",
						snapshot: target.snapshot,
						notes:
							data.data.notes ??
							`Rollback to v${data.data.targetVersion}`,
						createdBy: data.data.createdBy,
						publishedAt: new Date(),
					})
					.returning();

				// Restore translations from snapshot
				const snapshot = target.snapshot as {
					sections?: Array<{
						sectionId: string;
						localeCode: string;
						title: string | null;
						subtitle: string | null;
						content: Record<string, unknown> | null;
						seo: Record<string, unknown> | null;
						isPublished?: boolean;
						publishedAt?: string | Date | null;
					}>;
				} | null;

				if (snapshot && Array.isArray(snapshot.sections)) {
					// Pre-validate which section IDs still exist to avoid FK violations
					const existingSectionIds = new Set(
						(
							await tx
								.select({ id: cmsSection.id })
								.from(cmsSection)
								.where(
									eq(
										cmsSection.profileId,
										data.data.profileId,
									),
								)
						).map((s) => s.id),
					);

					for (const entry of snapshot.sections) {
						if (!existingSectionIds.has(entry.sectionId)) continue;

						await tx
							.insert(cmsSectionTranslation)
							.values({
								sectionId: entry.sectionId,
								localeCode: entry.localeCode,
								title: entry.title,
								subtitle: entry.subtitle,
								content: entry.content ?? {},
								seo: entry.seo ?? {},
								isPublished: true,
								publishedAt: new Date(),
							})
							.onConflictDoUpdate({
								target: [
									cmsSectionTranslation.sectionId,
									cmsSectionTranslation.localeCode,
								],
								set: {
									title: entry.title,
									subtitle: entry.subtitle,
									content: entry.content ?? {},
									seo: entry.seo ?? {},
									isPublished: true,
									publishedAt: new Date(),
									updatedAt: new Date(),
								},
							});
					}
				}

				return version;
			});

			// Invalidate all CMS cache so storefront picks up restored data
			await invalidateAllCmsCache();

			return {
				profileId: data.data.profileId,
				rollbackFromVersion: data.data.targetVersion,
				createdVersion: rollbackVersion.version,
				status: rollbackVersion.status,
				publishedAt: rollbackVersion.publishedAt,
			};
		});
	});

export const $adminResetCmsTheme = createServerFn({ method: "POST" })
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async () => {
		return safe(async () => {
			const profile = await db.query.cmsProfile.findFirst({
				where: eq(cmsProfile.isDefault, true),
			});

			if (!profile) {
				throw notFound("No default CMS profile found").error;
			}

			const locales: Array<{
				code: "en" | "bg";
				title: string;
				subtitle: string;
			}> = [
				{ code: "en", title: "Theme", subtitle: "Theme settings" },
				{ code: "bg", title: "Тема", subtitle: "Настройки на темата" },
			];

			for (const loc of locales) {
				const section =
					(await db.query.cmsSection.findFirst({
						where: and(
							eq(cmsSection.profileId, profile.id),
							eq(cmsSection.key, "global.theme"),
						),
					})) ??
					(
						await db
							.insert(cmsSection)
							.values({
								profileId: profile.id,
								key: "global.theme",
								type: "custom",
								isEnabled: true,
							})
							.returning()
					)[0];

				const existing = await db.query.cmsSectionTranslation.findFirst({
					where: and(
						eq(cmsSectionTranslation.sectionId, section.id),
						eq(cmsSectionTranslation.localeCode, loc.code),
					),
				});

				if (existing) {
					await db
						.update(cmsSectionTranslation)
						.set({
							title: loc.title,
							subtitle: loc.subtitle,
							content: PARTYPOP_THEME,
							updatedAt: new Date(),
						})
						.where(eq(cmsSectionTranslation.id, existing.id));
				} else {
					await db.insert(cmsSectionTranslation).values({
						sectionId: section.id,
						localeCode: loc.code,
						title: loc.title,
						subtitle: loc.subtitle,
						content: PARTYPOP_THEME,
						isPublished: true,
						publishedAt: new Date(),
					});
				}
			}

			return {
				message: "CMS theme reset to defaults for all locales",
			};
		});
	});

const BulkCreateCmsSectionsSchema = z.object({
	sections: z.array(
		z.object({
			key: z.string().min(1),
			type: z
				.enum(["hero", "banner", "feature_grid", "rich_text", "faq", "custom"])
				.default("custom"),
		}),
	),
	profileSlug: z.string().min(1).default("default"),
});

export const $adminBulkCreateCmsSections = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) =>
		validate(BulkCreateCmsSectionsSchema, data),
	)
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }) => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const profile = await db.query.cmsProfile.findFirst({
				where: eq(cmsProfile.slug, data.data.profileSlug),
			});

			if (!profile) {
				throw notFound("CMS profile not found").error;
			}

			const existingSections = await db.query.cmsSection.findMany({
				where: eq(cmsSection.profileId, profile.id),
			});
			const existingKeys = new Set(existingSections.map((s) => s.key));

			const toCreate = data.data.sections.filter(
				(s) => !existingKeys.has(s.key),
			);

			if (toCreate.length === 0) {
				return { created: 0, message: "All sections already exist" };
			}

			await db.insert(cmsSection).values(
				toCreate.map((s, i) => ({
					profileId: profile.id,
					key: s.key,
					type: s.type,
					sortOrder: existingSections.length + i + 1,
					isEnabled: true,
				})),
			);

			// Fetch newly created sections to get their IDs
			const newSections = await db.query.cmsSection.findMany({
				where: and(
					eq(cmsSection.profileId, profile.id),
					inArray(
						cmsSection.key,
						toCreate.map((s) => s.key),
					),
				),
			});

			// Create EN + BG translations for each new section
			const translationRows = newSections.flatMap((section) => {
				const defaults = CMS_SEED_DEFAULTS[section.key] ?? {};
				return ["en", "bg"].map((locale) => ({
					sectionId: section.id,
					localeCode: locale,
					title: defaults[locale]?.title ?? "",
					subtitle: defaults[locale]?.subtitle ?? "",
					content: defaults[locale]?.content ?? {},
					isPublished: true,
					publishedAt: new Date(),
				}));
			});

			if (translationRows.length > 0) {
				await db
					.insert(cmsSectionTranslation)
					.values(translationRows)
					.onConflictDoNothing();
			}

			return {
				created: toCreate.length,
				translations: translationRows.length,
				message: `Created ${toCreate.length} section(s) with ${translationRows.length} translation(s)`,
			};
		});
	});
