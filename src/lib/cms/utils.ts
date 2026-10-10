/**
 * CMS Shared Utilities
 *
 * Common helpers used across storefront pages and CMS admin.
 * Centralizes duplicated logic from nav, footer, store index, and route files.
 */

/** Extract a non-empty string from an unknown CMS value, or return fallback. */
export function pickString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

/** Normalize a locale string to "en" | "bg", handling prefixes like "bg-BG". */
export function normalizeStoreLocale(
	locale?: string,
	fallback: "en" | "bg" = "bg",
): "en" | "bg" {
	if (!locale) return fallback;
	const normalized = locale.trim().toLowerCase();
	if (normalized === "bg" || normalized.startsWith("bg-")) return "bg";
	return "en";
}

/** Format a date as a relative time string (e.g. "2m ago", "1h ago", "3d ago"). */
export function formatRelativeTime(date: string | Date | null | undefined): string {
	if (!date) return "";
	const now = Date.now();
	const then = typeof date === "string" ? new Date(date).getTime() : date.getTime();
	if (Number.isNaN(then)) return "";

	const diffMs = now - then;
	if (diffMs < 0) return "just now";

	const seconds = Math.floor(diffMs / 1000);
	if (seconds < 60) return `${seconds}s ago`;

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;

	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;

	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}
