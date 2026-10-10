/**
 * CMS Query Options & Hooks
 *
 * Query option factories for CMS data.
 * Follows the pattern from src/lib/ecommerce/queries.ts.
 */

import { queryOptions, useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants";
import type { Result } from "@/lib/result";
import {
	$adminGetCmsSections,
	$adminGetCmsVersions,
	$getDefaultCmsLocale,
	$getResolvedCmsSection,
	type CmsResolvedSectionData,
} from "@/lib/cms/functions/content";

// =============================================================================
// ADMIN QUERY OPTIONS
// =============================================================================

export const adminCmsSectionsQueryOptions = (profileSlug = "default") =>
	queryOptions({
		queryKey: QUERY_KEYS.CMS.SECTIONS(profileSlug),
		queryFn: () => $adminGetCmsSections({ data: { profileSlug } }),
		staleTime: 1000 * 30,
	});

export const adminCmsVersionsQueryOptions = (
	profileId: string,
	limit = 20,
	offset = 0,
) =>
	queryOptions({
		queryKey: [...QUERY_KEYS.CMS.VERSIONS(profileId), limit, offset],
		queryFn: () => $adminGetCmsVersions({ data: { profileId, limit, offset } }),
		staleTime: 1000 * 15,
		enabled: !!profileId,
	});

// =============================================================================
// STOREFRONT QUERY OPTIONS
// =============================================================================

export const cmsDefaultLocaleQueryOptions = () =>
	queryOptions({
		queryKey: QUERY_KEYS.CMS.DEFAULT_LOCALE,
		queryFn: async () =>
		(await $getDefaultCmsLocale()) as Result<{ locale: "en" | "bg"; code: string }>,
		staleTime: 1000 * 60 * 5,
	});

export const cmsResolvedSectionQueryOptions = (
	sectionKey: string,
	locale: string,
) =>
	queryOptions({
		queryKey: QUERY_KEYS.CMS.RESOLVED_SECTION(sectionKey, locale),
		queryFn: async () =>
			(await $getResolvedCmsSection({
				data: { sectionKey, locale },
			})) as Result<CmsResolvedSectionData>,
		staleTime: 1000 * 60,
		retry: 1,
	});

// =============================================================================
// HOOKS (convenience wrappers)
// =============================================================================

export const useAdminCmsSections = (profileSlug = "default") =>
	useQuery(adminCmsSectionsQueryOptions(profileSlug));

export const useAdminCmsVersions = (
	profileId: string,
	limit = 20,
	offset = 0,
) => useQuery(adminCmsVersionsQueryOptions(profileId, limit, offset));

export const useCmsDefaultLocale = () =>
	useQuery(cmsDefaultLocaleQueryOptions());

export const useCmsResolvedSection = (sectionKey: string, locale: string) =>
	useQuery(cmsResolvedSectionQueryOptions(sectionKey, locale));
