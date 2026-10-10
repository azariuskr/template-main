import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, LogOut, MapPin, Package, User } from "lucide-react";
import { authQueryOptions } from "@/lib/auth/queries";
import { useSignOut } from "@/hooks/use-sign-out";
import { cmsDefaultLocaleQueryOptions } from "@/lib/cms/queries";
import { normalizeStoreLocale } from "@/lib/cms/utils";
import { ROUTES } from "@/constants";

export const Route = createFileRoute("/(storefront)/store/account")({
	beforeLoad: async ({ context }) => {
		const auth =
			context.user ??
			(await context.queryClient.ensureQueryData(authQueryOptions()));
		if (!auth?.user) {
			throw redirect({ to: "/auth/login" as string });
		}
	},
	component: AccountLayout,
});

type NavItem = { label: string; to: string; icon: typeof User };

function AccountLayout() {
	const location = useLocation();
	const { signOut, mutation } = useSignOut();
	const { data: defaultLocaleData } = useQuery(cmsDefaultLocaleQueryOptions());
	const locale = normalizeStoreLocale(undefined, defaultLocaleData?.ok ? defaultLocaleData.data.locale : "bg");
	const isBg = locale === "bg";
	const navItems: NavItem[] = [
		{ label: isBg ? "Общ преглед" : "Overview", to: ROUTES.STORE.ACCOUNT.BASE, icon: User },
		{ label: isBg ? "Поръчки" : "Orders", to: ROUTES.STORE.ACCOUNT.ORDERS, icon: Package },
		{ label: isBg ? "Адреси" : "Addresses", to: ROUTES.STORE.ACCOUNT.ADDRESSES, icon: MapPin },
		{ label: isBg ? "Любими" : "Wishlist", to: "/store/wishlist", icon: Heart },
	];

	return (
		<div className="sf-container py-10">
			<h1
				className="mb-6 text-2xl font-bold"
				style={{ fontFamily: "'Varela Round', sans-serif" }}
			>
				{isBg ? "Моят акаунт" : "My Account"}
			</h1>

			<div className="flex flex-col gap-8 lg:flex-row">
				{/* Sidebar */}
				<nav className="flex gap-2 overflow-x-auto lg:w-56 lg:flex-shrink-0 lg:flex-col lg:overflow-visible">
					{navItems.map((item) => {
						const isActive =
							item.to === ROUTES.STORE.ACCOUNT.BASE
								? location.pathname === item.to
								: location.pathname.startsWith(item.to);
						return (
							<Link
								key={item.to}
								to={item.to as string}
								className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
									isActive
										? "bg-[var(--sf-rose-light)] text-[var(--sf-rose)]"
										: "text-[var(--sf-text-muted)] hover:bg-[var(--sf-border-light)] hover:text-[var(--sf-text)]"
								}`}
							>
								<item.icon className="h-4 w-4" />
								{item.label}
							</Link>
						);
					})}

					<div className="hidden lg:block my-1 border-t border-[var(--sf-border-light)]" />

					<button
						type="button"
						onClick={() => signOut()}
						disabled={mutation.isPending}
						className="flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
					>
						<LogOut className="h-4 w-4" />
						{mutation.isPending
							? isBg
								? "Излизане..."
								: "Signing out..."
							: isBg
								? "Изход"
								: "Log out"}
					</button>
				</nav>

				{/* Content */}
				<div className="min-w-0 flex-1">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
