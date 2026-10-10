import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Filter, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductCard } from "@/components/storefront/product-card";
import { formatPrice } from "@/constants";
import {
	$getProductOptions,
	$getProducts,
	$getStorefrontFacets,
} from "@/lib/ecommerce/functions";
import { useWishlist } from "@/lib/ecommerce/queries";
import {
	cmsDefaultLocaleQueryOptions,
	cmsResolvedSectionQueryOptions,
} from "@/lib/cms/queries";
import { pickString, normalizeStoreLocale } from "@/lib/cms/utils";

export const Route = createFileRoute("/(storefront)/store/products/")({
	component: ProductCatalogPage,
	validateSearch: (search: Record<string, unknown>) => ({
		locale: (search.locale as string) || "",
		q: (search.q as string) || "",
		category: (search.category as string) || "",
		brand: (search.brand as string) || "",
		sort: (search.sort as string) || "createdAt:desc",
		colors: (search.colors as string) || "",
		sizes: (search.sizes as string) || "",
		priceMin: search.priceMin ? Number(search.priceMin) : undefined,
		priceMax: search.priceMax ? Number(search.priceMax) : undefined,
		page: search.page ? Number(search.page) : 1,
	}),
});

type ProductSearchParams = {
	locale: string;
	q: string;
	category: string;
	brand: string;
	sort: string;
	colors: string;
	sizes: string;
	priceMin: number | undefined;
	priceMax: number | undefined;
	page: number;
};
type ProductSortBy = "name" | "basePrice" | "createdAt" | "totalStock";
type ProductSortOrder = "asc" | "desc";
type CategoryFacet = { id: string; name: string; count: number };
type BrandFacet = { id: string; name: string; count: number };
type ColorFacet = { id: string; name: string; count: number; hexCode: string };
type SizeFacet = { id: string; name: string; count: number };
type ProductListImage = {
	id: string;
	url: string;
	altText: string | null;
	isPrimary: boolean;
};
type ProductListColor = { id: string; name: string; hexCode: string };
type ProductListVariant = {
	id: string;
	colorId: string | null;
	color: ProductListColor | null;
};
type ProductListItem = {
	id: string;
	name: string;
	slug: string;
	basePrice: number;
	salePrice: number | null;
	isFeatured: boolean;
	tags: string[];
	images: ProductListImage[];
	variants: ProductListVariant[];
};

