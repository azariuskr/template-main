/**
 * CMS Editor Hooks
 *
 * Orchestration hooks for the CMS admin editor.
 * Raw mutations replaced by action hooks from src/hooks/cms-actions.ts.
 * Pacer logic kept here for debounce/throttle/rate-limit queueing.
 */

import {
	useAsyncQueuer,
	useAsyncRateLimitedCallback,
	useAsyncThrottledCallback,
	useDebouncedCallback,
} from "@tanstack/react-pacer";
import { useEffect, useRef } from "react";
import type {
	CmsSection,
	CmsTranslation,
} from "@/components/admin/cms/cms-constants";
import {
	usePublishCms,
	useRollbackCms,
	useUpsertCmsTranslation,
} from "@/hooks/cms-actions";
import { useAdminCmsSections } from "@/lib/cms/queries";
import { cmsEditorActions, useCmsEditorStore } from "@/lib/cms/store/cms.store";
import type { HttpError, Result } from "@/lib/result";

type CmsMutationOp =
	| { type: "save"; payload: SavePayload }
	| { type: "publish"; profileId: string; userId: string }
	| { type: "rollback"; profileId: string; userId: string; version: number };

type SavePayload = {
	profileSlug: string;
	sectionKey: string;
	localeCode: string;
	type: string;
	title: string;
	subtitle: string;
	content: Record<string, unknown>;
};

type QueuerState = { isRunning: boolean; size: number };

export function useCmsPacedMutations() {
	const saveMutation = useUpsertCmsTranslation();
	const publishMutation = usePublishCms();
	const rollbackMutation = useRollbackCms();

	const lastSaveFingerprintRef = useRef<string>("");
	const lastSaveAtRef = useRef<number>(0);

	const asyncQueuer = useAsyncQueuer<CmsMutationOp, QueuerState>(
		async (op) => {
			if (op.type === "save") {
				await saveMutation.mutateAsync(op.payload);
				return;
			}

			if (op.type === "publish") {
				await publishMutation.mutateAsync({
					profileId: op.profileId,
					createdBy: op.userId,
					notes: "Admin publish",
				});
				return;
			}

			await rollbackMutation.mutateAsync({
				profileId: op.profileId,
				targetVersion: op.version,
				createdBy: op.userId,
				notes: `Admin rollback to v${op.version}`,
			});
		},
		{ started: true },
		(state) => ({ isRunning: state.isRunning, size: state.size }),
	);

	const enqueueWithDedupe = async (op: CmsMutationOp) => {
		if (op.type === "save") {
			const fingerprint = JSON.stringify(op.payload);
			const now = Date.now();
			const samePayload = lastSaveFingerprintRef.current === fingerprint;
			const tooSoon = now - lastSaveAtRef.current < 1200;
			if (samePayload && tooSoon) return;

			lastSaveFingerprintRef.current = fingerprint;
			lastSaveAtRef.current = now;
		}

		asyncQueuer.addItem(op);
	};

	const throttledEnqueue = useAsyncThrottledCallback(enqueueWithDedupe, {
		wait: 500,
		leading: true,
		trailing: true,
	});

	const rateLimitedEnqueue = useAsyncRateLimitedCallback(throttledEnqueue, {
		limit: 8,
		window: 10_000,
		windowType: "sliding",
	});

	const enqueueSave = async (payload: SavePayload) =>
		rateLimitedEnqueue({ type: "save", payload });
	const enqueuePublish = async (args: { profileId: string; userId: string }) =>
		rateLimitedEnqueue({ type: "publish", ...args });
	const enqueueRollback = async (args: {
		profileId: string;
		userId: string;
		version: number;
	}) => rateLimitedEnqueue({ type: "rollback", ...args });

	return {
		enqueueSave,
		enqueuePublish,
		enqueueRollback,
		isBusy:
			asyncQueuer.state.size > 0 ||
			saveMutation.isPending ||
			publishMutation.isPending ||
			rollbackMutation.isPending,
		queueSize: asyncQueuer.state.size,
	};
}

type SectionsResult = Result<
	{ profile: { id: string } | null; sections: CmsSection[] },
	HttpError
>;

export function useCmsEditorController() {
	const sectionsQuery = useAdminCmsSections();
	const locale = useCmsEditorStore((s) => s.locale);
	const sectionKey = useCmsEditorStore((s) => s.sectionKey);

	const debouncedHydrate = useDebouncedCallback(
		(payload: {
			title?: string | null;
			subtitle?: string | null;
			content?: unknown;
		}) => {
			cmsEditorActions.hydrateTranslation(payload);
		},
		{ wait: 120 },
	);

	const sectionsData = sectionsQuery.data as SectionsResult | undefined;

	useEffect(() => {
		if (!sectionsData?.ok) return;
		const sections = sectionsData.data.sections;
		const section = sections.find((s: CmsSection) => s.key === sectionKey);
		const translation = section?.translations?.find(
			(t: CmsTranslation) => t.localeCode === locale,
		);
		debouncedHydrate(translation ?? { title: "", subtitle: "", content: {} });
	}, [sectionsData, locale, sectionKey, debouncedHydrate]);

	return {
		sectionsQuery,
	};
}
