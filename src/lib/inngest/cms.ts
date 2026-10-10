import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvent, cmsVersion } from "@/lib/db/schema";
import { invalidateAllCmsCache } from "@/lib/cache/redis";
import { inngest } from "./client";

/**
 * CMS Profile Published — runs after publishing a CMS profile.
 * Invalidates Redis cache and logs analytics.
 */
export const cmsPublishedFunction = inngest.createFunction(
	{ id: "cms-profile-published" },
	{ event: "cms/profile.published" },
	async ({ event, step }) => {
		const { profileId, version, userId } = event.data as {
			profileId: string;
			version: number;
			userId: string;
		};

		// Invalidate all CMS cache
		await step.run("invalidate-cms-cache", async () => {
			await invalidateAllCmsCache();
		});

		// Log analytics
		await step.run("log-analytics", async () => {
			await db.insert(analyticsEvent).values({
				userId,
				eventName: "cms.published",
				eventProperties: JSON.stringify({ profileId, version }),
				context: "cms",
			});
		});

		return { ok: true, profileId, version };
	},
);

/**
 * CMS Version Cleanup — removes old versions beyond a threshold.
 * Keeps the most recent N versions (default 20).
 */
export const cmsVersionCleanupFunction = inngest.createFunction(
	{ id: "cms-version-cleanup" },
	{ event: "cms/version.cleanup" },
	async ({ event, step }) => {
		const { profileId, keepCount } = event.data as {
			profileId: string;
			keepCount: number;
		};

		const threshold = keepCount || 20;

		const deleted = await step.run("delete-old-versions", async () => {
			const versions = await db
				.select({ id: cmsVersion.id, version: cmsVersion.version })
				.from(cmsVersion)
				.where(eq(cmsVersion.profileId, profileId))
				.orderBy(desc(cmsVersion.version));

			if (versions.length <= threshold) {
				return 0;
			}

			const toDelete = versions.slice(threshold);
			let deletedCount = 0;

			for (const v of toDelete) {
				await db.delete(cmsVersion).where(eq(cmsVersion.id, v.id));
				deletedCount++;
			}

			return deletedCount;
		});

		return { ok: true, profileId, deletedVersions: deleted };
	},
);

export const cmsFunctions = [
	cmsPublishedFunction,
	cmsVersionCleanupFunction,
] as const;
