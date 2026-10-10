import { AlignLeft, Save } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CmsLocale } from "./cms-constants";

interface CmsTranslationEditorProps {
	locale: CmsLocale;
	sectionKey: string;
	title: string;
	subtitle: string;
	contentJson: string;
	isContentExpanded: boolean;
	onTitleChange: (value: string) => void;
	onSubtitleChange: (value: string) => void;
	onContentJsonChange: (value: string) => void;
	onContentExpandToggle: () => void;
	onSave: () => void;
	isBusy: boolean;
}

export function CmsTranslationEditor({
	locale,
	sectionKey,
	title,
	subtitle,
	contentJson,
	isContentExpanded,
	onTitleChange,
	onSubtitleChange,
	onContentJsonChange,
	onContentExpandToggle,
	onSave,
	isBusy,
}: CmsTranslationEditorProps) {
	const jsonError = useMemo(() => {
		try {
			JSON.parse(contentJson);
			return null;
		} catch (e) {
			return e instanceof Error ? e.message : "Invalid JSON";
		}
	}, [contentJson]);

	const handleFormat = useCallback(() => {
		try {
			const parsed = JSON.parse(contentJson);
			onContentJsonChange(JSON.stringify(parsed, null, 2));
		} catch {
			// can't format invalid JSON
		}
	}, [contentJson, onContentJsonChange]);

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Badge variant="outline">{sectionKey}</Badge>
				<Badge variant="secondary">{locale.toUpperCase()}</Badge>
			</div>

			<div className="grid gap-2">
				<Label>Title</Label>
				<Input
					value={title}
					onChange={(e) => onTitleChange(e.target.value)}
					placeholder="Section title"
				/>
			</div>

			<div className="grid gap-2">
				<Label>Subtitle</Label>
				<Input
					value={subtitle}
					onChange={(e) => onSubtitleChange(e.target.value)}
					placeholder="Section subtitle"
				/>
			</div>

			<div className="grid gap-2">
				<div className="flex items-center justify-between">
					<Label>Content JSON</Label>
					<div className="flex items-center gap-1">
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={handleFormat}
							disabled={!!jsonError}
							className="h-7 px-2 text-xs"
						>
							<AlignLeft className="mr-1 h-3 w-3" />
							Format
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={onContentExpandToggle}
							className="h-7 px-2 text-xs"
						>
							{isContentExpanded ? "Collapse" : "Expand"}
						</Button>
					</div>
				</div>
				<Textarea
					value={contentJson}
					onChange={(e) => onContentJsonChange(e.target.value)}
					className={cn(
						"font-mono text-xs",
						isContentExpanded ? "min-h-[520px]" : "h-32",
						jsonError && "border-destructive focus-visible:ring-destructive",
					)}
				/>
				{jsonError && (
					<p className="text-xs text-destructive">{jsonError}</p>
				)}
			</div>

			<Button onClick={onSave} disabled={isBusy || !!jsonError}>
				<Save className="mr-2 h-4 w-4" />
				Save Translation
			</Button>
		</div>
	);
}
