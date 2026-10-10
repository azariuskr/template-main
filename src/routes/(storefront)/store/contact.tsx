import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Clock,
	Mail,
	MapPin,
	MessageCircle,
	Phone,
	Send,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	cmsDefaultLocaleQueryOptions,
	cmsResolvedSectionQueryOptions,
} from "@/lib/cms/queries";
import { normalizeStoreLocale, pickString } from "@/lib/cms/utils";

export const Route = createFileRoute("/(storefront)/store/contact")({
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

		await context.queryClient.ensureQueryData(
			cmsResolvedSectionQueryOptions("contact.page", locale),
		);
	},
	component: ContactPage,
});

function ContactPage() {
	const { t } = useTranslation("contact");
	const [selectedTopic, setSelectedTopic] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const search = Route.useSearch();
	const { data: defaultLocaleData } = useQuery(cmsDefaultLocaleQueryOptions());
	const locale = normalizeStoreLocale(
		search.locale,
		defaultLocaleData?.ok ? defaultLocaleData.data.locale : "bg",
	);

	// CMS: contact.page
	const { data: contactCmsData } = useQuery(cmsResolvedSectionQueryOptions("contact.page", locale));
	const contactContent = contactCmsData?.ok && contactCmsData.data ? (contactCmsData.data.translation?.content ?? {}) as Record<string, unknown> : {};
	const heroHeading = pickString(contactCmsData?.ok ? contactCmsData.data?.translation?.title : undefined, "");
	const heroSubtitle = pickString(contactCmsData?.ok ? contactCmsData.data?.translation?.subtitle : undefined, "");

	const contactEmail = pickString(contactContent.email as string | undefined, "hello@partypop.com");
	const contactPhone = pickString(contactContent.phone as string | undefined, "1-800-PARTY-POP");
	const contactHours = pickString(contactContent.hours as string | undefined, "Mon-Fri: 9AM - 6PM EST");

	const cmsTopics = Array.isArray(contactContent.topics) ? (contactContent.topics as Array<{ value: string; label: string }>) : [];
	const topics = cmsTopics.length > 0
		? cmsTopics
		: [
			{ value: "order", label: t("topicOrder") },
			{ value: "return", label: t("topicReturn") },
			{ value: "product", label: t("topicProduct") },
			{ value: "wholesale", label: t("topicWholesale") },
			{ value: "other", label: t("topicOther") },
		];

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitted(true);
	};

	return (
		<>
			{/* Hero */}
			<section className="relative overflow-hidden pb-12 pt-16 lg:pb-20 lg:pt-24">
				<div className="sf-container relative z-10 text-center">
					<span className="sf-badge mb-6 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600">
						<MessageCircle className="h-3.5 w-3.5" />
						{t("badge")}
					</span>
					<h1
						className="text-4xl font-bold leading-tight md:text-5xl"
						style={{ fontFamily: "'Varela Round', sans-serif" }}
					>
						{heroHeading || (
							<>
								{t("heroTitleStart")}
								<span className="text-[var(--sf-rose)]">{t("heroTitleHighlight")}</span>
							</>
						)}
					</h1>
					<p className="mx-auto mt-6 max-w-xl text-lg font-medium leading-relaxed text-[var(--sf-text-muted)]">
						{heroSubtitle || t("heroSubtitle")}
					</p>
				</div>

				<div className="absolute left-10 top-1/4 -z-10 h-64 w-64 rounded-full bg-emerald-100/30 blur-3xl" />
				<div className="absolute bottom-0 right-10 -z-10 h-80 w-80 rounded-full bg-[var(--sf-rose-light)]/20 blur-3xl" />
			</section>

			{/* Contact Info Cards */}
			<section className="sf-container mb-16">
				<div className="grid gap-6 md:grid-cols-3">
					<div className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-6 text-center transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sf-rose)]/10 text-[var(--sf-rose)] transition-transform group-hover:scale-110">
							<Mail className="h-6 w-6" />
						</div>
						<h3
							className="mb-1 font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{t("emailUs")}
						</h3>
						<p className="text-sm text-[var(--sf-text-muted)]">
							{contactEmail}
						</p>
					</div>

					<div className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-6 text-center transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sf-orange)]/10 text-[var(--sf-orange)] transition-transform group-hover:scale-110">
							<Phone className="h-6 w-6" />
						</div>
						<h3
							className="mb-1 font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{t("callUs")}
						</h3>
						<p className="text-sm text-[var(--sf-text-muted)]">
							{contactPhone}
						</p>
					</div>

					<div className="group rounded-2xl border border-[var(--sf-border-light)] bg-white p-6 text-center transition-all hover:border-[var(--sf-rose-light)] hover:shadow-lg">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 transition-transform group-hover:scale-110">
							<Clock className="h-6 w-6" />
						</div>
						<h3
							className="mb-1 font-bold"
							style={{ fontFamily: "'Varela Round', sans-serif" }}
						>
							{t("businessHours")}
						</h3>
						<p className="text-sm text-[var(--sf-text-muted)]">
							{contactHours}
						</p>
					</div>
				</div>
			</section>

			{/* Contact Form & Map */}
			<section className="sf-container mb-20">
				<div className="grid gap-10 lg:grid-cols-5">
					{/* Form */}
					<div className="lg:col-span-3">
						<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-8">
							<h2
								className="mb-6 text-2xl font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								{t("sendMessage")}
							</h2>

							{submitted ? (
								<div className="py-12 text-center">
									<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
										<Send className="h-8 w-8" />
									</div>
									<h3
										className="text-xl font-bold"
										style={{ fontFamily: "'Varela Round', sans-serif" }}
									>
										{t("messageSent")}
									</h3>
									<p className="mt-2 text-sm text-[var(--sf-text-muted)]">
										{t("messageSentDesc")}
									</p>
									<button
										onClick={() => setSubmitted(false)}
										className="sf-btn-outline mt-6 text-sm"
									>
										{t("sendAnother")}
									</button>
								</div>
							) : (
								<form onSubmit={handleSubmit} className="space-y-6">
									{/* Topic selector */}
									<div>
										<label className="mb-2 block text-sm font-bold">
											{t("topicLabel")}
										</label>
										<div className="flex flex-wrap gap-2">
											{topics.map((topic) => (
												<button
													key={topic.value}
													type="button"
													onClick={() => setSelectedTopic(topic.value)}
													className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
														selectedTopic === topic.value
															? "border-[var(--sf-rose)] bg-[var(--sf-rose)]/5 text-[var(--sf-rose)]"
															: "border-[var(--sf-border)] hover:border-[var(--sf-rose)]"
													}`}
												>
													{topic.label}
												</button>
											))}
										</div>
									</div>

									<div className="grid gap-4 md:grid-cols-2">
										<div>
											<label className="mb-2 block text-sm font-bold">
												{t("firstName")}
											</label>
											<input
												type="text"
												required
												className="w-full rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
												placeholder={t("firstNamePlaceholder")}
											/>
										</div>
										<div>
											<label className="mb-2 block text-sm font-bold">
												{t("lastName")}
											</label>
											<input
												type="text"
												required
												className="w-full rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
												placeholder={t("lastNamePlaceholder")}
											/>
										</div>
									</div>

									<div>
										<label className="mb-2 block text-sm font-bold">
											{t("email")}
										</label>
										<input
											type="email"
											required
											className="w-full rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
											placeholder={t("emailPlaceholder")}
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-bold">
											{t("orderNumber")}
										</label>
										<input
											type="text"
											className="w-full rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
											placeholder={t("orderNumberPlaceholder")}
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-bold">
											{t("message")}
										</label>
										<textarea
											required
											rows={5}
											className="w-full resize-none rounded-xl border border-[var(--sf-border)] px-4 py-3 text-sm outline-none transition-all focus:border-[var(--sf-rose-light)] focus:ring-2 focus:ring-[var(--sf-rose-light)]/50"
											placeholder={t("messagePlaceholder")}
										/>
									</div>

									<button
										type="submit"
										className="sf-btn-primary flex items-center gap-2"
									>
										<Send className="h-4 w-4" />
										{t("sendBtn")}
									</button>
								</form>
							)}
						</div>
					</div>

					{/* Sidebar */}
					<div className="space-y-6 lg:col-span-2">
						{/* Office Location */}
						<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sf-bg)] text-[var(--sf-text)]">
									<MapPin className="h-5 w-5" />
								</div>
								<h3
									className="font-bold"
									style={{ fontFamily: "'Varela Round', sans-serif" }}
								>
									{t("ourOffice")}
								</h3>
							</div>
							<p
								className="text-sm leading-relaxed text-[var(--sf-text-muted)]"
								style={{ whiteSpace: "pre-line" }}
							>
								{t("officeAddress")}
							</p>
						</div>

						{/* Response Times */}
						<div className="rounded-2xl border border-[var(--sf-border-light)] bg-white p-6">
							<h3
								className="mb-4 font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								{t("responseTimesTitle")}
							</h3>
							<div className="space-y-3">
								<div className="flex items-center justify-between text-sm">
									<span className="text-[var(--sf-text-muted)]">{t("emailUs")}</span>
									<span className="font-semibold">{t("responseEmail")}</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-[var(--sf-text-muted)]">{t("callUs")}</span>
									<span className="font-semibold">{t("responsePhone")}</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-[var(--sf-text-muted)]">{t("shippingReturns", { ns: "footer" })}</span>
									<span className="font-semibold">{t("responseReturns")}</span>
								</div>
							</div>
						</div>

						{/* Social */}
						<div className="rounded-2xl bg-[var(--sf-bg-warm)] p-6 text-center">
							<h3
								className="mb-2 font-bold"
								style={{ fontFamily: "'Varela Round', sans-serif" }}
							>
								{t("followTitle")}
							</h3>
							<p className="text-sm text-[var(--sf-text-muted)]">
								{t("followDesc")}
							</p>
							<div className="mt-4 flex justify-center gap-3">
								{["Instagram", "TikTok", "Pinterest"].map((platform) => (
									<span
										key={platform}
										className="rounded-full border border-[var(--sf-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--sf-text-muted)] transition-colors hover:border-[var(--sf-rose)] hover:text-[var(--sf-rose)]"
									>
										{platform}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
