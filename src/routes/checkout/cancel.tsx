import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingCart, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/checkout/cancel")({
	component: CheckoutCancelPage,
});

function CheckoutCancelPage() {
	const { t } = useTranslation("checkout");

	return (
		<div className="storefront relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
			<div className="absolute left-10 top-1/4 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

			<div className="w-full max-w-md text-center">
				<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
					<XCircle className="h-10 w-10 text-orange-500" />
				</div>

				<h1
					className="mt-6 text-2xl font-bold text-[var(--sf-text)]"
					style={{ fontFamily: "'Varela Round', sans-serif" }}
				>
					{t("cancelledTitle")}
				</h1>
				<p className="mt-2 text-[var(--sf-text-muted)]">
					{t("cancelledDesc")}
				</p>

				<div className="mt-8 flex flex-col gap-3 sm:flex-row">
					<Link
						to="/store/cart"
						className="sf-btn-primary flex flex-1 items-center justify-center gap-2"
					>
						<ShoppingCart className="h-4 w-4" />
						{t("returnToCart")}
					</Link>
					<Link
						to="/store"
						className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm font-semibold text-[var(--sf-text-muted)] transition-colors hover:bg-[var(--sf-border-light)]"
					>
						<ArrowLeft className="h-4 w-4" />
						{t("continueShopping")}
					</Link>
				</div>
			</div>
		</div>
	);
}