function ProductCatalogPage() {
	const { t } = useTranslation("catalog");
	const { t: tCommon } = useTranslation("common");
	const searchParams = Route.useSearch();
	const navigate = useNavigate();
	const [showFilters, setShowFilters] = useState(false);
	const [localSearch, setLocalSearch] = useState(searchParams.q);

	// Parse URL state
	const page = searchParams.page || 1;
	const [rawSortBy, rawSortOrder] = (
		searchParams.sort || "createdAt:desc"
	).split(":");
	const sortBy: ProductSortBy =
		rawSortBy === "name" ||
		rawSortBy === "basePrice" ||
		rawSortBy === "createdAt" ||
		rawSortBy === "totalStock"
			? rawSortBy
			: "createdAt";
	const sortOrder: ProductSortOrder = rawSortOrder === "asc" ? "asc" : "desc";
	const selectedColorIds = searchParams.colors
		? searchParams.colors.split(",")
		: [];
	const selectedSizeIds = searchParams.sizes
		? searchParams.sizes.split(",")
		: [];

	// Update URL search params
	const updateSearch = useCallback(
		(updates: Partial<ProductSearchParams>) => {
			navigate({
				to: "/store/products",
				search: (prev: Record<string, unknown>) =>
					({
						...prev,
						...updates,
						page: updates.page ?? 1,
					}) as ProductSearchParams,
				replace: true,
			});
		},
		[navigate],
	);

	// Fetch products
	const { data: productsData, isLoading } = useQuery({
		queryKey: [
			"storefront",
			"products",
			{
				page,
				search: searchParams.q,
				sortBy,
				sortOrder,
				categoryId: searchParams.category,
				brandId: searchParams.brand,
				colorIds: selectedColorIds.length > 0 ? selectedColorIds : undefined,
				sizeIds: selectedSizeIds.length > 0 ? selectedSizeIds : undefined,
				priceMin: searchParams.priceMin,
				priceMax: searchParams.priceMax,
			},
		],
		queryFn: () =>
			$getProducts({
				data: {
					page,
					limit: 12,
					search: searchParams.q || undefined,
					sortBy,
					sortOrder,
					categoryId: searchParams.category || undefined,
					brandId: searchParams.brand || undefined,
					colorIds: selectedColorIds.length > 0 ? selectedColorIds : undefined,
					sizeIds: selectedSizeIds.length > 0 ? selectedSizeIds : undefined,
					priceMin: searchParams.priceMin,
					priceMax: searchParams.priceMax,
					status: ["active"],
				},
			}),
		staleTime: 30_000,
	});

	// Fetch facets (categories, brands, price range)
	const { data: facetsData } = useQuery({
		queryKey: ["storefront", "facets"],
		queryFn: () => $getStorefrontFacets(),
		staleTime: 300_000,
	});

	// Fetch color/size options
	const { data: optionsData } = useQuery({
		queryKey: ["storefront", "product-options"],
		queryFn: () => $getProductOptions(),
		staleTime: 300_000,
	});

	// CMS content
	const { data: defaultLocaleData } = useQuery(cmsDefaultLocaleQueryOptions());
	const locale = normalizeStoreLocale(
		searchParams.locale,
		defaultLocaleData?.ok ? defaultLocaleData.data.locale : "bg",
	);
	const { data: cmsData } = useQuery(cmsResolvedSectionQueryOptions("shop.catalog", locale));
	const cmsContent = cmsData?.ok && cmsData.data ? (cmsData.data.translation?.content ?? {}) as Record<string, unknown> : {};
	const cmsHeading = pickString(cmsData?.ok ? cmsData.data?.translation?.title : undefined, "All Products");
	const cmsSubtitle = pickString(cmsData?.ok ? cmsData.data?.translation?.subtitle : undefined, "");
	const cmsEmptyState = pickString(cmsContent.emptyState, "No products found");
	// Wishlist state
	const { data: wishlistData } = useWishlist();
	const wishlistIds = useMemo(
		() => (wishlistData?.ok ? (wishlistData.data?.productIds ?? []) : []),
		[wishlistData],
	);

	const products = (
		productsData?.ok ? (productsData.data?.items ?? []) : []
	) as ProductListItem[];
	const totalPages = productsData?.ok
		? (productsData.data?.totalPages ?? 1)
		: 1;
	const total = productsData?.ok ? (productsData.data?.total ?? 0) : 0;
	const categories = (
		facetsData?.ok ? (facetsData.data?.categories ?? []) : []
	) as CategoryFacet[];
	const brands = (
		facetsData?.ok ? (facetsData.data?.brands ?? []) : []
	) as BrandFacet[];
	const priceRange = facetsData?.ok
		? (facetsData.data?.priceRange ?? { min: 0, max: 0 })
		: { min: 0, max: 0 };
	const colors = (
		optionsData?.ok ? (optionsData.data?.colors ?? []) : []
	) as ColorFacet[];
	const sizes = (
		optionsData?.ok ? (optionsData.data?.sizes ?? []) : []
	) as SizeFacet[];

	const sortOptions = [
		{ label: t("sortNewest"), value: "createdAt:desc" },
		{ label: t("sortPriceLow"), value: "basePrice:asc" },
		{ label: t("sortPriceHigh"), value: "basePrice:desc" },
		{ label: t("sortNameAZ"), value: "name:asc" },
		{ label: t("sortFeatured"), value: "totalStock:desc" },
	];

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		updateSearch({ q: localSearch.trim() });
	};

	const toggleColor = (colorId: string) => {
		const next = selectedColorIds.includes(colorId)
			? selectedColorIds.filter((c) => c !== colorId)
			: [...selectedColorIds, colorId];
		updateSearch({ colors: next.join(",") || undefined });
	};

	const toggleSize = (sizeId: string) => {
		const next = selectedSizeIds.includes(sizeId)
			? selectedSizeIds.filter((s) => s !== sizeId)
			: [...selectedSizeIds, sizeId];
		updateSearch({ sizes: next.join(",") || undefined });
	};

	const activeFilterCount =
		(searchParams.category ? 1 : 0) +
		(searchParams.brand ? 1 : 0) +
		selectedColorIds.length +
		selectedSizeIds.length +
		(searchParams.priceMin !== undefined ? 1 : 0) +
		(searchParams.priceMax !== undefined ? 1 : 0);

	const clearAllFilters = () => {
		navigate({
			to: "/store/products",
			search: { locale, q: "", category: "", brand: "", colors: "", sizes: "", priceMin: undefined, priceMax: undefined, page: 1, sort: searchParams.sort } as ProductSearchParams,
			replace: true,
		});
		setLocalSearch("");
	};

	const selectedCategory = categories.find(
		(c) => c.id === searchParams.category,
	);
	const selectedBrand = brands.find((b) => b.id === searchParams.brand);

	return (
		<div className="sf-container py-8">
			{/* Breadcrumb */}
			<nav className="mb-6 flex items-center gap-2 text-sm text-[var(--sf-text-muted)]">
				<Link to="/store" className="hover:text-[var(--sf-rose)]">
					{tCommon("home")}
				</Link>
				<span>/</span>
				<span className="text-[var(--sf-text)]">{tCommon("shop")}</span>
				{selectedCategory && (
					<>
						<span>/</span>
						<span className="text-[var(--sf-text)]">
							{selectedCategory.name}
						</span>
					</>
				)}
			</nav>

			{/* Header */}
			<div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1
						className="text-3xl font-bold"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						{selectedCategory
							? selectedCategory.name
							: selectedBrand
								? selectedBrand.name
								: cmsHeading}
					</h1>
					<p className="mt-1 text-sm text-[var(--sf-text-muted)]">
						{t("productCount", { count: total })}
					</p>
					{cmsSubtitle && !selectedCategory && !selectedBrand && (
						<p className="mt-1 text-sm text-[var(--sf-text-muted)]">
							{cmsSubtitle}
						</p>
					)}
				</div>

				<div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between">
					<div className="min-w-[260px]">
						<div className="flex items-center gap-2">
							<input
								type="number"
								placeholder={t("min")}
								value={
									searchParams.priceMin !== undefined
										? searchParams.priceMin / 100
										: ""
								}
								onChange={(e) => {
									const val = e.target.value
										? Math.round(Number(e.target.value) * 100)
										: undefined;
									updateSearch({ priceMin: val });
								}}
								className="w-full rounded-lg border border-[var(--sf-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)]"
							/>
							<span className="self-center text-[10px] text-[var(--sf-text-light)]">
								-
							</span>
							<input
								type="number"
								placeholder={t("max")}
								value={
									searchParams.priceMax !== undefined
										? searchParams.priceMax / 100
										: ""
								}
								onChange={(e) => {
									const val = e.target.value
										? Math.round(Number(e.target.value) * 100)
										: undefined;
									updateSearch({ priceMax: val });
								}}
								className="w-full rounded-lg border border-[var(--sf-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--sf-rose)]"
							/>
						</div>
						<p className="mt-1 text-[10px] text-[var(--sf-text-light)]">
							{formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
						</p>
					</div>

					<div className="flex flex-wrap items-center justify-end gap-3">
						<form onSubmit={handleSearch} className="relative flex-1 md:w-64">
							<input
								type="text"
								placeholder={t("searchProducts")}
								value={localSearch}
								onChange={(e) => setLocalSearch(e.target.value)}
								className="w-full rounded-full border border-[var(--sf-border)] bg-white px-4 py-2 text-sm outline-none transition-colors focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
							{localSearch && (
								<button
									type="button"
									onClick={() => {
										setLocalSearch("");
										updateSearch({ q: undefined });
									}}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sf-text-light)] hover:text-[var(--sf-text)]"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</form>

						<div className="relative">
							<select
								value={searchParams.sort || "createdAt:desc"}
								onChange={(e) => updateSearch({ sort: e.target.value })}
								className="appearance-none rounded-full border border-[var(--sf-border)] bg-white px-4 py-2 pr-8 text-sm outline-none focus:border-[var(--sf-rose)]"
							>
								{sortOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
							<ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sf-text-light)]" />
						</div>

						<button
							type="button"
							onClick={() => setShowFilters(!showFilters)}
							className="relative rounded-full border border-[var(--sf-border)] bg-white p-2 md:hidden"
						>
							<SlidersHorizontal className="h-4 w-4" />
							{activeFilterCount > 0 && (
								<span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--sf-rose)] text-[10px] font-bold text-white">
									{activeFilterCount}
								</span>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Active filters */}
			{activeFilterCount > 0 && (
				<div className="mb-6 flex flex-wrap items-center gap-2">
					<span className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-muted)]">
						{t("filters")}:
					</span>
					{selectedCategory && (
						<FilterChip
							label={selectedCategory.name}
							onRemove={() => updateSearch({ category: undefined })}
						/>
					)}
					{selectedBrand && (
						<FilterChip
							label={selectedBrand.name}
							onRemove={() => updateSearch({ brand: undefined })}
						/>
					)}
					{selectedColorIds.map((cId) => {
						const color = colors.find((c) => c.id === cId);
						return color ? (
							<FilterChip
								key={cId}
								label={color.name}
								color={color.hexCode}
								onRemove={() => toggleColor(cId)}
							/>
						) : null;
					})}
					{selectedSizeIds.map((sId) => {
						const size = sizes.find((s) => s.id === sId);
						return size ? (
							<FilterChip
								key={sId}
								label={size.name}
								onRemove={() => toggleSize(sId)}
							/>
						) : null;
					})}
					{searchParams.priceMin !== undefined && (
						<FilterChip
							label={`${t("min")}: ${formatPrice(searchParams.priceMin)}`}
							onRemove={() => updateSearch({ priceMin: undefined })}
						/>
					)}
					{searchParams.priceMax !== undefined && (
						<FilterChip
							label={`${t("max")}: ${formatPrice(searchParams.priceMax)}`}
							onRemove={() => updateSearch({ priceMax: undefined })}
						/>
					)}
					<button
						type="button"
						onClick={clearAllFilters}
						className="text-xs font-medium text-[var(--sf-rose)] hover:underline"
					>
						{t("clearAll")}
					</button>
				</div>
			)}

			<div className="flex gap-8">
				{/* Sidebar Filters */}
				<aside
					className={`${showFilters ? "fixed inset-0 z-50 overflow-y-auto bg-white p-6" : "hidden"} w-full shrink-0 md:static md:block md:w-60 md:p-0`}
				>
					{showFilters && (
						<div className="mb-4 flex items-center justify-between md:hidden">
							<h3 className="text-lg font-bold">{t("filters")}</h3>
							<button type="button" onClick={() => setShowFilters(false)}>
								<X className="h-5 w-5" />
							</button>
						</div>
					)}

					{/* Categories */}
					{categories.length > 0 && (
						<div className="mb-6">
							<h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]">
								{t("category")}
							</h4>
							<div className="space-y-1.5">
								{categories.map((cat) => (
									<button
										type="button"
										key={cat.id}
										onClick={() =>
											updateSearch({
												category:
													searchParams.category === cat.id ? undefined : cat.id,
											})
										}
										className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
											searchParams.category === cat.id
												? "bg-[var(--sf-rose)]/5 font-semibold text-[var(--sf-rose)]"
												: "text-[var(--sf-text-muted)] hover:bg-[var(--sf-bg)] hover:text-[var(--sf-text)]"
										}`}
									>
										<span>{cat.name}</span>
										<span className="text-xs text-[var(--sf-text-light)]">
											{cat.count}
										</span>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Brands */}
					{brands.length > 0 && (
						<div className="mb-6">
							<h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]">
								{t("brand")}
							</h4>
							<div className="space-y-1.5">
								{brands.map((b) => (
									<button
										type="button"
										key={b.id}
										onClick={() =>
											updateSearch({
												brand: searchParams.brand === b.id ? undefined : b.id,
											})
										}
										className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
											searchParams.brand === b.id
												? "bg-[var(--sf-rose)]/5 font-semibold text-[var(--sf-rose)]"
												: "text-[var(--sf-text-muted)] hover:bg-[var(--sf-bg)] hover:text-[var(--sf-text)]"
										}`}
									>
										<span>{b.name}</span>
										<span className="text-xs text-[var(--sf-text-light)]">
											{b.count}
										</span>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Color filter */}
					{colors.length > 0 && (
						<div className="mb-6">
							<h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]">
								{t("colors")}
							</h4>
							<div className="flex flex-wrap gap-2">
								{colors.map((color) => (
									<button
										type="button"
										key={color.id}
										title={`${color.name} (${color.count})`}
										onClick={() => toggleColor(color.id)}
										className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${
											selectedColorIds.includes(color.id)
												? "border-[var(--sf-rose)] ring-2 ring-[var(--sf-rose-light)]"
												: "border-[var(--sf-border)] hover:border-[var(--sf-rose)]"
										}`}
										style={{ backgroundColor: color.hexCode }}
									/>
								))}
							</div>
						</div>
					)}

					{/* Size filter */}
					{sizes.length > 0 && (
						<div className="mb-6">
							<h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]">
								{t("sizes")}
							</h4>
							<div className="flex flex-wrap gap-2">
								{sizes.map((size) => (
									<button
										type="button"
										key={size.id}
										onClick={() => toggleSize(size.id)}
										className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
											selectedSizeIds.includes(size.id)
												? "border-[var(--sf-rose)] bg-[var(--sf-rose)]/5 text-[var(--sf-rose)]"
												: "border-[var(--sf-border)] hover:border-[var(--sf-rose)] hover:text-[var(--sf-rose)]"
										}`}
									>
										{size.name}
										<span className="ml-1 text-[var(--sf-text-light)]">
											({size.count})
										</span>
									</button>
								))}
							</div>
						</div>
					)}

					{showFilters && (
						<button
							type="button"
							onClick={() => setShowFilters(false)}
							className="sf-btn-primary mt-4 w-full text-sm md:hidden"
						>
							{t("showResults")} {total}
						</button>
					)}
				</aside>

				{/* Product Grid */}
				<div className="flex-1">
					{isLoading ? (
						<div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-3">
							{Array.from(
								{ length: 12 },
								(_, index) => `skeleton-${index + 1}`,
							).map((skeletonKey) => (
								<div key={skeletonKey} className="animate-pulse">
									<div className="aspect-square rounded-2xl bg-[var(--sf-border-light)]" />
									<div className="mt-3 h-4 w-3/4 rounded bg-[var(--sf-border-light)]" />
									<div className="mt-2 h-4 w-1/3 rounded bg-[var(--sf-border-light)]" />
								</div>
							))}
						</div>
					) : products.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 text-center">
							<Filter className="mb-4 h-12 w-12 text-[var(--sf-border)]" />
							<h3 className="text-lg font-semibold">{cmsEmptyState}</h3>
							<p className="mt-1 text-sm text-[var(--sf-text-muted)]">
								{t("emptyHint")}
							</p>
							{activeFilterCount > 0 && (
								<button
									type="button"
									onClick={clearAllFilters}
									className="sf-btn-outline mt-4 text-sm"
								>
									{t("clearAllFilters")}
								</button>
							)}
						</div>
					) : (
						<>
							<div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-3">
								{products.map((product) => {
									const primaryImage =
										product.images.find((img) => img.isPrimary) ??
										product.images[0];
									const secondImage = product.images.find(
										(img) => !img.isPrimary && img.url !== primaryImage?.url,
									);
									const colorSwatches = [
										...new Map(
											product.variants
												.filter(
													(
														variant,
													): variant is ProductListVariant & {
														color: ProductListColor;
													} => Boolean(variant.color),
												)
												.map((variant) => [variant.color.id, variant.color]),
										).values(),
									] as Array<{ id: string; name: string; hexCode: string }>;
									return (
										<ProductCard
											key={product.id}
											productId={product.id}
											name={product.name}
											slug={product.slug}
											price={product.basePrice}
											salePrice={product.salePrice}
											compareAtPrice={
												product.salePrice &&
												product.salePrice < product.basePrice
													? product.basePrice
													: null
											}
											imageUrl={primaryImage?.url}
											secondImageUrl={secondImage?.url}
											badge={product.isFeatured ? "hot" : null}
											tags={product.tags}
											isFavorited={wishlistIds.includes(product.id)}
											colorSwatches={colorSwatches}
											defaultVariantId={product.variants?.[0]?.id}
										/>
									);
								})}
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="mt-10 flex items-center justify-center gap-2">
									<button
										type="button"
										onClick={() =>
											updateSearch({ page: Math.max(1, page - 1) })
										}
										disabled={page === 1}
										className="rounded-full border border-[var(--sf-border)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--sf-rose)] disabled:cursor-not-allowed disabled:opacity-50"
									>
										{t("previous")}
									</button>
									{(() => {
										let ellipsisCount = 0;
										return getPaginationRange(page, totalPages).map((p) => {
											if (p === "...") {
												ellipsisCount += 1;
												return (
													<span
														key={`ellipsis-${page}-${totalPages}-${ellipsisCount}`}
														className="px-1 text-[var(--sf-text-light)]"
													>
														...
													</span>
												);
											}

											return (
												<button
													type="button"
													key={p}
													onClick={() => updateSearch({ page: p })}
													className={`h-10 w-10 rounded-full text-sm font-medium transition-colors ${
														p === page
															? "bg-[var(--sf-rose)] text-white"
															: "border border-[var(--sf-border)] hover:border-[var(--sf-rose)]"
													}`}
												>
													{p}
												</button>
											);
										});
									})()}
									<button
										type="button"
										onClick={() =>
											updateSearch({ page: Math.min(totalPages, page + 1) })
										}
										disabled={page === totalPages}
										className="rounded-full border border-[var(--sf-border)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--sf-rose)] disabled:cursor-not-allowed disabled:opacity-50"
									>
										{t("next")}
									</button>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// Helper components
// =============================================================================

function FilterChip({
	label,
	color,
	onRemove,
}: {
	label: string;
	color?: string;
	onRemove: () => void;
}) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--sf-border)] bg-white px-3 py-1 text-xs font-medium">
			{color && (
				<span
					className="h-3 w-3 rounded-full border border-[var(--sf-border-light)]"
					style={{ backgroundColor: color }}
				/>
			)}
			{label}
			<button
				type="button"
				onClick={onRemove}
				className="text-[var(--sf-text-light)] hover:text-[var(--sf-rose)]"
			>
				<X className="h-3 w-3" />
			</button>
		</span>
	);
}

function getPaginationRange(
	current: number,
	total: number,
): (number | "...")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (current <= 3) return [1, 2, 3, 4, "...", total];
	if (current >= total - 2)
		return [1, "...", total - 3, total - 2, total - 1, total];
	return [1, "...", current - 1, current, current + 1, "...", total];
}
