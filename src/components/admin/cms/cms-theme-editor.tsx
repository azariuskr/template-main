import { ChevronDown, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
	FONT_HEADING_OPTIONS,
	FONT_MONO_OPTIONS,
	FONT_SANS_OPTIONS,
	type CmsLocale,
	type ThemeDraft,
} from "./cms-constants";
import { CmsThemePreview } from "./cms-theme-preview";

interface PreviewTheme {
	background: string;
	surface: string;
	text: string;
	mutedText: string;
	primary: string;
	accent: string;
	fontSans: string;
	fontHeading: string;
}

interface CmsThemeEditorProps {
	themeDraft: ThemeDraft;
	previewTheme: PreviewTheme;
	locale: CmsLocale;
	isTweakExpanded: boolean;
	onThemeChange: (patch: Partial<ThemeDraft>) => void;
	onTweakExpandToggle: () => void;
	onSaveTheme: () => void;
	onResetTheme: () => void;
	isSaving: boolean;
	isResetting: boolean;
}

const COLOR_FIELDS: Array<[keyof ThemeDraft, string]> = [
	["primary", "Primary"],
	["accent", "Accent"],
	["background", "Background"],
	["surface", "Surface"],
	["text", "Text"],
	["mutedText", "Muted Text"],
];

export function CmsThemeEditor({
	themeDraft,
	previewTheme,
	locale,
	isTweakExpanded,
	onThemeChange,
	onTweakExpandToggle,
	onSaveTheme,
	onResetTheme,
	isSaving,
	isResetting,
}: CmsThemeEditorProps) {
	return (
		<div className="space-y-6">
			{/* Colors */}
			<div>
				<h4 className="mb-3 text-sm font-medium">Colors</h4>
				<div className="grid gap-3 md:grid-cols-3">
					{COLOR_FIELDS.map(([key, label]) => (
						<div key={key} className="grid gap-1">
							<Label className="text-xs">{label}</Label>
							<div className="flex items-center gap-2">
								<Input
									type="color"
									value={themeDraft[key] as string}
									onChange={(e) =>
										onThemeChange({ [key]: e.target.value })
									}
									className="h-9 w-12 p-0.5"
								/>
								<Input
									value={themeDraft[key] as string}
									onChange={(e) =>
										onThemeChange({ [key]: e.target.value })
									}
									className="h-9 text-xs"
								/>
							</div>
						</div>
					))}
				</div>
			</div>

			<Separator />

			{/* Typography */}
			<div>
				<h4 className="mb-3 text-sm font-medium">Typography</h4>
				<div className="grid gap-3 md:grid-cols-3">
					<div className="grid gap-1">
						<Label className="text-xs">Body Font (sans)</Label>
						<Select
							value={themeDraft.fontSans}
							onValueChange={(value) =>
								onThemeChange({ fontSans: value })
							}
						>
							<SelectTrigger className="h-9">
								<SelectValue placeholder="Select body font" />
							</SelectTrigger>
							<SelectContent>
								{FONT_SANS_OPTIONS.map((font) => (
									<SelectItem key={font} value={font}>
										{font.split(",")[0]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-1">
						<Label className="text-xs">Heading Font</Label>
						<Select
							value={themeDraft.fontHeading}
							onValueChange={(value) =>
								onThemeChange({ fontHeading: value })
							}
						>
							<SelectTrigger className="h-9">
								<SelectValue placeholder="Select heading font" />
							</SelectTrigger>
							<SelectContent>
								{FONT_HEADING_OPTIONS.map((font) => (
									<SelectItem key={font} value={font}>
										{font.split(",")[0]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-1">
						<Label className="text-xs">Mono Font</Label>
						<Select
							value={themeDraft.fontMono}
							onValueChange={(value) =>
								onThemeChange({ fontMono: value })
							}
						>
							<SelectTrigger className="h-9">
								<SelectValue placeholder="Select mono font" />
							</SelectTrigger>
							<SelectContent>
								{FONT_MONO_OPTIONS.map((font) => (
									<SelectItem key={font} value={font}>
										{font.split(",")[0]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<Separator />

			{/* TweakCN (Collapsible) */}
			<Collapsible open={isTweakExpanded} onOpenChange={onTweakExpandToggle}>
				<CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
					<span>Advanced: TweakCN Override</span>
					<ChevronDown
						className={`h-4 w-4 transition-transform ${isTweakExpanded ? "rotate-180" : ""}`}
					/>
				</CollapsibleTrigger>
				<CollapsibleContent className="mt-3 space-y-3">
					<Textarea
						value={themeDraft.tweakcnCss}
						onChange={(e) => onThemeChange({ tweakcnCss: e.target.value })}
						placeholder={".storefront {\n  --sf-rose: #7c3aed;\n  --sf-bg: #0b1020;\n}"}
						className="min-h-[180px] font-mono text-xs"
					/>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant={themeDraft.useTweakcnOverride ? "default" : "outline"}
							onClick={() =>
								onThemeChange({
									useTweakcnOverride: !themeDraft.useTweakcnOverride,
								})
							}
						>
							{themeDraft.useTweakcnOverride ? "Override ON" : "Override OFF"}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() =>
								onThemeChange({
									tweakcnCss:
										".storefront {\n  --sf-rose: #7c3aed;\n  --sf-rose-dark: #6d28d9;\n  --sf-bg: #0b1020;\n  --sf-bg-warm: #111827;\n  --sf-surface: #111827;\n  --sf-text: #e5e7eb;\n  --sf-text-muted: #9ca3af;\n  --sf-border: #374151;\n  --sf-border-light: #1f2937;\n}",
								})
							}
						>
							Paste Sample
						</Button>
					</div>
				</CollapsibleContent>
			</Collapsible>

			<Separator />

			{/* Preview */}
			<CmsThemePreview theme={previewTheme} />

			{/* Actions */}
			<div className="flex items-center gap-2">
				<Button size="sm" onClick={onSaveTheme} disabled={isSaving}>
					<Save className="mr-2 h-4 w-4" />
					Save Theme ({locale.toUpperCase()})
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={onResetTheme}
					disabled={isResetting}
				>
					<RotateCcw className="mr-2 h-4 w-4" />
					Reset to defaults
				</Button>
			</div>
		</div>
	);
}
