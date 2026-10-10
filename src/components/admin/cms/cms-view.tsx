import { Database, RefreshCw, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/admin/app-layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/auth-hooks";
import {
	useBulkCreateCmsSections,
	useCreateCmsSection,
	useResetCmsTheme,
	useSaveCmsTheme,
	useSetDefaultCmsLocale,
} from "@/hooks/cms-actions";
import { useCmsPacedMutations } from "@/lib/cms/hooks/use-cms";
import {
	useAdminCmsSections,
	useAdminCmsVersions,
	useCmsDefaultLocale,
} from "@/lib/cms/queries";
import type { HttpError, Result } from "@/lib/result";
import {
	CMS_SECTION_KEYS,
	type CmsLocale,
	type CmsSection,
	type CmsSectionType,
	type CmsTranslation,
	type CmsVersion,
	PARTYPOP_THEME,
	readCssVar,
	type ThemeDraft,
} from "./cms-constants";
import { CmsLocaleSelector } from "./cms-locale-selector";
import { CmsSectionBrowser } from "./cms-section-browser";
import { CmsStatusBar } from "./cms-status-bar";
import { CmsThemeEditor } from "./cms-theme-editor";
import { CmsTranslationEditor } from "./cms-translation-editor";
import { CmsVersionPanel } from "./cms-version-panel";

const VERSIONS_LIMIT = 20;

export function CmsView() {
	const { data: session } = useSession();
	const userId = session?.user?.id;

	// ── State ──────────────────────────────────────────────────────
	const [locale, setLocale] = useState<CmsLocale>("en");
	const [sectionKey, setSectionKey] = useState("home.hero");
	const [title, setTitle] = useState("");
	const [subtitle, setSubtitle] = useState("");
	const [contentJson, setContentJson] = useState("{}");
	const [themeDraft, setThemeDraft] = useState<ThemeDraft>(PARTYPOP_THEME);
	const [isTweakExpanded, setIsTweakExpanded] = useState(false);
	const [isContentExpanded, setIsContentExpanded] = useState(false);
	const [isDirty, setIsDirty] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const loadedFingerprintRef = useRef("");
	const [versionsOffset, setVersionsOffset] = useState(0);
	const [allVersions, setAllVersions] = useState<CmsVersion[]>([]);

	// ── Queries ────────────────────────────────────────────────────
	const sectionsQuery = useAdminCmsSections();
	const defaultLocaleQuery = useCmsDefaultLocale();

	type SectionsResult = Result<
		{
			profile: { id: string; slug: string; name: string } | null;
			sections: CmsSection[];
		},
		HttpError
	>;
	type DefaultLocaleResult = Result<
		{ locale: "en" | "bg"; code: string },
		HttpError
	>;
	type VersionsResult = Result<CmsVersion[], HttpError>;

	const sectionsData = sectionsQuery.data as SectionsResult | undefined;
	const defaultLocaleData = defaultLocaleQuery.data as
		| DefaultLocaleResult
		| undefined;

	const profileId = sectionsData?.ok
		? (sectionsData.data.profile?.id ?? "")
		: "";
	const versionsQuery = useAdminCmsVersions(profileId, VERSIONS_LIMIT, versionsOffset);

	// ── Mutations ──────────────────────────────────────────────────
	const setDefaultLocaleMutation = useSetDefaultCmsLocale();
	const saveThemeMutation = useSaveCmsTheme();
	const resetThemeMutation = useResetCmsTheme();
	const createSectionMutation = useCreateCmsSection();
	const bulkCreateMutation = useBulkCreateCmsSections();
	const pacedMutations = useCmsPacedMutations();

	// ── Derived data ───────────────────────────────────────────────
	const sectionOptions = useMemo<CmsSection[]>(
		() => (sectionsData?.ok ? (sectionsData.data.sections as CmsSection[]) : []),
		[sectionsData],
	);

	const currentDefaultLocale: CmsLocale =
		defaultLocaleData?.ok && defaultLocaleData.data.locale === "en"
			? "en"
			: "bg";

	const selectedTranslation = useMemo(() => {
		if (!sectionsData?.ok) return null;
		const section = sectionOptions.find((s) => s.key === sectionKey);
		if (!section) return null;
		return (
			section.translations.find(
				(t: CmsTranslation) => t.localeCode === locale,
			) ?? null
		);
	}, [sectionsData, sectionKey, locale, sectionOptions]);

	const themeTranslation = useMemo(() => {
		if (!sectionsData?.ok) return null;
		const section = sectionOptions.find((s) => s.key === "global.theme");
		if (!section) return null;
		return (
			section.translations.find(
				(t: CmsTranslation) => t.localeCode === locale,
			) ?? null
		);
	}, [sectionsData, locale, sectionOptions]);

	// ── Effects ────────────────────────────────────────────────────
	useEffect(() => {
		if (!selectedTranslation) {
			setTitle("");
			setSubtitle("");
			setContentJson("{}");
			loadedFingerprintRef.current = JSON.stringify({
				title: "",
				subtitle: "",
				contentJson: "{}",
			});
			setIsDirty(false);
			return;
		}
		const t = selectedTranslation.title ?? "";
		const s = selectedTranslation.subtitle ?? "";
		const c = JSON.stringify(selectedTranslation.content ?? {}, null, 2);
		setTitle(t);
		setSubtitle(s);
		setContentJson(c);
		loadedFingerprintRef.current = JSON.stringify({
			title: t,
			subtitle: s,
			contentJson: c,
		});
		setIsDirty(false);
	}, [selectedTranslation]);

	// Track dirty state
	useEffect(() => {
		const current = JSON.stringify({ title, subtitle, contentJson });
		setIsDirty(current !== loadedFingerprintRef.current);
	}, [title, subtitle, contentJson]);

	useEffect(() => {
		const content = (themeTranslation?.content ?? {}) as Partial<ThemeDraft>;
		setThemeDraft({
			primary: content.primary ?? PARTYPOP_THEME.primary,
			accent: content.accent ?? PARTYPOP_THEME.accent,
			background: content.background ?? PARTYPOP_THEME.background,
			surface: content.surface ?? PARTYPOP_THEME.surface,
			text: content.text ?? PARTYPOP_THEME.text,
			mutedText: content.mutedText ?? PARTYPOP_THEME.mutedText,
			fontSans:
				typeof content.fontSans === "string"
					? content.fontSans
					: PARTYPOP_THEME.fontSans,
			fontHeading:
				typeof content.fontHeading === "string"
					? content.fontHeading
					: PARTYPOP_THEME.fontHeading,
			fontMono:
				typeof content.fontMono === "string"
					? content.fontMono
					: PARTYPOP_THEME.fontMono,
			tweakcnCss:
				typeof content.tweakcnCss === "string"
					? content.tweakcnCss
					: PARTYPOP_THEME.tweakcnCss,
			useTweakcnOverride:
				typeof content.useTweakcnOverride === "boolean"
					? content.useTweakcnOverride
					: PARTYPOP_THEME.useTweakcnOverride,
		});
	}, [themeTranslation]);

	// ── Handlers ───────────────────────────────────────────────────
	const handleSaveTranslation = useCallback(async () => {
		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(contentJson);
		} catch {
			toast.error("Invalid JSON content");
			return;
		}

		await pacedMutations.enqueueSave({
			profileSlug: "default",
			sectionKey,
			localeCode: locale,
			type: "custom",
			title,
			subtitle,
			content: parsed,
		});
		setLastSaved(new Date());
		setIsDirty(false);
		loadedFingerprintRef.current = JSON.stringify({
			title,
			subtitle,
			contentJson,
		});
	}, [contentJson, sectionKey, locale, title, subtitle, pacedMutations]);

	const handlePublish = async () => {
		if (!userId || !profileId) {
			toast.error("No user session or profile not loaded");
			return;
		}
		await pacedMutations.enqueuePublish({ profileId, userId });
		setVersionsOffset(0);
	};

	const handleRollback = async (targetVersion: number) => {
		if (!userId || !profileId) {
			toast.error("No user session or profile not loaded");
			return;
		}
		await pacedMutations.enqueueRollback({
			profileId,
			userId,
			version: targetVersion,
		});
		setVersionsOffset(0);
	};

	const handleCreateSection = (key: string, type: CmsSectionType) => {
		createSectionMutation.mutate(
			{
				profileSlug: "default",
				sectionKey: key,
				localeCode: "en",
				type,
				title: "",
				subtitle: "",
				content: {},
			},
			{
				onSuccess: () => {
					setSectionKey(key);
					setLocale("en");
				},
			},
		);
	};

	const handleSeedSections = () => {
		bulkCreateMutation.mutate({ sections: CMS_SECTION_KEYS });
	};

	const handleSaveTheme = () => {
		saveThemeMutation.mutate({
			profileSlug: "default",
			sectionKey: "global.theme",
			localeCode: locale,
			type: "custom",
			title: locale === "bg" ? "Тема" : "Theme",
			subtitle: locale === "bg" ? "Настройки на темата" : "Theme settings",
			content: themeDraft as unknown as Record<string, unknown>,
		});
	};

	const handleResetTheme = () => {
		resetThemeMutation.mutate(undefined);
	};

	// ── Keyboard shortcut: Ctrl+S ──────────────────────────────────
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				if (isDirty) {
					handleSaveTranslation();
				}
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [isDirty, handleSaveTranslation]);

	// ── Preview theme (with tweakcn override) ──────────────────────
	const previewTheme = {
		background: themeDraft.background,
		surface: themeDraft.surface,
		text: themeDraft.text,
		mutedText: themeDraft.mutedText,
		primary: themeDraft.primary,
		accent: themeDraft.accent,
		fontSans: themeDraft.fontSans,
		fontHeading: themeDraft.fontHeading,
	};

	if (
		themeDraft.useTweakcnOverride &&
		themeDraft.tweakcnCss.trim().length > 0
	) {
		previewTheme.background =
			readCssVar(themeDraft.tweakcnCss, "background") ??
			previewTheme.background;
		previewTheme.surface =
			readCssVar(themeDraft.tweakcnCss, "card") ?? previewTheme.surface;
		previewTheme.text =
			readCssVar(themeDraft.tweakcnCss, "foreground") ?? previewTheme.text;
		previewTheme.mutedText =
			readCssVar(themeDraft.tweakcnCss, "muted-foreground") ??
			previewTheme.mutedText;
		previewTheme.primary =
			readCssVar(themeDraft.tweakcnCss, "primary") ?? previewTheme.primary;
		previewTheme.accent =
			readCssVar(themeDraft.tweakcnCss, "accent") ?? previewTheme.accent;
		previewTheme.fontSans =
			readCssVar(themeDraft.tweakcnCss, "font-sans") ?? previewTheme.fontSans;
		previewTheme.fontHeading =
			readCssVar(themeDraft.tweakcnCss, "font-serif") ??
			previewTheme.fontHeading;
	}

	// ── Versions ───────────────────────────────────────────────────
	const versionsData = versionsQuery.data as VersionsResult | undefined;
	const latestPage = useMemo<CmsVersion[]>(
		() => (versionsData?.ok ? versionsData.data : []),
		[versionsData],
	);

	// Accumulate versions across pages; reset when offset is 0
	useEffect(() => {
		if (versionsOffset === 0) {
			setAllVersions(latestPage);
		} else if (latestPage.length > 0) {
			setAllVersions((prev) => {
				const existingIds = new Set(prev.map((v) => v.id));
				const newItems = latestPage.filter((v) => !existingIds.has(v.id));
				return [...prev, ...newItems];
			});
		}
	}, [latestPage, versionsOffset]);

	// Reset offset when profileId changes
	useEffect(() => {
		setVersionsOffset(0);
	}, [profileId]);

	const versions = allVersions;
	const versionsHasMore = latestPage.length === VERSIONS_LIMIT;

	const handleLoadMoreVersions = () => {
		setVersionsOffset((prev) => prev + VERSIONS_LIMIT);
	};

	// ── Render ─────────────────────────────────────────────────────
	return (
		<PageContainer
			fluid
			title="CMS"
			description="Manage storefront content, theme, and publishing"
			actions={
				<div className="flex items-center gap-3">
					<CmsStatusBar
						isDirty={isDirty}
						isSaving={pacedMutations.isBusy}
						lastSaved={lastSaved}
						queueSize={pacedMutations.queueSize}
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() => sectionsQuery.refetch()}
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh
					</Button>
					<Button
						size="sm"
						onClick={handlePublish}
						disabled={pacedMutations.isBusy}
					>
						<Upload className="mr-2 h-4 w-4" />
						Publish
					</Button>
				</div>
			}
		>
			<div className="flex gap-6">
				{/* ── Sidebar ─────────────────────────────────────── */}
				<aside className="hidden w-[280px] shrink-0 space-y-5 lg:block">
					<CmsLocaleSelector
						locale={locale}
						currentDefault={currentDefaultLocale}
						onLocaleChange={setLocale}
						onSetDefault={(loc) =>
							setDefaultLocaleMutation.mutate({ localeCode: loc })
						}
						isPending={setDefaultLocaleMutation.isPending}
					/>

					<Separator />

					<CmsSectionBrowser
						sections={sectionOptions}
						selectedKey={sectionKey}
						onSelectSection={setSectionKey}
						onCreateSection={handleCreateSection}
						isCreating={createSectionMutation.isPending}
					/>

					{sectionOptions.length === 0 && (
						<>
							<Separator />

							<Button
								variant="outline"
								size="sm"
								className="w-full"
								onClick={handleSeedSections}
								disabled={bulkCreateMutation.isPending}
							>
								<Database className="mr-2 h-3.5 w-3.5" />
								{bulkCreateMutation.isPending
									? "Seeding..."
									: "Seed Storefront Sections"}
							</Button>
						</>
					)}
				</aside>

				{/* ── Main area with tabs ─────────────────────────── */}
				<div className="min-w-0 flex-1">
					<Tabs defaultValue="content">
						<TabsList>
							<TabsTrigger value="content">Content</TabsTrigger>
							<TabsTrigger value="theme">Theme</TabsTrigger>
							<TabsTrigger value="versions">Versions</TabsTrigger>
						</TabsList>

						{/* Content tab */}
						<TabsContent value="content" className="mt-4">
							<CmsTranslationEditor
								locale={locale}
								sectionKey={sectionKey}
								title={title}
								subtitle={subtitle}
								contentJson={contentJson}
								isContentExpanded={isContentExpanded}
								onTitleChange={setTitle}
								onSubtitleChange={setSubtitle}
								onContentJsonChange={setContentJson}
								onContentExpandToggle={() =>
									setIsContentExpanded((v) => !v)
								}
								onSave={handleSaveTranslation}
								isBusy={pacedMutations.isBusy}
							/>
						</TabsContent>

						{/* Theme tab */}
						<TabsContent value="theme" className="mt-4">
							<CmsThemeEditor
								themeDraft={themeDraft}
								previewTheme={previewTheme}
								locale={locale}
								isTweakExpanded={isTweakExpanded}
								onThemeChange={(patch) =>
									setThemeDraft((prev) => ({ ...prev, ...patch }))
								}
								onTweakExpandToggle={() =>
									setIsTweakExpanded((v) => !v)
								}
								onSaveTheme={handleSaveTheme}
								onResetTheme={handleResetTheme}
								isSaving={saveThemeMutation.isPending}
								isResetting={resetThemeMutation.isPending}
							/>
						</TabsContent>

						{/* Versions tab */}
						<TabsContent value="versions" className="mt-4">
							<CmsVersionPanel
								versions={versions}
								onRollback={handleRollback}
								isBusy={pacedMutations.isBusy}
								hasMore={versionsHasMore}
								onLoadMore={handleLoadMoreVersions}
								isLoadingMore={versionsQuery.isFetching && versionsOffset > 0}
							/>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</PageContainer>
	);
}
