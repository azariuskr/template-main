/**
 * Product Import Parser
 *
 * Parses flat xlsx rows (from the import template) into structured
 * product + variant objects ready for DB insertion.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Normalized representation of a single parsed xlsx data row */
export interface ImportRow {
	productName: string;
	productSlug?: string;
	shortDescription?: string;
	description?: string;
	category?: string;
	brand?: string;
	tags?: string[];
	featured: boolean;
	basePrice: number; // in BGN, will be converted to cents
	costPrice?: number;
	salePrice?: number;
	status: "draft" | "active";
	sku: string;
	colorName?: string;
	colorHex?: string;
	sizeName?: string;
	sizeCategory?: "clothing" | "shoes" | "accessories" | "one_size";
	stock: number;
}

export interface ParsedProduct {
	name: string;
	slug?: string;
	shortDescription?: string;
	description?: string;
	category?: string;
	brand?: string;
	tags: string[];
	featured: boolean;
	basePrice: number; // cents
	costPrice?: number; // cents
	salePrice?: number; // cents
	status: "draft" | "active";
	variants: Array<{
		sku: string;
		colorName?: string;
		colorHex?: string;
		sizeName?: string;
		sizeCategory?: string;
		stock: number;
	}>;
}

export interface ImportValidationError {
	row: number;
	field: string;
	message: string;
}

export interface ImportParseResult {
	products: ParsedProduct[];
	errors: ImportValidationError[];
	warnings: string[];
	stats: {
		totalRows: number;
		totalProducts: number;
		totalVariants: number;
		newColors: string[];
		newSizes: string[];
	};
}

// ---------------------------------------------------------------------------
// Known DB data (used to detect what needs to be created on import)
// ---------------------------------------------------------------------------

const KNOWN_COLORS = new Set([
	"black",
	"navy",
	"olive",
	"sand",
	"charcoal",
	"rust",
	"stone",
	"moss",
	"glacier",
]);

const KNOWN_SIZES = new Set([
	"xs",
	"s",
	"m",
	"l",
	"xl",
	"xxl",
	"one size",
]);

const VALID_SIZE_CATEGORIES: ReadonlySet<string> = new Set([
	"clothing",
	"shoes",
	"accessories",
	"one_size",
]);

// ---------------------------------------------------------------------------
// Public utilities
// ---------------------------------------------------------------------------

/**
 * Convert a product name (possibly containing Cyrillic) to a URL slug.
 * Applies transliteration for Cyrillic characters, then converts to
 * lowercase ASCII slug format.
 */
export function generateSlug(name: string): string {
	const cyrillicMap: Record<string, string> = {
		а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh",
		з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n",
		о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
		х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a",
		ь: "", ю: "yu", я: "ya",
		А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ж: "Zh",
		З: "Z", И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N",
		О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U", Ф: "F",
		Х: "H", Ц: "Ts", Ч: "Ch", Ш: "Sh", Щ: "Sht", Ъ: "A",
		Ь: "", Ю: "Yu", Я: "Ya",
	};

	return name
		.split("")
		.map((ch) => cyrillicMap[ch] ?? ch)
		.join("")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // strip diacritics
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 120);
}

/**
 * Parse a price value (string or number) from BGN to cents (integer).
 * Returns 0 for invalid or missing values.
 */
