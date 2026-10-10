import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Heart,
	Leaf,
	Shield,
	Smile,
	Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
	cmsDefaultLocaleQueryOptions,
	cmsResolvedSectionQueryOptions,
} from "@/lib/cms/queries";
import { normalizeStoreLocale, pickString } from "@/lib/cms/utils";
import { env } from "@/env/client";
import { withBasePath } from "@/lib/url/with-base-path";

export const Route = createFileRoute("/(storefront)/store/about")({
	validateSearch: (search: Record<string, unknown>) => ({
		locale: typeof search.locale === "string" ? search.locale : undefined,
	}),
	beforeLoad: async ({ context, search }) => {
		const defaultLocaleData = await context.queryClient.ensureQueryData(
			cmsDefaultLocaleQueryOptions(),
		);
		const defaultLocale =
			defaultLocaleData?.ok && defaultLocaleData.data?.locale
				? defaultLocaleData.data.locale
				: "bg";
		const locale = normalizeStoreLocale(search.locale, defaultLocale);

		await Promise.all([
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("about.hero", locale),
			),
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("about.story", locale),
			),
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("about.values", locale),
			),
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("about.cta", locale),
			),
		]);
	},
	component: AboutPage,
});

function AboutPage() {
	const { t } = useTranslation("about");
	const search = Route.useSearch();
	const { data: defaultLocaleData } = useQuery(cmsDefaultLocaleQueryOptions());
	const locale = normalizeStoreLocale(
		search.locale,
		defaultLocaleData?.ok ? defaultLocaleData.data.locale : "bg",
	);

	// CMS: about.hero
	const { data: heroData } = useQuery(cmsResolvedSectionQueryOptions("about.hero", locale));
	const heroContent = heroData?.ok && heroData.data ? (heroData.data.translation?.content ?? {}) as Record<string, unknown> : {};
	const heroBadge = pickString(heroData?.ok ? heroData.data?.translation?.title : undefined, "Est. 2015");
	const heroHeading = pickString(heroData?.ok ? heroData.data?.translation?.subtitle : undefined, "");
	const heroSubheading = pickString(heroContent.subheading as string | undefined, "");

	// CMS: about.story
	const { data: storyData } = useQuery(cmsResolvedSectionQueryOptions("about.story", locale));
	const storyContent = storyData?.ok && storyData.data ? (storyData.data.translation?.content ?? {}) as Record<string, unknown> : {};
	const storyHeading = pickString(storyContent.heading as string | undefined, "From a Garage to a Global Party");
	const storyParagraphs = Array.isArray(storyContent.paragraphs) ? (storyContent.paragraphs as string[]) : [];
	const storyStats = Array.isArray(storyContent.stats) ? (storyContent.stats as Array<{ value: string; label: string }>) : [];

	// CMS: about.values
	const { data: valuesData } = useQuery(cmsResolvedSectionQueryOptions("about.values", locale));
	const valuesContent = valuesData?.ok && valuesData.data ? (valuesData.data.translation?.content ?? {}) as Record<string, unknown> : {};
	const valuesHeading = pickString(valuesContent.heading as string | undefined, "Why We Party Different");
	const valuesSubtitle = pickString(valuesContent.subtitle as string | undefined, "We take fun seriously. Here are the core values that guide every confetti cannon we launch.");
	const valuesCards = Array.isArray(valuesContent.cards) ? (valuesContent.cards as Array<{ title: string; description: string }>) : [];

	// CMS: about.cta
	const { data: ctaData } = useQuery(cmsResolvedSectionQueryOptions("about.cta", locale));
	const ctaContent = ctaData?.ok && ctaData.data ? (ctaData.data.translation?.content ?? {}) as Record<string, unknown> : {};
	const ctaHeading = pickString(ctaContent.heading as string | undefined, "Ready to plan your next event?");
	const ctaDescription = pickString(ctaContent.description as string | undefined, "Join thousands of happy party planners and discover the magic of stress-free celebrations.");
	const ctaPrimaryLabel = pickString(ctaContent.primaryLabel as string | undefined, "Start Shopping");
	const ctaPrimaryHref = pickString(ctaContent.primaryHref as string | undefined, "/store/products");
	const ctaSecondaryLabel = pickString(ctaContent.secondaryLabel as string | undefined, "Contact Support");
	const ctaSecondaryHref = pickString(ctaContent.secondaryHref as string | undefined, "/store/contact");

	// Fallback data arrays
	const defaultValueCards = [
		{ title: "Eco-Conscious Fun", description: "We are committed to reducing plastic waste. 80% of our products are biodegradable or reusable, because the planet deserves a party too." },
		{ title: "Curated Quality", description: "No flimsy forks here. We hand-pick and test every item to ensure it survives the cake cutting and the dance floor." },
		{ title: "Customer Joy", description: "Our happiness guarantee is simple: if it doesn't make you smile, we'll fix it. We are obsessed with your satisfaction." },
	];
	const valueCardIcons = [
		<Leaf key="leaf" className="h-6 w-6" />,
		<Shield key="shield" className="h-6 w-6" />,
		<Smile key="smile" className="h-6 w-6" />,
	];
	const valueCardColors = [
		"bg-[var(--sf-rose)]/10 text-[var(--sf-rose)]",
		"bg-[var(--sf-orange)]/10 text-[var(--sf-orange)]",
		"bg-sky-500/10 text-sky-500",
	];

	const defaultStats = [
		{ value: "1M+", label: "Parties Hosted" },
		{ value: "500+", label: "Unique Themes" },
		{ value: "50", label: "Team Members" },
	];

	const defaultParagraphs = [
		"It all started when our founder, Sarah, spent weeks trying to find stylish, comfortable clothes for her growing kids — only to end up with scratchy fabrics and boring designs.",
		"She realized that finding quality, stylish clothes for kids shouldn't be so hard. Armed with a passion for design and a small collection of samples, KinderZone was born.",
		"Today, we curate the world's most delightful children's clothing and accessories, testing every fabric, stitch, and design to ensure it brings joy to kids and parents alike. We aren't just selling clothes; we're dressing little ones for their best adventures.",
	];

	const resolvedParagraphs = storyParagraphs.length > 0 ? storyParagraphs : defaultParagraphs;
	const resolvedStats = storyStats.length > 0 ? storyStats : defaultStats;
	const resolvedValueCards = valuesCards.length > 0 ? valuesCards : defaultValueCards;

	return (
		<>
			{/* Hero */}
			<section className="relative overflow-hidden pb-20 pt-16 lg:pb-32 lg:pt-24">
				<div className="sf-container relative z-10 text-center">
					<span className="sf-badge mb-6 inline-flex items-center gap-1.5 bg-[var(--sf-rose)]/10 text-[var(--sf-rose)]">
						<Star className="h-3.5 w-3.5" />
						{heroBadge}
					</span>
					<h1
						className="text-4xl font-bold leading-tight md:text-6xl"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						{heroHeading || (<>Making memories,<br />one <span className="text-[var(--sf-rose)]">pop</span> at a time.</>)}
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-[var(--sf-text-muted)]">
						{heroSubheading || "We believe that every celebration, big or small, deserves a sprinkle of magic. We're on a mission to make party planning as fun as the party itself."}
					</p>
				</div>

				{/* Decorative blobs */}
				<div className="absolute left-10 top-1/4 -z-10 h-64 w-64 rounded-full bg-[var(--sf-rose-light)]/20 blur-3xl" />
				<div className="absolute bottom-0 right-10 -z-10 h-80 w-80 rounded-full bg-[var(--sf-orange)]/10 blur-3xl" />
			</section>

			{/* The Story */}
			<section className="border-y border-[var(--sf-border-light)] bg-white py-20">
				<div className="sf-container">
					<div className="grid items-center gap-16 lg:grid-cols-2">
						<div className="space-y-6">
							<h2
								className="text-3xl font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								{storyHeading}
							</h2>
							<div className="space-y-4 leading-relaxed text-[var(--sf-text-muted)]">
								{resolvedParagraphs.map((p, i) => (
									<p key={i}>{p}</p>
								))}
							</div>

							{/* Stats */}
							<div className="grid grid-cols-3 gap-6 border-t border-[var(--sf-border-light)] pt-6">
								{resolvedStats.map((stat, i) => (
									<div key={i}>
										<div
											className="text-2xl font-bold text-[var(--sf-rose)]"
											style={{ fontFamily: "'Varela Round', sans-serif" }}
										>
											{stat.value}
										</div>
										<div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--sf-text-light)]">
											{stat.label}
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Image Grid */}
						<div className="relative">
							<div className="absolute -inset-4 -z-10 rotate-2 rounded-3xl bg-[var(--sf-bg-warm)]" />
							<div className="grid grid-cols-2 gap-4">
								<div className="aspect-[3/4] overflow-hidden rounded-2xl bg-[var(--sf-border-light)]">
									<img
										src={withBasePath(env.VITE_BASE_URL, "/products/1p.png")}
										alt={t("partySetupAlt")}
										className="h-full w-full object-cover transition-transform duration-500 hover:-translate-y-1"
									/>
								</div>
								<div className="space-y-4 pt-8">
									<div className="aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--sf-border-light)]">
										<img
											src={withBasePath(env.VITE_BASE_URL, "/products/2p.png")}
											alt={t("balloonArchAlt")}
											className="h-full w-full object-cover transition-transform duration-500 hover:-translate-y-1"
										/>
									</div>
									<div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--sf-rose)] p-6 text-white shadow-lg">
										<Heart className="mb-2 h-8 w-8" />
										<span
											className="font-semibold"
											style={{ fontFamily: "'Varela Round', sans-serif" }}
										>
											{t("madeWithLove")}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Values */}
			<section className="py-20">
				<div className="sf-container">
					<div className="mx-auto mb-16 max-w-2xl text-center">
						<h2
							className="text-3xl font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{valuesHeading}
						</h2>
						<p className="mt-4 text-[var(--sf-text-muted)]">
							{valuesSubtitle}
						</p>
					</div>

					<div className="grid gap-8 md:grid-cols-3">
						{resolvedValueCards.map((card, i) => (
							<div key={i} className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-8 transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
								<div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${valueCardColors[i] ?? valueCardColors[0]} transition-transform group-hover:scale-110`}>
									{valueCardIcons[i] ?? valueCardIcons[0]}
								</div>
								<h3
									className="mb-3 text-lg font-bold"
									style={{ fontFamily: "'Varela Round', sans-serif" }}
								>
									{card.title}
								</h3>
								<p className="text-sm leading-relaxed text-[var(--sf-text-muted)]">
									{card.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="sf-container mb-20">
				<div className="relative overflow-hidden rounded-3xl bg-slate-900 p-12 text-center">
					<div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-[var(--sf-rose)] opacity-10 blur-3xl" />
					<div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-sky-500 opacity-10 blur-3xl" />

					<div className="relative z-10 mx-auto max-w-2xl">
						<h2
							className="text-3xl font-bold text-white"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{ctaHeading}
						</h2>
						<p className="mt-4 text-slate-300">
							{ctaDescription}
						</p>
						<div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
							<Link
								to={ctaPrimaryHref as string}
								className="sf-btn-primary inline-flex items-center justify-center gap-2 !bg-white !text-slate-900 hover:!bg-slate-50"
							>
								{ctaPrimaryLabel}
								<ArrowRight className="h-4 w-4" />
							</Link>
							<Link
								to={ctaSecondaryHref as string}
								className="sf-btn-outline inline-flex items-center justify-center gap-2 !border-slate-700 !text-white hover:!bg-slate-800"
							>
								{ctaSecondaryLabel}
							</Link>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
