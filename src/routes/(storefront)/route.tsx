import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties } from "react";
import { z } from "zod";
import { buildStorefrontThemeStyle } from "@/lib/cms/storefront-theme";
import { StorefrontFooter } from "@/components/storefront/storefront-footer";
import { StorefrontNav } from "@/components/storefront/storefront-nav";
import {
	cmsDefaultLocaleQueryOptions,
	cmsResolvedSectionQueryOptions,
} from "@/lib/cms/queries";
import { normalizeStoreLocale } from "@/lib/cms/utils";
import i18n from "@/i18n";
import { useEffect } from "react";

const StorefrontLayoutSearchSchema = z.object({
	locale: z.string().optional(),
});

export const Route = createFileRoute("/(storefront)")({
	validateSearch: (search) => StorefrontLayoutSearchSchema.parse(search),
	beforeLoad: async ({ context, search }) => {
		const defaultLocaleData = await context.queryClient.ensureQueryData(
			cmsDefaultLocaleQueryOptions(),
		);
		const defaultLocale =
			defaultLocaleData?.ok && defaultLocaleData.data?.locale
				? defaultLocaleData.data.locale
				: "bg";
		const locale = normalizeStoreLocale(search.locale, defaultLocale);

		// Prefetch CMS sections needed for layout (nav, footer, theme)
		await Promise.all([
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("global.nav", locale),
			),
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("global.footer", locale),
			),
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("global.theme", locale),
			),
		]);

		// Sync i18next for SSR
		if (i18n.language !== locale) {
			await i18n.changeLanguage(locale);
		}

		return { locale };
	},
	component: StorefrontLayout,
});

function StorefrontLayout() {
	const search = Route.useSearch();
	const { data: defaultLocaleData } = useQuery(cmsDefaultLocaleQueryOptions());
	const defaultLocale =
		defaultLocaleData?.ok && defaultLocaleData.data?.locale
			? defaultLocaleData.data.locale
			: "bg";
	const locale = normalizeStoreLocale(search.locale, defaultLocale);

	const { data: themeData } = useQuery(
		cmsResolvedSectionQueryOptions("global.theme", locale),
	);

	const themeContent =
		themeData?.ok && themeData.data
			? (themeData.data.translation?.content ?? {})
			: {};

	const themeStyle = buildStorefrontThemeStyle(themeContent);

	useEffect(() => {
		if (i18n.language !== locale) {
			i18n.changeLanguage(locale);
		}
	}, [locale]);

	return (
		<div
			className="storefront flex min-h-screen flex-col"
			style={themeStyle as CSSProperties}
		>
			<StorefrontNav locale={locale} />
			<main className="flex-1">
				<AnimatePresence mode="wait">
					<motion.div
						key={locale}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						<Outlet />
					</motion.div>
				</AnimatePresence>
			</main>
			<StorefrontFooter locale={locale} />
		</div>
	);
}
