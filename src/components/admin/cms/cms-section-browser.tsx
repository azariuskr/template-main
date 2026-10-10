import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
	CMS_SECTION_TYPES,
	type CmsSection,
	type CmsSectionType,
} from "./cms-constants";

interface CmsSectionBrowserProps {
	sections: CmsSection[];
	selectedKey: string;
	onSelectSection: (key: string) => void;
	onCreateSection: (key: string, type: CmsSectionType) => void;
	isCreating: boolean;
}

export function CmsSectionBrowser({
	sections,
	selectedKey,
	onSelectSection,
	onCreateSection,
	isCreating,
}: CmsSectionBrowserProps) {
	const [search, setSearch] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [newKey, setNewKey] = useState("");
	const [newType, setNewType] = useState<CmsSectionType>("custom");

	const filtered = search
		? sections.filter((s) =>
				s.key.toLowerCase().includes(search.toLowerCase()),
			)
		: sections;

	const handleCreate = () => {
		const key = newKey.trim();
		if (!key) return;
		onCreateSection(key, newType);
		setNewKey("");
		setDialogOpen(false);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					Sections
				</label>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					{/* Use render prop to avoid button-inside-button nesting */}
					<DialogTrigger
						render={
							<Button variant="ghost" size="sm" className="h-6 px-2" />
						}
					>
						<Plus className="h-3.5 w-3.5" />
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>New Section</DialogTitle>
							<DialogDescription>
								Create a new CMS content section.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-2">
							<div className="grid gap-2">
								<Label htmlFor="new-section-key">Section key</Label>
								<Input
									id="new-section-key"
									value={newKey}
									onChange={(e) => setNewKey(e.target.value)}
									placeholder="about.hero"
									onKeyDown={(e) => {
										if (e.key === "Enter") handleCreate();
									}}
								/>
							</div>
							<div className="grid gap-2">
								<Label>Type</Label>
								<div className="flex flex-wrap gap-2">
									{CMS_SECTION_TYPES.map((type) => (
										<Button
											key={type}
											type="button"
											size="sm"
											variant={newType === type ? "default" : "outline"}
											onClick={() => setNewType(type)}
										>
											{type}
										</Button>
									))}
								</div>
							</div>
						</div>
						<DialogFooter>
							{/* Use render prop to avoid button-inside-button nesting */}
							<DialogClose render={<Button variant="outline" />}>
								Cancel
							</DialogClose>
							<Button
								onClick={handleCreate}
								disabled={isCreating || !newKey.trim()}
							>
								Create
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search..."
					className="h-8 pl-8 text-xs"
				/>
			</div>

			{/* Section list */}
			<ScrollArea className="max-h-[calc(100vh-420px)] min-h-[200px]">
				<div className="space-y-1 pr-2">
					{filtered.length === 0 ? (
						<p className="py-4 text-center text-xs text-muted-foreground">
							{search ? "No matching sections." : "No sections yet."}
						</p>
					) : (
						filtered.map((section) => (
							<button
								key={section.id}
								type="button"
								onClick={() => onSelectSection(section.key)}
								className={cn(
									"flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors",
									selectedKey === section.key
										? "bg-primary/10 text-primary"
										: "hover:bg-muted",
								)}
							>
								<span className="truncate font-medium">{section.key}</span>
								<div className="flex items-center gap-1.5">
									<Badge
										variant="secondary"
										className="px-1.5 py-0 text-[10px]"
									>
										{section.type}
									</Badge>
									<span className="text-[10px] text-muted-foreground">
										{section.translations.length}
									</span>
								</div>
							</button>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
