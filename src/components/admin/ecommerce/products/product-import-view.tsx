/**
 * Product Import View
 *
 * 3-step import wizard:
 * 1. Upload xlsx file → parse preview
 * 2. Review parsed products/variants + warnings
 * 3. Confirm import → show results
 */

import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Download,
	FileSpreadsheet,
	Loader2,
	Upload,
	XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/admin/app-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ROUTES } from "@/constants";
import { $adminImportProducts } from "@/lib/ecommerce/functions/import";
import { formatPrice } from "@/constants";
import type { ImportParseResult, ParsedProduct } from "@/lib/ecommerce/import-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "upload" | "preview" | "importing" | "done";

interface ImportResultData {
	created: number;
	skipped: number;
	totalVariants: number;
	errors: Array<{ product: string; error: string }>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DropZone({
	onFile,
	isLoading,
}: {
	onFile: (file: File) => void;
	isLoading: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) onFile(file);
		},
		[onFile],
	);

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
			onClick={() => inputRef.current?.click()}
			className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors ${
				isDragging
					? "border-primary bg-primary/5"
					: "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
			}`}
		>
			<input
				ref={inputRef}
				type="file"
				accept=".xlsx,.xls,.csv"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) onFile(file);
				}}
			/>
			{isLoading ? (
				<Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
			) : (
				<FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
			)}
			<div className="text-center">
				<p className="text-sm font-medium">
					{isLoading ? "Parsing file..." : "Drop your xlsx file here"}
				</p>
				<p className="text-xs text-muted-foreground">
					{isLoading ? "Please wait" : "or click to browse · .xlsx, .xls, .csv"}
				</p>
			</div>
		</div>
	);
}

function StatCard({ label, value, variant = "default" }: { label: string; value: number | string; variant?: "default" | "success" | "error" | "warn" }) {
	const colors = {
		default: "text-foreground",
		success: "text-green-600",
		error: "text-red-600",
		warn: "text-yellow-600",
	};
	return (
		<div className="rounded-lg border bg-card p-4 text-center">
			<div className={`text-2xl font-bold ${colors[variant]}`}>{value}</div>
			<div className="text-xs text-muted-foreground">{label}</div>
		</div>
	);
}

function ProductPreviewRow({ p }: { p: ParsedProduct }) {
	const [open, setOpen] = useState(false);
	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/40 rounded">
				<div className="flex items-center gap-2 text-left">
					{open ? (
						<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					) : (
						<ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					)}
					<span className="font-medium">{p.name}</span>
					<Badge variant="outline" className="text-xs">
						{p.variants.length} variant{p.variants.length !== 1 ? "s" : ""}
					</Badge>
					{p.category && (
						<Badge variant="secondary" className="text-xs">
							{p.category}
						</Badge>
					)}
				</div>
				<span className="text-muted-foreground">{formatPrice(p.basePrice)}</span>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="mx-3 mb-2 divide-y rounded border text-xs">
					{p.variants.map((v) => (
						<div key={v.sku} className="flex items-center gap-3 px-3 py-1.5">
							<span className="font-mono text-muted-foreground w-24 shrink-0">{v.sku}</span>
							{v.colorName && (
								<span className="flex items-center gap-1">
									{v.colorHex && (
										<span
											className="inline-block h-3 w-3 rounded-full border"
											style={{ backgroundColor: v.colorHex }}
										/>
									)}
									{v.colorName}
								</span>
							)}
							{v.sizeName && <span className="text-muted-foreground">{v.sizeName}</span>}
							<span className="ml-auto text-muted-foreground">{v.stock} in stock</span>
						</div>
					))}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProductImportView() {
	const navigate = useNavigate();
	const [step, setStep] = useState<Step>("upload");
	const [isUploading, setIsUploading] = useState(false);
	const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
	const [importResult, setImportResult] = useState<ImportResultData | null>(null);
	const [importError, setImportError] = useState<string | null>(null);

	// -----------------------------------------------------------------------
	// Step 1: Upload + parse
	// -----------------------------------------------------------------------
	const handleFile = useCallback(async (file: File) => {
		setIsUploading(true);
		try {
			const form = new FormData();
			form.append("file", file);

			const res = await fetch("/api/products/import", {
				method: "POST",
				body: form,
			});

			const json = await res.json();

			if (!res.ok) {
				toast.error(json.error ?? "Failed to parse file");
				return;
			}

			setParseResult(json as ImportParseResult);
			setStep("preview");
		} catch {
			toast.error("Failed to upload file");
		} finally {
			setIsUploading(false);
		}
	}, []);

	// -----------------------------------------------------------------------
	// Step 3: Execute import
	// -----------------------------------------------------------------------
	const handleImport = useCallback(async () => {
		if (!parseResult) return;
		setStep("importing");
		setImportError(null);

		try {
			const res = await $adminImportProducts({
				data: {
					products: parseResult.products,
					dryRun: false,
				},
			});

			if (!res.ok) {
				setImportError(res.error?.message ?? "Import failed");
				setStep("preview");
				return;
			}

			setImportResult(res.data as ImportResultData);
			setStep("done");
		} catch (err) {
			setImportError(err instanceof Error ? err.message : "Unexpected error");
			setStep("preview");
		}
	}, [parseResult]);

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------

	return (
		<PageContainer
			title="Import Products"
			description="Upload an xlsx file to bulk import products"
			actions={
				<Button variant="outline" asChild>
					<a href="/template/templates/product-import-template.xlsx" download>
						<Download className="mr-2 h-4 w-4" />
						Download Template
					</a>
				</Button>
			}
		>
			{/* Step 1: Upload */}
			{step === "upload" && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Upload Import File</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Alert>
							<FileSpreadsheet className="h-4 w-4" />
							<AlertDescription>
								Use the <strong>Download Template</strong> button above to get the correct format.
								Fill in the <em>Products</em> sheet — one row per variant, same product name groups rows into one product.
							</AlertDescription>
						</Alert>
						<DropZone onFile={handleFile} isLoading={isUploading} />
					</CardContent>
				</Card>
			)}

			{/* Step 2: Preview */}
			{step === "preview" && parseResult && (
				<div className="space-y-4">
					{/* Stats */}
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<StatCard label="Products" value={parseResult.stats.totalProducts} />
						<StatCard label="Variants" value={parseResult.stats.totalVariants} />
						<StatCard
							label="New Colors"
							value={parseResult.stats.newColors.length}
							variant={parseResult.stats.newColors.length > 0 ? "warn" : "default"}
						/>
						<StatCard
							label="New Sizes"
							value={parseResult.stats.newSizes.length}
							variant={parseResult.stats.newSizes.length > 0 ? "warn" : "default"}
						/>
					</div>

					{/* Validation errors */}
					{parseResult.errors.length > 0 && (
						<Alert variant="destructive">
							<XCircle className="h-4 w-4" />
							<AlertDescription>
								<strong>{parseResult.errors.length} validation error(s)</strong> — fix these in your file and re-upload:
								<ul className="mt-1 list-disc pl-4 text-xs">
									{parseResult.errors.slice(0, 10).map((e, i) => (
										<li key={i}>Row {e.row}: [{e.field}] {e.message}</li>
									))}
									{parseResult.errors.length > 10 && <li>…and {parseResult.errors.length - 10} more</li>}
								</ul>
							</AlertDescription>
						</Alert>
					)}

					{/* Warnings */}
					{parseResult.warnings.length > 0 && (
						<Alert>
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								<ul className="list-disc pl-4 text-xs">
									{parseResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
								</ul>
							</AlertDescription>
						</Alert>
					)}

					{/* New colors/sizes to create */}
					{(parseResult.stats.newColors.length > 0 || parseResult.stats.newSizes.length > 0) && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Will be auto-created</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-wrap gap-2 text-xs">
								{parseResult.stats.newColors.map((colorName) => (
									<span key={colorName} className="flex items-center gap-1 rounded border px-2 py-0.5">
										{colorName}
									</span>
								))}
								{parseResult.stats.newSizes.map((sizeName) => (
									<Badge key={sizeName} variant="outline">
										{sizeName}
									</Badge>
								))}
							</CardContent>
						</Card>
					)}

					{/* Product list */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">
								Products to import ({parseResult.products.length})
							</CardTitle>
						</CardHeader>
						<CardContent className="divide-y p-0">
							{parseResult.products.map((p) => (
								<ProductPreviewRow key={p.name} p={p} />
							))}
						</CardContent>
					</Card>

					{/* Import error */}
					{importError && (
						<Alert variant="destructive">
							<XCircle className="h-4 w-4" />
							<AlertDescription>{importError}</AlertDescription>
						</Alert>
					)}

					{/* Actions */}
					<div className="flex items-center justify-between">
						<Button
							variant="outline"
							onClick={() => {
								setStep("upload");
								setParseResult(null);
							}}
						>
							← Upload Different File
						</Button>
						<Button
							onClick={handleImport}
							disabled={parseResult.errors.length > 0 || parseResult.stats.totalProducts === 0}
						>
							<Upload className="mr-2 h-4 w-4" />
							Import {parseResult.stats.totalProducts} Products
						</Button>
					</div>
				</div>
			)}

			{/* Step: Importing */}
			{step === "importing" && (
				<Card>
					<CardContent className="flex flex-col items-center justify-center gap-3 py-16">
						<Loader2 className="h-10 w-10 animate-spin text-primary" />
						<p className="text-sm text-muted-foreground">Importing products…</p>
					</CardContent>
				</Card>
			)}

			{/* Step: Done */}
			{step === "done" && importResult && (
				<Card>
					<CardContent className="space-y-6 py-10">
						<div className="flex flex-col items-center gap-3">
							<CheckCircle2 className="h-12 w-12 text-green-500" />
							<h2 className="text-xl font-semibold">Import Complete</h2>
						</div>
						<div className="mx-auto grid max-w-sm grid-cols-3 gap-3">
							<StatCard label="Created" value={importResult.created} variant="success" />
							<StatCard label="Variants" value={importResult.totalVariants} />
							<StatCard
								label="Skipped"
								value={importResult.skipped}
								variant={importResult.skipped > 0 ? "error" : "default"}
							/>
						</div>
						{importResult.errors.length > 0 && (
							<Alert variant="destructive">
								<XCircle className="h-4 w-4" />
								<AlertDescription>
									<ul className="list-disc pl-4 text-xs">
										{importResult.errors.map((e, i) => (
											<li key={i}>{e.product}: {e.error}</li>
										))}
									</ul>
								</AlertDescription>
							</Alert>
						)}
						<div className="flex justify-center gap-3">
							<Button variant="outline" onClick={() => { setStep("upload"); setImportResult(null); setParseResult(null); }}>
								Import More
							</Button>
							<Button onClick={() => navigate({ to: ROUTES.ADMIN.PRODUCTS })}>
								View Products
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</PageContainer>
	);
}
