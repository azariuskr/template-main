import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CmsLocale } from "./cms-constants";

interface CmsLocaleSelectorProps {
	locale: CmsLocale;
	currentDefault: CmsLocale;
	onLocaleChange: (locale: CmsLocale) => void;
	onSetDefault: (locale: CmsLocale) => void;
	isPending: boolean;
}

export function CmsLocaleSelector({
	locale,
	currentDefault,
	onLocaleChange,
	onSetDefault,
	isPending,
}: CmsLocaleSelectorProps) {
	const nonDefault: CmsLocale = currentDefault === "en" ? "bg" : "en";

	return (
		<div className="space-y-3">
			<label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Edit locale
			</label>
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					variant={locale === "en" ? "default" : "outline"}
					onClick={() => onLocaleChange("en")}
					className="relative"
				>
					EN
					{currentDefault === "en" && (
						<Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">
							default
						</Badge>
					)}
				</Button>
				<Button
					size="sm"
					variant={locale === "bg" ? "default" : "outline"}
					onClick={() => onLocaleChange("bg")}
					className="relative"
				>
					BG
					{currentDefault === "bg" && (
						<Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">
							default
						</Badge>
					)}
				</Button>
			</div>
			{locale !== currentDefault && (
				<Button
					variant="ghost"
					size="sm"
					className="h-auto px-0 py-0 text-xs text-muted-foreground hover:text-foreground"
					onClick={() => onSetDefault(nonDefault)}
					disabled={isPending}
				>
					Set {locale.toUpperCase()} as default
				</Button>
			)}
		</div>
	);
}
