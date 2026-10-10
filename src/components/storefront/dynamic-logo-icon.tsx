import {
	Gift,
	Heart,
	Package,
	PartyPopper,
	ShoppingBag,
	Sparkles,
	Star,
	Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
	ShoppingBag,
	Gift,
	PartyPopper,
	Store,
	Heart,
	Star,
	Sparkles,
	Package,
};

export function DynamicLogoIcon({
	name,
	className,
}: { name: string; className?: string }) {
	const Icon = ICON_MAP[name] ?? ShoppingBag;
	return <Icon className={className} />;
}