export function priceToCents(price: unknown): number {
	if (price === undefined || price === null || price === "") return 0;
	const n =
		typeof price === "number"
			? price
			: Number.parseFloat(String(price).replace(",", "."));
	if (Number.isNaN(n) || n < 0) return 0;
	return Math.round(n * 100);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeSizeCategory(
	raw?: string,
): "clothing" | "shoes" | "accessories" | "one_size" {
	const v = (raw ?? "clothing").toLowerCase().replace(/[\s-]/g, "_");
	if (VALID_SIZE_CATEGORIES.has(v)) {
		return v as "clothing" | "shoes" | "accessories" | "one_size";
	}
	return "clothing";
}

function parseTags(raw?: unknown): string[] {
	if (!raw) return [];
	return String(raw)
		.split(/[,;]+/)
		.map((t) => t.trim().toLowerCase())
		.filter(Boolean)
		.slice(0, 10);
}

function parseBool(raw?: unknown): boolean {
	if (typeof raw === "boolean") return raw;
	if (typeof raw === "number") return raw !== 0;
	return ["true", "yes", "1"].includes(
		String(raw ?? "")
			.trim()
			.toLowerCase(),
	);
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse raw rows from an xlsx sheet into structured product data.
 *
 * @param rows  Array of plain objects keyed by column header (as returned by
 *              `XLSX.utils.sheet_to_json(worksheet, { defval: "" })`).
 */
export function parseImportRows(
	rows: Record<string, unknown>[],
): ImportParseResult {
	const errors: ImportValidationError[] = [];
	const warnings: string[] = [];
	const productMap = new Map<string, ParsedProduct>();
	// name (lowercased) -> display name for new colors/sizes
	const newColorNames = new Set<string>();
	const newSizeNames = new Set<string>();
	// Track fallback hex codes for new colors (lower -> hex)
	const newColorHexMap = new Map<string, string>();

	let rowIndex = 0;

	for (const rawRow of rows) {
		rowIndex++;

		// Skip completely empty rows
		const rowValues = Object.values(rawRow).filter(
			(v) => v !== undefined && v !== null && v !== "",
		);
		if (rowValues.length === 0) continue;

		// ----------------------------------------------------------------
		// Required field validation
		// ----------------------------------------------------------------
		const productName = rawRow.product_name
			? String(rawRow.product_name).trim()
			: "";
		if (!productName) {
			errors.push({
				row: rowIndex,
				field: "product_name",
				message: "product_name is required",
			});
			continue;
		}

		const sku = rawRow.sku ? String(rawRow.sku).trim() : "";
		if (!sku) {
			errors.push({ row: rowIndex, field: "sku", message: "sku is required" });
			continue;
		}

		if (rawRow.base_price === undefined || rawRow.base_price === "") {
			errors.push({
				row: rowIndex,
				field: "base_price",
				message: "base_price is required",
			});
			continue;
		}

		const basePrice = priceToCents(rawRow.base_price);
		if (basePrice <= 0) {
			errors.push({
				row: rowIndex,
				field: "base_price",
				message: `Invalid price: ${String(rawRow.base_price)}`,
			});
			continue;
		}

		const rawStock = rawRow.stock;
		const stock = Number.parseInt(String(rawStock ?? "0"), 10);
		if (Number.isNaN(stock) || stock < 0) {
			errors.push({
				row: rowIndex,
				field: "stock",
				message: `Invalid stock value: ${String(rawStock)}`,
			});
			continue;
		}

		// ----------------------------------------------------------------
		// Color handling
		// ----------------------------------------------------------------
		const colorName = rawRow.color_name
			? String(rawRow.color_name).trim()
			: undefined;
		const colorHex = rawRow.color_hex
			? String(rawRow.color_hex).trim()
			: undefined;

		if (colorName && !KNOWN_COLORS.has(colorName.toLowerCase())) {
			if (!colorHex) {
				warnings.push(
					`Row ${rowIndex}: New color "${colorName}" has no hex code — will use #CCCCCC`,
				);
				newColorHexMap.set(colorName.toLowerCase(), "#CCCCCC");
			} else if (!/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
				errors.push({
					row: rowIndex,
					field: "color_hex",
					message: `Invalid hex color "${colorHex}" for color "${colorName}"`,
				});
				continue;
			} else {
				newColorHexMap.set(colorName.toLowerCase(), colorHex);
			}
			newColorNames.add(colorName);
		}

		// ----------------------------------------------------------------
		// Size handling
		// ----------------------------------------------------------------
		const sizeName = rawRow.size_name
			? String(rawRow.size_name).trim()
			: undefined;
		const sizeCategory = normalizeSizeCategory(
			rawRow.size_category as string | undefined,
		);

		if (sizeName && !KNOWN_SIZES.has(sizeName.toLowerCase())) {
			if (!rawRow.size_category) {
				warnings.push(
					`Row ${rowIndex}: New size "${sizeName}" has no size_category — defaulting to "clothing"`,
				);
			}
			newSizeNames.add(sizeName);
		}

		// ----------------------------------------------------------------
		// Build variant
		// ----------------------------------------------------------------
		const resolvedColorHex = colorName
			? (colorHex ?? newColorHexMap.get(colorName.toLowerCase()))
			: undefined;

		const variant = {
			sku,
			colorName,
			colorHex: resolvedColorHex,
			sizeName,
			sizeCategory: sizeName ? sizeCategory : undefined,
			stock: Number.isNaN(stock) ? 0 : stock,
		};

		// ----------------------------------------------------------------
		// Build or update product
		// ----------------------------------------------------------------
		if (!productMap.has(productName)) {
			const status =
				String(rawRow.status ?? "draft").trim().toLowerCase() === "active"
					? "active"
					: "draft";

			productMap.set(productName, {
				name: productName,
				slug: rawRow.product_slug
					? String(rawRow.product_slug).trim()
					: generateSlug(productName),
				shortDescription: rawRow.short_description
					? String(rawRow.short_description).trim()
					: undefined,
				description: rawRow.description
					? String(rawRow.description).trim()
					: undefined,
				category: rawRow.category
					? String(rawRow.category).trim()
					: undefined,
				brand: rawRow.brand ? String(rawRow.brand).trim() : undefined,
				tags: parseTags(rawRow.tags),
				featured: parseBool(rawRow.featured),
				basePrice,
				costPrice: rawRow.cost_price
					? priceToCents(rawRow.cost_price) || undefined
					: undefined,
				salePrice: rawRow.sale_price
					? priceToCents(rawRow.sale_price) || undefined
					: undefined,
				status,
				variants: [],
			});
		}

		productMap.get(productName)!.variants.push(variant);
	}

	const products = Array.from(productMap.values());

	return {
		products,
		errors,
		warnings,
		stats: {
			totalRows: rowIndex,
			totalProducts: products.length,
			totalVariants: products.reduce((sum, p) => sum + p.variants.length, 0),
			newColors: Array.from(newColorNames),
			newSizes: Array.from(newSizeNames),
		},
	};
}
