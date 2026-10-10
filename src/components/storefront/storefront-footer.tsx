import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCmsResolvedSection } from "@/lib/cms/queries";
import { pickString } from "@/lib/cms/utils";
import { DynamicLogoIcon } from "./dynamic-logo-icon";

export function StorefrontFooter({ locale = "bg" }: { locale?: "en" | "bg" }) {
	const { t } = useTranslation("footer");
	const { t: tCommon } = useTranslation("common");
	const { data: cmsFooterData } = useCmsResolvedSection("global.footer", locale);
	const { data: cmsNavData } = useCmsResolvedSection("global.nav", locale);

	const footerContent =
		cmsFooterData?.ok && cmsFooterData.data
			? (cmsFooterData.data.translation?.content ?? {})
			: {};

	const navContent =
		cmsNavData?.ok && cmsNavData.data ? (cmsNavData.data.translation?.content ?? {}) : {};
	const logoIcon = pickString((navContent as Record<string, unknown>)?.logoIcon, "ShoppingBag");
	const logoIconUrl = pickString((navContent as Record<string, unknown>)?.logoIconUrl, "");

	const brandName = pickString(
		(cmsFooterData?.ok ? cmsFooterData.data?.translation?.title : undefined),
		"KinderZone",
	);
	const brandDescription = pickString(
		(cmsFooterData?.ok ? cmsFooterData.data?.translation?.subtitle : undefined),
		"Quality children's clothing and accessories for every little adventure.",
	);
	const bottomText = pickString(
		(footerContent as Record<string, unknown>)?.copyright,
		`${new Date().getFullYear()} ${brandName}. All rights reserved.`,
	);

	return (
		<footer className="border-t border-[var(--sf-border)] bg-[var(--sf-surface)]">
			<div className="sf-container py-12">
				<div className="grid gap-8 md:grid-cols-4">
					{/* Brand */}
					<div className="space-y-4">
						<Link
							to="/store"
							className="flex items-center gap-2 text-lg font-bold text-[var(--sf-rose)]"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{logoIconUrl ? (
							<img src={logoIconUrl} alt="" className="h-5 w-5 object-contain" />
						) : (
							<DynamicLogoIcon name={logoIcon} className="h-5 w-5" />
						)}
							{brandName}
						</Link>
						<p className="text-sm text-[var(--sf-text-muted)]">{brandDescription}</p>
					</div>

					{/* Shop */}
					<div className="space-y-3">
						<h4
							className="text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						 >
							{t("shop")}
						</h4>
						<div className="flex flex-col gap-2">
							<Link to={"/store/products" as string} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								{t("allProducts")}
							</Link>
							<Link to={"/store/products" as string} search={{ sort: "createdAt:desc" } as any} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								{t("newArrivals")}
							</Link>
							<Link to={"/store/products" as string} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								{t("sale")}
							</Link>
						</div>
					</div>

					{/* Support */}
					<div className="space-y-3">
						<h4
							className="text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{t("support")}
						</h4>
						<div className="flex flex-col gap-2">
							<Link to="/store/faq" search={{ locale }} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								FAQ
							</Link>
							<Link to="/store/contact" search={{ locale }} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								{tCommon("contactUs")}
							</Link>
							<Link to="/store/faq" search={{ locale }} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								{t("shippingReturns")}
							</Link>
						</div>
					</div>

					{/* Company */}
					<div className="space-y-3">
						<h4
							className="text-sm font-bold uppercase tracking-wider text-[var(--sf-text)]"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{t("company")}
						</h4>
						<div className="flex flex-col gap-2">
							<Link to="/store/about" search={{ locale }} className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								{t("aboutUs")}
							</Link>
							<Link to="/privacy" className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								{t("privacyPolicy")}
							</Link>
							<Link to="/terms" className="text-sm text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
								{t("termsOfService")}
							</Link>
						</div>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="mt-10 border-t border-[var(--sf-border-light)] pt-6">
					<p className="text-center text-xs text-[var(--sf-text-light)]">© {bottomText}</p>
				</div>
			</div>
		</footer>
	);
}
