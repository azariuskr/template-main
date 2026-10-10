import { readCssVar } from "@/components/admin/cms/cms-constants";

function asStringRecord(input: unknown): Record<string, string> {
	return (input ?? {}) as Record<string, string>;
}

function asUnknownRecord(input: unknown): Record<string, unknown> {
	return (input ?? {}) as Record<string, unknown>;
}

export function buildStorefrontThemeStyle(themeContentInput: unknown) {
	const themeContent = asStringRecord(themeContentInput);
	const rawTheme = asUnknownRecord(themeContentInput);

	const themeStyle = {
		"--sf-rose": themeContent?.primary,
		"--sf-rose-dark": themeContent?.primary,
		"--sf-orange": themeContent?.accent,
		"--sf-bg": themeContent?.background,
		"--sf-bg-warm": themeContent?.background,
		"--sf-surface": themeContent?.surface,
		"--sf-text": themeContent?.text,
		"--sf-text-muted": themeContent?.mutedText,
		"--sf-text-light": themeContent?.mutedText,
		"--sf-border": themeContent?.accent,
		"--sf-border-light": themeContent?.surface,
		"--sf-font-sans": themeContent?.fontSans,
		"--sf-font-heading": themeContent?.fontHeading,
		"--sf-font-mono": themeContent?.fontMono,
	} as Record<string, string | undefined>;

	const tweakcnCss =
		typeof rawTheme?.tweakcnCss === "string"
			? (rawTheme.tweakcnCss as string)
			: "";
	const useTweakcnOverride = Boolean(rawTheme?.useTweakcnOverride);

	if (useTweakcnOverride && tweakcnCss.trim().length > 0) {
		themeStyle["--sf-bg"] =
			readCssVar(tweakcnCss, "background") ?? themeStyle["--sf-bg"];
		themeStyle["--sf-bg-warm"] =
			readCssVar(tweakcnCss, "card") ?? themeStyle["--sf-bg-warm"];
		themeStyle["--sf-surface"] =
			readCssVar(tweakcnCss, "card") ?? themeStyle["--sf-surface"];
		themeStyle["--sf-text"] =
			readCssVar(tweakcnCss, "foreground") ?? themeStyle["--sf-text"];
		themeStyle["--sf-text-muted"] =
			readCssVar(tweakcnCss, "muted-foreground") ??
			themeStyle["--sf-text-muted"];
		themeStyle["--sf-text-light"] =
			readCssVar(tweakcnCss, "muted-foreground") ??
			themeStyle["--sf-text-light"];
		themeStyle["--sf-rose"] =
			readCssVar(tweakcnCss, "primary") ?? themeStyle["--sf-rose"];
		themeStyle["--sf-rose-dark"] =
			readCssVar(tweakcnCss, "primary") ?? themeStyle["--sf-rose-dark"];
		themeStyle["--sf-orange"] =
			readCssVar(tweakcnCss, "accent") ?? themeStyle["--sf-orange"];
		themeStyle["--sf-border"] =
			readCssVar(tweakcnCss, "border") ?? themeStyle["--sf-border"];
		themeStyle["--sf-border-light"] =
			readCssVar(tweakcnCss, "input") ?? themeStyle["--sf-border-light"];
		themeStyle["--sf-font-sans"] =
			readCssVar(tweakcnCss, "font-sans") ?? themeStyle["--sf-font-sans"];
		themeStyle["--sf-font-heading"] =
			readCssVar(tweakcnCss, "font-serif") ?? themeStyle["--sf-font-heading"];
		themeStyle["--sf-font-mono"] =
			readCssVar(tweakcnCss, "font-mono") ?? themeStyle["--sf-font-mono"];
	}

	return themeStyle;
}
