/**
 * CMS Mutation Hooks
 *
 * Mutation hooks for all CMS write operations.
 * Follows the pattern from src/hooks/ecommerce-actions.ts.
 */

import { MUTATION_KEYS, QUERY_KEYS } from "@/constants";
import { useAction, type ActionFn } from "@/hooks/use-action";
import {
	$adminUpsertCmsSectionTranslation,
	$adminPublishCmsProfile,
	$adminRollbackCmsProfile,
	$adminSetDefaultCmsLocale,
	$adminResetCmsTheme,
} from "@/lib/cms/functions/content";

// Server function return types are complex (OptionalFetcher) and don't directly
// match ActionFn generics. We cast through unknown to align with the pattern.
// This is safe because server functions always return Result<T, HttpError>.
// biome-ignore lint: type assertion needed for TanStack Start server fn types
const asAction = <TIn, TOut>(fn: (vars: TIn) => Promise<any>) =>
	fn as unknown as ActionFn<TIn, TOut>;

// =============================================================================
// TRANSLATION
// =============================================================================

type UpsertVars = {
	profileSlug: string;
	sectionKey: string;
	localeCode: string;
	type: string;
	title: string;
	subtitle: string;
	content: Record<string, unknown>;
	seo?: Record<string, unknown>;
};

export function useUpsertCmsTranslation() {
	return useAction(
		asAction<UpsertVars, unknown>(
			async (vars) => $adminUpsertCmsSectionTranslation({ data: vars }),
		),
		{
			mutationKey: MUTATION_KEYS.CMS.UPSERT_TRANSLATION,
			invalidate: [QUERY_KEYS.CMS.SECTIONS_BASE],
			showToast: true,
		},
	);
}

// =============================================================================
// PUBLISH & ROLLBACK
// =============================================================================

export function usePublishCms() {
	return useAction(
		asAction<{ profileId: string; createdBy: string; notes?: string }, unknown>(
			async (vars) => $adminPublishCmsProfile({ data: vars }),
		),
		{
			mutationKey: MUTATION_KEYS.CMS.PUBLISH,
			invalidate: [
				QUERY_KEYS.CMS.SECTIONS_BASE,
				QUERY_KEYS.CMS.VERSIONS_BASE,
			],
			showToast: true,
		},
	);
}

export function useRollbackCms() {
	return useAction(
		asAction<{ profileId: string; targetVersion: number; createdBy: string; notes?: string }, unknown>(
			async (vars) => $adminRollbackCmsProfile({ data: vars }),
		),
		{
			mutationKey: MUTATION_KEYS.CMS.ROLLBACK,
			invalidate: [
				QUERY_KEYS.CMS.SECTIONS_BASE,
				QUERY_KEYS.CMS.VERSIONS_BASE,
			],
			showToast: true,
		},
	);
}

// =============================================================================
// LOCALE
// =============================================================================

export function useSetDefaultCmsLocale() {
	return useAction(
		asAction<{ localeCode: string }, unknown>(
			async (vars) => $adminSetDefaultCmsLocale({ data: vars }),
		),
		{
			mutationKey: MUTATION_KEYS.CMS.SET_DEFAULT_LOCALE,
			invalidate: [QUERY_KEYS.CMS.DEFAULT_LOCALE],
			showToast: true,
		},
	);
}

// =============================================================================
// THEME
// =============================================================================

type ThemeVars = {
	profileSlug: string;
	sectionKey: string;
	localeCode: string;
	type: string;
	title: string;
	subtitle: string;
	content: Record<string, unknown>;
};

export function useSaveCmsTheme() {
	return useAction(
		asAction<ThemeVars, unknown>(
			async (vars) => $adminUpsertCmsSectionTranslation({ data: vars }),
		),
		{
			mutationKey: MUTATION_KEYS.CMS.SAVE_THEME,
			invalidate: [QUERY_KEYS.CMS.SECTIONS_BASE],
			showToast: true,
		},
	);
}

export function useResetCmsTheme() {
	return useAction(
		asAction<void, unknown>(async () => {
			const result = await $adminResetCmsTheme();
			return result;
		}),
		{
			mutationKey: MUTATION_KEYS.CMS.RESET_THEME,
			invalidate: [QUERY_KEYS.CMS.SECTIONS_BASE],
			showToast: true,
		},
	);
}

// =============================================================================
// CREATE SECTION
// =============================================================================

export function useCreateCmsSection() {
	return useAction(
		asAction<ThemeVars, unknown>(
			async (vars) => $adminUpsertCmsSectionTranslation({ data: vars }),
		),
		{
			mutationKey: MUTATION_KEYS.CMS.CREATE_SECTION,
			invalidate: [QUERY_KEYS.CMS.SECTIONS_BASE],
			showToast: true,
		},
	);
}

// =============================================================================
// BULK CREATE SECTIONS (SEED)
// =============================================================================

type BulkCreateVars = {
	sections: Array<{ key: string; type: string }>;
	profileSlug?: string;
};

export function useBulkCreateCmsSections() {
	return useAction(
		asAction<BulkCreateVars, unknown>(async (vars) => {
			const { $adminBulkCreateCmsSections } = await import(
				"@/lib/cms/functions/content"
			);
			return $adminBulkCreateCmsSections({ data: vars });
		}),
		{
			mutationKey: MUTATION_KEYS.CMS.CREATE_SECTION,
			invalidate: [QUERY_KEYS.CMS.SECTIONS_BASE],
			showToast: true,
		},
	);
}
