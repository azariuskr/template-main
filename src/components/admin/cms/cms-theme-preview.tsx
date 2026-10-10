import { Heart, ShoppingBag, Star } from "lucide-react";

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

interface CmsThemePreviewProps {
	theme: PreviewTheme;
}

export function CmsThemePreview({ theme }: CmsThemePreviewProps) {
	return (
		<div
			className="min-h-[280px] overflow-hidden rounded-lg border"
			style={{ backgroundColor: theme.background }}
		>
			{/* Nav bar */}
			<div
				className="flex items-center justify-between border-b px-4 py-2.5"
				style={{
					backgroundColor: theme.surface,
					borderColor: `${theme.accent}33`,
					fontFamily: theme.fontSans,
				}}
			>
				<div className="flex items-center gap-2">
					<ShoppingBag
						className="h-4 w-4"
						style={{ color: theme.primary }}
					/>
					<span
						className="text-sm font-bold"
						style={{
							color: theme.primary,
							fontFamily: theme.fontHeading,
						}}
					>
						KinderZone
					</span>
				</div>
				<div
					className="flex items-center gap-4 text-xs"
					style={{ color: theme.mutedText }}
				>
					<span>Shop</span>
					<span>About</span>
					<span>Cart (2)</span>
				</div>
			</div>

			{/* Hero mini */}
			<div className="px-4 py-6 text-center">
				<h3
					className="text-lg font-bold"
					style={{ color: theme.text, fontFamily: theme.fontHeading }}
				>
					Making memories, one{" "}
					<span style={{ color: theme.primary }}>pop</span> at a time
				</h3>
				<p
					className="mt-1 text-xs"
					style={{ color: theme.mutedText, fontFamily: theme.fontSans }}
				>
					Hand-picked party supplies for every celebration
				</p>
				<button
					type="button"
					className="mt-3 rounded-full px-4 py-1.5 text-xs font-semibold text-white"
					style={{ backgroundColor: theme.primary }}
				>
					Shop Now
				</button>
			</div>

			{/* Product card row */}
			<div className="flex gap-3 px-4 pb-4">
				{[
					{ name: "Balloon Arch", price: "$24.99", rating: 4.8 },
					{ name: "Party Kit", price: "$39.99", rating: 4.9 },
				].map((p) => (
					<div
						key={p.name}
						className="flex-1 overflow-hidden rounded-lg border"
						style={{
							backgroundColor: theme.surface,
							borderColor: `${theme.accent}22`,
						}}
					>
						<div
							className="h-16"
							style={{ backgroundColor: `${theme.accent}15` }}
						/>
						<div className="p-2.5">
							<div
								className="text-xs font-semibold"
								style={{
									color: theme.text,
									fontFamily: theme.fontSans,
								}}
							>
								{p.name}
							</div>
							<div className="mt-1 flex items-center justify-between">
								<span
									className="text-xs font-bold"
									style={{ color: theme.primary }}
								>
									{p.price}
								</span>
								<div className="flex items-center gap-0.5">
									<Star
										className="h-3 w-3"
										style={{ color: theme.accent }}
										fill={theme.accent}
									/>
									<span
										className="text-[10px]"
										style={{ color: theme.mutedText }}
									>
										{p.rating}
									</span>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Footer strip */}
			<div
				className="flex items-center justify-between border-t px-4 py-2"
				style={{
					backgroundColor: theme.surface,
					borderColor: `${theme.accent}22`,
				}}
			>
				<span
					className="text-[10px]"
					style={{ color: theme.mutedText, fontFamily: theme.fontSans }}
				>
					2026 KinderZone
				</span>
				<Heart className="h-3 w-3" style={{ color: theme.primary }} />
			</div>
		</div>
	);
}
