import { formatRelativeTime } from "@/lib/cms/utils";
import { cn } from "@/lib/utils";

interface CmsStatusBarProps {
	isDirty: boolean;
	isSaving: boolean;
	lastSaved: Date | null;
	queueSize: number;
}

export function CmsStatusBar({
	isDirty,
	isSaving,
	lastSaved,
	queueSize,
}: CmsStatusBarProps) {
	const statusColor = isSaving
		? "bg-yellow-400 animate-pulse"
		: isDirty
			? "bg-orange-400"
			: "bg-emerald-400";

	const statusText = isSaving
		? "Saving..."
		: isDirty
			? "Unsaved changes"
			: "Saved";

	return (
		<div className="flex items-center gap-3 text-sm text-muted-foreground">
			<div className="flex items-center gap-1.5">
				<span className={cn("inline-block h-2 w-2 rounded-full", statusColor)} />
				<span>{statusText}</span>
			</div>
			{queueSize > 0 && (
				<span className="text-xs">({queueSize} queued)</span>
			)}
			{lastSaved && !isSaving && (
				<span className="text-xs">{formatRelativeTime(lastSaved)}</span>
			)}
			{isDirty && (
				<span className="hidden text-xs text-muted-foreground/60 sm:inline">
					Ctrl+S to save
				</span>
			)}
		</div>
	);
}
