import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
	ArrowRight,
	Gift,
	PartyPopper,
	Sparkles,
	Star,
	Truck,
} from "lucide-react";
import { z } from "zod";
import { ProductCard } from "@/components/storefront/product-card";
import { slideUp } from "@/lib/animations/motion-config";
import {
	AnimatedCard,
	AnimatedSection,
	AnimatedStagger,
	heroChildSlideUp,
	heroImageVariants,
	heroStagger,
} from "@/lib/animations/storefront-animations";
import {
	cmsDefaultLocaleQueryOptions,
	cmsResolvedSectionQueryOptions,
} from "@/lib/cms/queries";
import { normalizeStoreLocale, pickString } from "@/lib/cms/utils";
import { $getProducts, $getStorefrontFacets } from "@/lib/ecommerce/functions";
import { env } from "@/env/client";
import { withBasePath } from "@/lib/url/with-base-path";

const StoreSearchSchema = z.object({
	locale: z.string().optional(),
});

export const Route = createFileRoute("/(storefront)/store/")({
	validateSearch: (search) => StoreSearchSchema.parse(search),
	beforeLoad: async ({ context, search }) => {
		const defaultLocaleData = await context.queryClient.ensureQueryData(
			cmsDefaultLocaleQueryOptions(),
		);
		const defaultLocale =
			defaultLocaleData?.ok && defaultLocaleData.data?.locale
				? defaultLocaleData.data.locale
				: "bg";
		const locale = normalizeStoreLocale(search.locale, defaultLocale);

		// Prefetch CMS sections and product data needed for landing page
		await Promise.all([
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("home.hero", locale),
			),
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("home.banner", locale),
			),
			context.queryClient.ensureQueryData(
				cmsResolvedSectionQueryOptions("home.newsletter", locale),
			),
		]);
	},
	component: StoreLandingPage,
});

/** Parse `{highlighted}` markers in text. Returns segments with highlight flag. */
function parseHighlight(text: string): { text: string; highlight: boolean }[] {
	const parts: { text: string; highlight: boolean }[] = [];
	const regex = /\{([^}]+)\}/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push({ text: text.slice(lastIndex, match.index), highlight: false });
		}
		parts.push({ text: match[1], highlight: true });
		lastIndex = regex.lastIndex;
	}
	if (lastIndex < text.length) {
		parts.push({ text: text.slice(lastIndex), highlight: false });
	}
	return parts.length > 0 ? parts : [{ text, highlight: false }];
}

type CmsCta = {
	label?: string;
	href?: string;
};

type HeroContent = {
	tagline?: string;
	ctaPrimary?: CmsCta;
	ctaSecondary?: CmsCta;
	heroImageUrl?: string;
};

type BannerItem = {
	title?: string;
	subtitle?: string;
};

type BannerContent = {
	shipping?: BannerItem;
	gift?: BannerItem;
	themes?: BannerItem;
	quality?: BannerItem;
};

type NewsletterContent = {
	emailPlaceholder?: string;
	buttonLabel?: string;
};

type StoreCategoryFacet = {
	id: string;
	name: string;
	count: number;
};

type StoreProductColor = {
	id: string;
	name: string;
	hexCode: string;
};

type StoreProductVariant = {
	id: string;
	color: StoreProductColor | null;
};

type StoreProductImage = {
	id: string;
	url: string;
};

type StoreProductListItem = {
	id: string;
	name: string;
	slug: string;
	basePrice: number;
	compareAtPrice: number | null;
	isFeatured: boolean;
	tags: string[];
	avgRating: number | null;
	reviewCount: number;
	images: StoreProductImage[];
	variants: StoreProductVariant[];
};

