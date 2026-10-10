import { Store } from "@tanstack/store";
import { createActions, createStoreHook } from "@/lib/store/core";

export type CmsLocale = "en" | "bg";

export type CmsEditorState = {
	locale: CmsLocale;
	sectionKey: string;
	title: string;
	subtitle: string;
	contentJson: string;
	rollbackVersion: string;
	newSectionKey: string;
	isContentExpanded: boolean;
	isTweakExpanded: boolean;
	dirty: boolean;
};

const DEFAULTS: CmsEditorState = {
	locale: "en",
	sectionKey: "home.hero",
	title: "",
	subtitle: "",
	contentJson: "{}",
	rollbackVersion: "",
	newSectionKey: "",
	isContentExpanded: false,
	isTweakExpanded: false,
	dirty: false,
};

export const cmsEditorStore = new Store<CmsEditorState>(DEFAULTS);

export const cmsEditorActions = createActions(cmsEditorStore, (setState) => ({
	setLocale: (locale: CmsLocale) => setState((s) => ({ ...s, locale })),
	setSectionKey: (sectionKey: string) =>
		setState((s) => ({ ...s, sectionKey })),
	setRollbackVersion: (rollbackVersion: string) =>
		setState((s) => ({ ...s, rollbackVersion })),
	setNewSectionKey: (newSectionKey: string) =>
		setState((s) => ({ ...s, newSectionKey })),
	setContentExpanded: (isContentExpanded: boolean) =>
		setState((s) => ({ ...s, isContentExpanded })),
	setTweakExpanded: (isTweakExpanded: boolean) =>
		setState((s) => ({ ...s, isTweakExpanded })),
	hydrateTranslation: (payload: {
		title?: string | null;
		subtitle?: string | null;
		content?: unknown;
	}) =>
		setState((s) => ({
			...s,
			title: payload.title ?? "",
			subtitle: payload.subtitle ?? "",
			contentJson: JSON.stringify(payload.content ?? {}, null, 2),
			dirty: false,
		})),
	setDraft: (
		patch: Partial<Pick<CmsEditorState, "title" | "subtitle" | "contentJson">>,
	) => setState((s) => ({ ...s, ...patch, dirty: true })),
	reset: () => setState(() => DEFAULTS),
}));

export const useCmsEditorStore = createStoreHook(cmsEditorStore);
