import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock, Package, Truck, XCircle } from "lucide-react";
import { useMyOrder } from "@/lib/ecommerce/queries";
import { ROUTES } from "@/constants";
import { cmsDefaultLocaleQueryOptions, cmsResolvedSectionQueryOptions } from "@/lib/cms/queries";
import { normalizeStoreLocale, pickString } from "@/lib/cms/utils";

export const Route = createFileRoute("/(storefront)/store/account/orders/$orderId")({
	component: OrderDetailPage,
});

const CANCELLED_STATUSES = new Set(["cancelled", "refunded"]);

function getStepIndex(status: string): number {
	const keys = ["pending", "confirmed", "processing", "shipped", "delivered"];
	const idx = keys.findIndex((s) => s === status);
	return idx >= 0 ? idx : 0;
}

function OrderDetailPage() {
	const { orderId } = Route.useParams();
	const { data: defaultLocaleData } = useQuery(cmsDefaultLocaleQueryOptions());
	const locale = normalizeStoreLocale(undefined, defaultLocaleData?.ok ? defaultLocaleData.data.locale : "bg");
	const isBg = locale === "bg";
	const { data: cmsData } = useQuery(cmsResolvedSectionQueryOptions("account.orders", locale));
	const cmsContent = cmsData?.ok && cmsData.data ? (cmsData.data.translation?.content ?? {}) as Record<string, any> : {};

	const STATUS_STEPS = [
		{ key: "pending", label: isBg ? "Поръчана" : "Placed", icon: Clock },
		{ key: "confirmed", label: isBg ? "Потвърдена" : "Confirmed", icon: Check },
		{ key: "processing", label: isBg ? "Обработва се" : "Processing", icon: Package },
		{ key: "shipped", label: isBg ? "Изпратена" : "Shipped", icon: Truck },
		{ key: "delivered", label: isBg ? "Доставена" : "Delivered", icon: Check },
	];

	const { data: orderData, isLoading } = useMyOrder(orderId);
	const order = orderData?.ok ? orderData.data : null;

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-6 w-48 animate-pulse rounded bg-[var(--sf-border-light)]" />
				<div className="h-48 animate-pulse rounded-2xl bg-[var(--sf-border-light)]" />
				<div className="h-64 animate-pulse rounded-2xl bg-[var(--sf-border-light)]" />
			</div>
		);
	}

	if (!order) {
		return (
			<div className="rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-12 text-center">
				<Package className="mx-auto h-12 w-12 text-[var(--sf-border)]" />
				<p className="mt-3 text-sm font-medium text-[var(--sf-text-muted)]">
					{pickString(cmsContent.orderNotFound, isBg ? "Поръчката не е намерена" : "Order not found")}
				</p>
				<Link to={ROUTES.STORE.ACCOUNT.ORDERS as string} className="sf-btn-primary mt-4 inline-block text-sm">
					{pickString(cmsContent.backToOrders, isBg ? "Назад към поръчките" : "Back to Orders")}
				</Link>
			</div>
		);
	}

	const isCancelled = CANCELLED_STATUSES.has(order.status);
	const activeStep = getStepIndex(order.status);

	return (
		<div className="space-y-6">
			<Link to={ROUTES.STORE.ACCOUNT.ORDERS as string} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--sf-text-muted)] transition-colors hover:text-[var(--sf-rose)]">
				<ArrowLeft className="h-4 w-4" />
				{pickString(cmsContent.backToOrders, isBg ? "Назад към поръчките" : "Back to Orders")}
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-bold text-[var(--sf-text)]" style={{ fontFamily: "'Varela Round', sans-serif" }}>
						{pickString(cmsContent.orderPrefix, isBg ? "Поръчка" : "Order")} {order.orderNumber}
					</h2>
					<p className="text-xs text-[var(--sf-text-muted)]">
						{pickString(cmsContent.placedOnPrefix, isBg ? "Поръчана на" : "Placed on")} {new Date(order.createdAt).toLocaleDateString(locale, {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</p>
				</div>
				<p className="text-lg font-bold text-[var(--sf-text)]">{order.totalFormatted}</p>
			</div>

			{!isCancelled ? (
				<div className="rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-6">
					<div className="flex items-center justify-between">
						{STATUS_STEPS.map((step, i) => {
							const isComplete = i <= activeStep;
							const isCurrent = i === activeStep;
							return (
								<div key={step.key} className="flex flex-1 flex-col items-center">
									<div className="relative flex w-full items-center">
										{i > 0 && <div className={`h-0.5 flex-1 ${i <= activeStep ? "bg-[var(--sf-rose)]" : "bg-[var(--sf-border-light)]"}`} />}
										<div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${isComplete ? "bg-[var(--sf-rose)] text-white" : "border-2 border-[var(--sf-border)] bg-[var(--sf-surface)] text-[var(--sf-text-muted)]"} ${isCurrent ? "ring-2 ring-[var(--sf-rose-light)]" : ""}`}>
											<step.icon className="h-4 w-4" />
										</div>
										{i < STATUS_STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < activeStep ? "bg-[var(--sf-rose)]" : "bg-[var(--sf-border-light)]"}`} />}
									</div>
									<p className={`mt-2 text-[10px] font-semibold ${isComplete ? "text-[var(--sf-rose)]" : "text-[var(--sf-text-muted)]"}`}>{step.label}</p>
								</div>
							);
						})}
					</div>

					{order.trackingNumber && (
						<div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--sf-border-light)] px-4 py-3 text-sm">
							<Truck className="h-4 w-4 text-[var(--sf-rose)]" />
							<span className="text-[var(--sf-text-muted)]">{order.carrier}: {order.trackingNumber}</span>
							{order.trackingUrl && (
								<a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-semibold text-[var(--sf-rose)] hover:underline">
									{pickString(cmsContent.trackPackage, isBg ? "Проследи пратката" : "Track Package")}
								</a>
							)}
						</div>
					)}
				</div>
			) : (
				<div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
					<XCircle className="h-5 w-5 text-red-500" />
					<div>
						<p className="text-sm font-semibold capitalize text-red-700">{order.status}</p>
						<p className="text-xs text-red-600">
							{pickString(cmsContent.cancelledPrefix, isBg ? "Тази поръчка беше" : "This order was")} {order.status} {pickString(cmsContent.cancelledOn, isBg ? "на" : "on")} {new Date(order.createdAt).toLocaleDateString(locale)}
						</p>
					</div>
				</div>
			)}

			<div className="rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)]">
				<div className="border-b border-[var(--sf-border-light)] px-5 py-3">
					<h3 className="text-sm font-semibold text-[var(--sf-text)]">
						{pickString(cmsContent.itemsHeading, isBg ? "Артикули" : "Items")} ({order.items.length})
					</h3>
				</div>
				<div className="divide-y divide-[var(--sf-border-light)]">
					{order.items.map((item: any) => (
						<div key={item.id} className="flex items-center gap-4 px-5 py-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sf-border-light)]">
								<Package className="h-5 w-5 text-[var(--sf-text-muted)]" />
							</div>
							<div className="min-w-0 flex-1">
								{item.product ? <Link to={`/store/products/${item.product.slug}` as string} className="text-sm font-medium text-[var(--sf-text)] hover:text-[var(--sf-rose)]">{item.productName}</Link> : <p className="text-sm font-medium text-[var(--sf-text)]">{item.productName}</p>}
								{item.variantOptions && <p className="text-xs text-[var(--sf-text-muted)]">{item.variantOptions}</p>}
								<p className="text-xs text-[var(--sf-text-muted)]">{pickString(cmsContent.qtyLabel, isBg ? "Брой" : "Qty")}: {item.quantity} &times; {item.unitPriceFormatted}</p>
							</div>
							<p className="text-sm font-semibold text-[var(--sf-text)]">{item.totalPriceFormatted}</p>
						</div>
					))}
				</div>
			</div>

			<div className="rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-5">
				<h3 className="mb-3 text-sm font-semibold text-[var(--sf-text)]">{pickString(cmsContent.summaryHeading, isBg ? "Обобщение на поръчката" : "Order Summary")}</h3>
				<div className="space-y-2 text-sm">
					<div className="flex justify-between"><span className="text-[var(--sf-text-muted)]">{pickString(cmsContent.subtotal, isBg ? "Междинна сума" : "Subtotal")}</span><span className="text-[var(--sf-text)]">{order.subtotalFormatted}</span></div>
					{order.discount > 0 && <div className="flex justify-between"><span className="text-[var(--sf-text-muted)]">{pickString(cmsContent.discount, isBg ? "Отстъпка" : "Discount")}{order.couponCode ? ` (${order.couponCode})` : ""}</span><span className="text-green-600">-{order.discountFormatted}</span></div>}
					{order.shippingCost > 0 && <div className="flex justify-between"><span className="text-[var(--sf-text-muted)]">{pickString(cmsContent.shipping, isBg ? "Доставка" : "Shipping")}</span><span className="text-[var(--sf-text)]">{order.shippingCostFormatted}</span></div>}
					{order.tax > 0 && <div className="flex justify-between"><span className="text-[var(--sf-text-muted)]">{pickString(cmsContent.tax, isBg ? "ДДС" : "Tax")}</span><span className="text-[var(--sf-text)]">{order.taxFormatted}</span></div>}
					<div className="flex justify-between border-t border-[var(--sf-border-light)] pt-2"><span className="font-semibold text-[var(--sf-text)]">{pickString(cmsContent.total, isBg ? "Общо" : "Total")}</span><span className="font-bold text-[var(--sf-text)]">{order.totalFormatted}</span></div>
				</div>
			</div>

			{order.shippingAddress && (
				<div className="rounded-2xl border border-[var(--sf-border-light)] bg-[var(--sf-surface)] p-5">
					<h3 className="mb-2 text-sm font-semibold text-[var(--sf-text)]">{pickString(cmsContent.shippingAddress, isBg ? "Адрес за доставка" : "Shipping Address")}</h3>
					<div className="text-sm text-[var(--sf-text-muted)]">
						<p>{(order.shippingAddress as any).firstName} {(order.shippingAddress as any).lastName}</p>
						<p>{(order.shippingAddress as any).street1}</p>
						{(order.shippingAddress as any).street2 && <p>{(order.shippingAddress as any).street2}</p>}
						<p>{(order.shippingAddress as any).city}, {(order.shippingAddress as any).state} {(order.shippingAddress as any).postalCode}</p>
						<p>{(order.shippingAddress as any).country}</p>
					</div>
				</div>
			)}
		</div>
	);
}