function StoreLandingPage() {
	const search = Route.useSearch();
	const { data: defaultLocaleData } = useQuery(cmsDefaultLocaleQueryOptions());
	const defaultLocale =
		defaultLocaleData?.ok && defaultLocaleData.data?.locale
			? defaultLocaleData.data.locale
			: "bg";
	const locale = normalizeStoreLocale(search.locale, defaultLocale);

	const { data: productsData } = useQuery({
		queryKey: ["storefront", "featured-products"],
		queryFn: () =>
			$getProducts({
				data: {
					page: 1,
					limit: 8,
					status: ["active"],
					sortBy: "createdAt",
					sortOrder: "desc",
				},
			}),
		staleTime: 60_000,
	});

	const { data: facetsData } = useQuery({
		queryKey: ["storefront", "facets"],
		queryFn: () => $getStorefrontFacets(),
		staleTime: 300_000,
	});

	const { data: cmsHeroData } = useQuery(
		cmsResolvedSectionQueryOptions("home.hero", locale),
	);
	const { data: cmsBannerData } = useQuery(
		cmsResolvedSectionQueryOptions("home.banner", locale),
	);
	const { data: cmsNewsletterData } = useQuery(
		cmsResolvedSectionQueryOptions("home.newsletter", locale),
	);

	const products: StoreProductListItem[] =
		productsData?.ok && productsData.data
			? (productsData.data.items as unknown as StoreProductListItem[])
			: [];

	const categories: StoreCategoryFacet[] = facetsData?.ok
		? ((facetsData.data?.categories as StoreCategoryFacet[] | undefined) ?? [])
		: [];

	const heroContent =
		cmsHeroData?.ok && cmsHeroData.data
			? (cmsHeroData.data.translation?.content ?? {})
			: {};

	const heroTitle = pickString(
		cmsHeroData?.ok ? cmsHeroData.data?.translation?.title : undefined,
		"Make Every Celebration Unforgettable",
	);
	const heroSubtitle = pickString(
		cmsHeroData?.ok ? cmsHeroData.data?.translation?.subtitle : undefined,
		"Premium party supplies, decorations, and accessories to transform any occasion into a magical experience.",
	);
	const typedHeroContent = heroContent as HeroContent;
	const heroTagline = pickString(typedHeroContent.tagline, "New Collection");
	const heroPrimaryLabel = pickString(
		typedHeroContent.ctaPrimary?.label,
		"Shop Now",
	);
	const heroPrimaryHref = pickString(
		typedHeroContent.ctaPrimary?.href,
		"/store/products",
	);
	const heroSecondaryLabel = pickString(
		typedHeroContent.ctaSecondary?.label,
		"Our Story",
	);
	const heroSecondaryHref = pickString(
		typedHeroContent.ctaSecondary?.href,
		"/store/about",
	);
	const heroImageUrl = pickString(
		typedHeroContent.heroImageUrl,
		withBasePath(env.VITE_BASE_URL, "/products/1p.png"),
	);

	const bannerContent =
		cmsBannerData?.ok && cmsBannerData.data
			? (cmsBannerData.data.translation?.content ?? {})
			: {};
	const typedBannerContent = bannerContent as BannerContent;
	const bannerShippingTitle = pickString(
		typedBannerContent.shipping?.title,
		"Free Shipping",
	);
	const bannerShippingSubtitle = pickString(
		typedBannerContent.shipping?.subtitle,
		"Orders over $75",
	);
	const bannerGiftTitle = pickString(
		typedBannerContent.gift?.title,
		"Gift Wrapping",
	);
	const bannerGiftSubtitle = pickString(
		typedBannerContent.gift?.subtitle,
		"Available at checkout",
	);
	const bannerThemesTitle = pickString(
		typedBannerContent.themes?.title,
		"500+ Themes",
	);
	const bannerThemesSubtitle = pickString(
		typedBannerContent.themes?.subtitle,
		"For any occasion",
	);
	const bannerQualityTitle = pickString(
		typedBannerContent.quality?.title,
		"Premium Quality",
	);
	const bannerQualitySubtitle = pickString(
		typedBannerContent.quality?.subtitle,
		"Satisfaction guaranteed",
	);

	const newsletterContent =
		cmsNewsletterData?.ok && cmsNewsletterData.data
			? (cmsNewsletterData.data.translation?.content ?? {})
			: {};
	const newsletterTitle = pickString(
		cmsNewsletterData?.ok
			? cmsNewsletterData.data?.translation?.title
			: undefined,
		"Stay in the Party Loop",
	);
	const newsletterSubtitle = pickString(
		cmsNewsletterData?.ok
			? cmsNewsletterData.data?.translation?.subtitle
			: undefined,
		"Subscribe for exclusive deals, new arrivals, and party planning tips.",
	);
	const typedNewsletterContent = newsletterContent as NewsletterContent;
	const newsletterPlaceholder = pickString(
		typedNewsletterContent.emailPlaceholder,
		"your@email.com",
	);
	const newsletterButtonLabel = pickString(
		typedNewsletterContent.buttonLabel,
		"Subscribe",
	);

	const ui = locale === "bg"
		? {
			featuredProductAlt: "Препоръчан продукт",
			ratingLabel: "4.9 Рейтинг",
			reviewsLabel: "2,000+ Отзива",
			shopByCategory: "Пазарувай по категория",
			shopByCategorySubtitle: "Намери всичко необходимо за перфектното ти парти",
			items: "артикула",
			featuredProducts: "Препоръчани продукти",
			featuredProductsSubtitle: "Най-популярните ни парти предложения",
			viewAll: "Виж всички",
			viewAllProducts: "Виж всички продукти",
		}
		: {
			featuredProductAlt: "Featured product",
			ratingLabel: "4.9 Rating",
			reviewsLabel: "2,000+ Reviews",
			shopByCategory: "Shop by Category",
			shopByCategorySubtitle: "Find everything you need for your perfect party",
			items: "items",
			featuredProducts: "Featured Products",
			featuredProductsSubtitle: "Our most popular party essentials",
			viewAll: "View All",
			viewAllProducts: "View All Products",
		};

	return (
		<>
			{/* Hero Section */}
			<section className="relative overflow-hidden bg-gradient-to-br from-[var(--sf-rose)] via-[#fb7185] to-[var(--sf-orange)]">
				{/* Decorative blobs */}
				<div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
				<div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

				<div className="sf-container relative z-10 py-14 md:py-20">
					<div className="grid items-center gap-10 md:grid-cols-2">
						<motion.div
							className="space-y-6 text-white"
							variants={heroStagger}
							initial="hidden"
							animate="visible"
						>
							<motion.span
								variants={heroChildSlideUp}
								className="sf-badge inline-flex bg-white/20 text-white backdrop-blur-sm"
							>
								<Sparkles className="mr-1.5 h-3.5 w-3.5" />
								{heroTagline}
							</motion.span>
							<motion.h1
								variants={heroChildSlideUp}
								className="text-4xl font-bold leading-tight md:text-6xl"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								{parseHighlight(heroTitle).map((seg, i) =>
									seg.highlight ? (
										<span key={i} className="text-yellow-200">
											{seg.text}
										</span>
									) : (
										<span key={i}>{seg.text}</span>
									),
								)}
							</motion.h1>
							<motion.p
								variants={heroChildSlideUp}
								className="max-w-lg text-lg text-white/80"
							>
								{heroSubtitle}
							</motion.p>
							<motion.div
								variants={heroChildSlideUp}
								className="flex flex-wrap gap-4"
							>
								<Link
									to={heroPrimaryHref as string}
									className="sf-btn-primary inline-flex items-center gap-2 !bg-white !text-[var(--sf-rose)] hover:!bg-yellow-100"
								>
									{heroPrimaryLabel}
									<ArrowRight className="h-4 w-4" />
								</Link>
								<Link
									to={heroSecondaryHref as string}
									className="sf-btn-outline inline-flex items-center gap-2 !border-white/50 !text-white hover:!bg-white/10"
								>
									{heroSecondaryLabel}
								</Link>
							</motion.div>
						</motion.div>

						{/* Hero image */}
						<motion.div
							className="relative hidden md:block"
							variants={heroImageVariants}
							initial="hidden"
							animate="visible"
						>
							<div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl">
								<img
									src={heroImageUrl}
									alt={ui.featuredProductAlt}
									className="h-[28rem] w-full object-cover"
								/>
							</div>
							{/* Floating badge */}
							<motion.div
								className="absolute -bottom-4 -left-4 rounded-2xl bg-white p-4 shadow-xl"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.6, duration: 0.5 }}
							>
								<div className="flex items-center gap-2">
									<div className="rounded-full bg-[var(--sf-rose)]/10 p-2">
										<Star className="h-5 w-5 text-[var(--sf-rose)]" />
									</div>
									<div>
										<div className="text-sm font-bold text-[var(--sf-text)]">
											{ui.ratingLabel}
										</div>
										<div className="text-xs text-[var(--sf-text-muted)]">
											{ui.reviewsLabel}
										</div>
									</div>
								</div>
							</motion.div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Trust Badges */}
			<AnimatedSection
				as="section"
				className="border-b border-[var(--sf-border-light)] bg-white py-4"
			>
				<div className="sf-container">
					<AnimatedStagger
						fast
						className="grid grid-cols-2 gap-6 md:grid-cols-4"
					>
						<motion.div variants={slideUp} className="flex items-center gap-3">
							<div className="rounded-full bg-[var(--sf-rose)]/10 p-2.5">
								<Truck className="h-5 w-5 text-[var(--sf-rose)]" />
							</div>
							<div>
								<div className="text-sm font-semibold">
									{bannerShippingTitle}
								</div>
								<div className="text-xs text-[var(--sf-text-muted)]">
									{bannerShippingSubtitle}
								</div>
							</div>
						</motion.div>
						<motion.div variants={slideUp} className="flex items-center gap-3">
							<div className="rounded-full bg-[var(--sf-orange)]/10 p-2.5">
								<Gift className="h-5 w-5 text-[var(--sf-orange)]" />
							</div>
							<div>
								<div className="text-sm font-semibold">{bannerGiftTitle}</div>
								<div className="text-xs text-[var(--sf-text-muted)]">
									{bannerGiftSubtitle}
								</div>
							</div>
						</motion.div>
						<motion.div variants={slideUp} className="flex items-center gap-3">
							<div className="rounded-full bg-emerald-500/10 p-2.5">
								<PartyPopper className="h-5 w-5 text-emerald-500" />
							</div>
							<div>
								<div className="text-sm font-semibold">{bannerThemesTitle}</div>
								<div className="text-xs text-[var(--sf-text-muted)]">
									{bannerThemesSubtitle}
								</div>
							</div>
						</motion.div>
						<motion.div variants={slideUp} className="flex items-center gap-3">
							<div className="rounded-full bg-sky-500/10 p-2.5">
								<Sparkles className="h-5 w-5 text-sky-500" />
							</div>
							<div>
								<div className="text-sm font-semibold">
									{bannerQualityTitle}
								</div>
								<div className="text-xs text-[var(--sf-text-muted)]">
									{bannerQualitySubtitle}
								</div>
							</div>
						</motion.div>
					</AnimatedStagger>
				</div>
			</AnimatedSection>

			{/* Categories */}
			<AnimatedSection as="section" className="py-10">
				<div className="sf-container">
					<div className="mb-10 text-center">
						<h2
							className="text-3xl font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{ui.shopByCategory}
						</h2>
						<p className="mt-2 text-[var(--sf-text-muted)]">
							{ui.shopByCategorySubtitle}
						</p>
					</div>

					<AnimatedStagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{categories.slice(0, 4).map((cat, i) => {
							const gradients = [
								"from-rose-400 to-pink-500",
								"from-orange-400 to-amber-500",
								"from-emerald-400 to-teal-500",
								"from-sky-400 to-blue-500",
							];
							const emojis = ["👕", "📱", "👟", "💎"];
							return (
								<AnimatedCard key={cat.id}>
									<Link
										to={`/store/products?category=${cat.id}` as string}
										className="group relative block overflow-hidden rounded-3xl p-8 text-center text-white transition-transform"
									>
										<div
											className={`absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]} opacity-90`}
										/>
										<div className="relative z-10">
											<div className="mb-3 text-4xl">
												{emojis[i % emojis.length]}
											</div>
											<h3 className="text-lg font-bold">{cat.name}</h3>
											<p className="mt-1 text-sm text-white/70">
												{cat.count} {ui.items}
											</p>
										</div>
									</Link>
								</AnimatedCard>
							);
						})}
					</AnimatedStagger>
				</div>
			</AnimatedSection>

			{/* Featured Products */}
			<AnimatedSection as="section" className="bg-white py-10">
				<div className="sf-container">
					<div className="mb-10 flex items-center justify-between">
						<div>
							<h2
								className="text-3xl font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								{ui.featuredProducts}
							</h2>
							<p className="mt-2 text-[var(--sf-text-muted)]">
								{ui.featuredProductsSubtitle}
							</p>
						</div>
						<Link
							to={"/store/products" as string}
							className="sf-btn-outline hidden items-center gap-2 text-sm md:inline-flex"
						>
							{ui.viewAll}
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>

					<AnimatedStagger className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
						{products.map((product) => {
							const colorSwatches = [
								...new Map(
									(product.variants ?? [])
										.filter(
											(
												variant,
											): variant is StoreProductVariant & {
												color: StoreProductColor;
											} => Boolean(variant.color),
										)
										.map((variant) => [variant.color.id, variant.color]),
								).values(),
							] as StoreProductColor[];
							return (
								<AnimatedCard key={product.id}>
									<ProductCard
										productId={product.id}
										name={product.name}
										slug={product.slug}
										price={product.basePrice}
										compareAtPrice={product.compareAtPrice}
										imageUrl={
											product.images?.[0]?.url ||
											withBasePath(env.VITE_BASE_URL, `/products/${product.slug}.png`)
										}
										badge={product.isFeatured ? "hot" : null}
										tags={product.tags}
										rating={
											product.avgRating ? Number(product.avgRating) : undefined
										}
										reviewCount={product.reviewCount}
										colorSwatches={colorSwatches}
										defaultVariantId={product.variants?.[0]?.id}
									/>
								</AnimatedCard>
							);
						})}
					</AnimatedStagger>

					<div className="mt-8 text-center md:hidden">
						<Link
							to={"/store/products" as string}
							className="sf-btn-outline inline-flex items-center gap-2 text-sm"
						>
							{ui.viewAllProducts}
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				</div>
			</AnimatedSection>

			{/* Newsletter */}
			<AnimatedSection
				as="section"
				className="relative overflow-hidden bg-gradient-to-r from-[var(--sf-rose)] to-[var(--sf-orange)] py-16"
			>
				<div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
				<div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

				<div className="sf-container relative z-10 text-center text-white">
					<h2
						className="text-3xl font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						{newsletterTitle}
					</h2>
					<p className="mx-auto mt-3 max-w-md text-white/80">
						{newsletterSubtitle}
					</p>
					<form
						className="mx-auto mt-6 flex max-w-md gap-3"
						onSubmit={(e) => e.preventDefault()}
					>
						<input
							type="email"
							placeholder={newsletterPlaceholder}
							className="flex-1 rounded-full border-2 border-white/30 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/60 backdrop-blur-sm focus:border-white focus:outline-none"
						/>
						<button
							type="submit"
							className="sf-btn-primary !bg-white !text-[var(--sf-rose)] hover:!bg-yellow-100"
						>
							{newsletterButtonLabel}
						</button>
					</form>
				</div>
			</AnimatedSection>
		</>
	);
}
