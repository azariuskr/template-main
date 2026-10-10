import { Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/cms/utils";
import type { CmsVersion } from "./cms-constants";

interface CmsVersionPanelProps {
	versions: CmsVersion[];
	onRollback: (version: number) => void;
	isBusy: boolean;
	hasMore?: boolean;
	onLoadMore?: () => void;
	isLoadingMore?: boolean;
}

function statusVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "published":
			return "default";
		case "rolled_back":
			return "secondary";
		case "draft":
			return "outline";
		default:
			return "secondary";
	}
}

export function CmsVersionPanel({
	versions,
	onRollback,
	isBusy,
	hasMore,
	onLoadMore,
	isLoadingMore,
}: CmsVersionPanelProps) {
	if (versions.length === 0) {
		return (
			<div className="py-8 text-center text-sm text-muted-foreground">
				No versions yet. Publish to create the first version.
			</div>
		);
	}

	return (
		<ScrollArea className="max-h-[500px]">
			<div className="space-y-2 pr-2">
				{versions.map((v) => (
					<div
						key={v.id}
						className="flex items-center justify-between rounded-md border px-3 py-2.5"
					>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-3">
								<span className="text-sm font-bold">v{v.version}</span>
								<Badge variant={statusVariant(v.status)} className="text-[10px]">
									{v.status}
								</Badge>
								<span className="text-xs text-muted-foreground">
									{formatRelativeTime(v.publishedAt ?? v.createdAt)}
								</span>
							</div>
							{v.notes && (
								<p className="mt-0.5 truncate text-xs italic text-muted-foreground">
									{v.notes}
								</p>
							)}
						</div>
						<Tooltip>
							<TooltipTrigger>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2"
									onClick={() => onRollback(v.version)}
									disabled={isBusy}
								>
									<RotateCcw className="h-3.5 w-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Restore v{v.version}</TooltipContent>
						</Tooltip>
					</div>
				))}

				{hasMore && onLoadMore && (
					<Button
						variant="outline"
						size="sm"
						className="w-full"
						onClick={onLoadMore}
						disabled={isLoadingMore}
					>
						{isLoadingMore ? (
							<>
								<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
								Loading...
							</>
						) : (
							"Load older versions"
						)}
					</Button>
				)}
			</div>
		</ScrollArea>
	);
}
