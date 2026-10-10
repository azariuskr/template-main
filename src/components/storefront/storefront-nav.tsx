import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "@/hooks/auth-hooks";
import { useCart, useWishlist } from "@/lib/ecommerce/queries";
import { useCmsResolvedSection } from "@/lib/cms/queries";
import { pickString } from "@/lib/cms/utils";
import { DynamicLogoIcon } from "./dynamic-logo-icon";

type StorefrontLocale = "en" | "bg";

type NavItem = {
	key?: string;
	label?: string;
	href?: string;
};

export function StorefrontNav({ locale = "bg" }: { locale?: StorefrontLocale }) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const navigate = useNavigate();
	const { data: session } = useSession();
	const { data: cartData } = useCart();
	const { data: wishlistData } = useWishlist();

	const { data: cmsNavData } = useCmsResolvedSection("global.nav", locale);

	const cartCount = cartData?.ok ? cartData.data?.itemCount ?? 0 : 0;
	const wishlistCount = wishlistData?.ok ? wishlistData.data?.productIds?.length ?? 0 : 0;

	const navContent =
		cmsNavData?.ok && cmsNavData.data ? (cmsNavData.data.translation?.content ?? {}) : {};

	const logoModeRaw = pickString((navContent as Record<string, unknown>)?.logoMode, "both").toLowerCase();
	const logoMode: "icon" | "text" | "both" =
		logoModeRaw === "icon" || logoModeRaw === "text" || logoModeRaw === "both"
			? logoModeRaw
			: "both";
	const logoText = pickString((navContent as Record<string, unknown>)?.logoText, "KinderZone");
	const logoHref = pickString((navContent as Record<string, unknown>)?.logoHref, "/store");
	const logoIcon = pickString((navContent as Record<string, unknown>)?.logoIcon, "ShoppingBag");
	const logoIconUrl = pickString((navContent as Record<string, unknown>)?.logoIconUrl, "");
	const searchPlaceholder = pickString(
		(navContent as Record<string, unknown>)?.searchPlaceholder,
		"Search for products...",
	);

	const fallbackItems: NavItem[] = [
		{ key: "home", label: locale === "bg" ? "Начало" : "Home", href: "/store" },
		{ key: "products", label: locale === "bg" ? "Продукти" : "Shop", href: "/store/products" },
		{ key: "about", label: locale === "bg" ? "За нас" : "About", href: "/store/about" },
		{ key: "faq", label: "FAQ", href: "/store/faq" },
		{ key: "contact", label: locale === "bg" ? "Контакти" : "Contact", href: "/store/contact" },
	];

	const itemsRaw = (navContent as Record<string, unknown>)?.items;
	const navItems: NavItem[] = Array.isArray(itemsRaw)
		? itemsRaw
				.filter((item): item is NavItem => !!item && typeof item === "object")
				.map((item) => ({
					key: pickString(item.key, ""),
					label: pickString(item.label, ""),
					href: pickString(item.href, ""),
				}))
				.filter((item) => item.label && item.href)
		: fallbackItems;

	const resolvedNavItems = navItems.length > 0 ? navItems : fallbackItems;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			navigate({ to: "/store/search", search: { q: searchQuery.trim() } as any });
			setSearchOpen(false);
			setSearchQuery("");
		}
	};

	return (
		<motion.nav
			initial={{ opacity: 0, y: -12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, ease: "easeOut" }}
			className="sticky top-0 z-50 border-b border-[var(--sf-border)] bg-[var(--sf-surface)]/95 backdrop-blur-md"
		>
			<div className="sf-container">
				<div className="flex h-16 items-center justify-between gap-4">
					{/* Logo */}
					<Link
						to={logoHref as string}
						className="flex items-center gap-2 text-xl font-bold text-[var(--sf-rose)]"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						{(logoMode === "icon" || logoMode === "both") && (
						logoIconUrl ? (
							<img src={logoIconUrl} alt="" className="h-6 w-6 object-contain" />
						) : (
							<DynamicLogoIcon name={logoIcon} className="h-6 w-6" />
						)
					)}
						{(logoMode === "text" || logoMode === "both") && <span>{logoText}</span>}
					</Link>

					{/* Desktop Nav Links */}
					<div className="hidden items-center gap-8 md:flex">
						{resolvedNavItems.map((item) => (
							<Link
								key={item.key ?? item.href}
								to={(item.href ?? "/store") as string}
								className="text-sm font-semibold text-[var(--sf-text)] transition-colors hover:text-[var(--sf-rose)]"
							>
								{item.label}
							</Link>
						))}
					</div>

					{/* Actions */}
					<div className="flex items-center gap-3">
						<button
							onClick={() => setSearchOpen(!searchOpen)}
							className="rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-text)]"
						>
							<Search className="h-5 w-5" />
						</button>

						<Link
							to={(session?.user ? "/store/account" : "/auth/login") as string}
							className="rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-text)]"
						>
							<User className="h-5 w-5" />
						</Link>

						<Link
							to="/store/wishlist"
							className="relative hidden rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-rose)] sm:block"
						>
							<Heart className="h-5 w-5" />
							{wishlistCount > 0 && (
								<span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sf-rose)] text-[10px] font-bold text-white">
									{wishlistCount > 99 ? "99+" : wishlistCount}
								</span>
							)}
						</Link>

						<Link
							to="/store/cart"
							className="relative rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-text)]"
						>
							<ShoppingBag className="h-5 w-5" />
							{cartCount > 0 && (
								<span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sf-rose)] text-[10px] font-bold text-white">
									{cartCount > 99 ? "99+" : cartCount}
								</span>
							)}
						</Link>

						<button
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="rounded-full p-2 text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)] md:hidden"
						>
							{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
						</button>
					</div>
				</div>

				{searchOpen && (
					<div className="border-t border-[var(--sf-border-light)] py-3">
						<form onSubmit={handleSearch} className="relative">
							<Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sf-text-light)]" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={searchPlaceholder}
								autoFocus
								className="w-full rounded-full border border-[var(--sf-border)] bg-[var(--sf-bg)] py-2.5 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-[var(--sf-text-light)] focus:border-[var(--sf-rose)] focus:ring-2 focus:ring-[var(--sf-rose-light)]"
							/>
						</form>
					</div>
				)}

				{mobileMenuOpen && (
					<div className="border-t border-[var(--sf-border-light)] py-4 md:hidden">
						<div className="flex flex-col gap-3">
							{resolvedNavItems.map((item) => (
								<Link
									key={`mobile-${item.key ?? item.href}`}
									to={(item.href ?? "/store") as string}
									onClick={() => setMobileMenuOpen(false)}
									className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--sf-border-light)]"
								>
									{item.label}
								</Link>
							))}
						</div>
					</div>
				)}
			</div>
		</motion.nav>
	);
}
