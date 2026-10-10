/**
 * Product Import Server Functions
 *
 * Server functions for bulk product import from xlsx template.
 * Handles creating missing colors/sizes then creating products + variants.
 */

import { createServerFn } from "@tanstack/react-start";
import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { accessMiddleware } from "@/lib/auth/middleware";
import { db } from "@/lib/db";
import {
	brand,
	category,
	product,
	productColor,
	productSize,
	productVariant,
} from "@/lib/db/schema";
import { safe } from "@/lib/result";
import { validate } from "@/lib/validation";
import { generateSlug } from "@/lib/ecommerce/import-parser";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const ImportVariantSchema = z.object({
	sku: z.string().min(1).max(100),
	colorName: z.string().optional(),
	colorHex: z.string().optional(),
	sizeName: z.string().optional(),
	sizeCategory: z.enum(["clothing", "shoes", "accessories", "one_size"]).optional(),
	stock: z.number().int().min(0).default(0),
});

const ImportProductSchema = z.object({
	name: z.string().min(1).max(255),
	slug: z.string().optional(),
	shortDescription: z.string().optional(),
	description: z.string().optional(),
	category: z.string().optional(),
	brand: z.string().optional(),
	tags: z.array(z.string()).default([]),
	featured: z.boolean().default(false),
	basePrice: z.number().int().min(0),
	costPrice: z.number().int().min(0).optional(),
	salePrice: z.number().int().min(0).optional(),
	status: z.enum(["draft", "active"]).default("draft"),
	variants: z.array(ImportVariantSchema).default([]),
});

const ImportPayloadSchema = z.object({
	products: z.array(ImportProductSchema),
	dryRun: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Helper: find or create color
// ---------------------------------------------------------------------------

async function findOrCreateColor(
	name: string,
	hex: string,
	colorCache: Map<string, string>,
): Promise<string | undefined> {
	const key = name.toLowerCase();
	if (colorCache.has(key)) return colorCache.get(key)!;

	// Try to find by name (case-insensitive)
	const [existing] = await db
		.select({ id: productColor.id })
		.from(productColor)
		.where(ilike(productColor.name, name))
		.limit(1);

	if (existing) {
		colorCache.set(key, existing.id);
		return existing.id;
	}

	// Create new color
	const hexCode = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#CCCCCC";
	const [created] = await db
		.insert(productColor)
		.values({ name: name.trim(), hexCode, sortOrder: 99 })
		.returning({ id: productColor.id });

	if (created) {
		colorCache.set(key, created.id);
		return created.id;
	}
}

// ---------------------------------------------------------------------------
// Helper: find or create size
// ---------------------------------------------------------------------------

async function findOrCreateSize(
	name: string,
	sizeCategory: "clothing" | "shoes" | "accessories" | "one_size",
	sizeCache: Map<string, string>,
): Promise<string | undefined> {
	const key = `${name.toLowerCase()}_${sizeCategory}`;
	if (sizeCache.has(key)) return sizeCache.get(key)!;

	// Try to find by name + category
	const [existing] = await db
		.select({ id: productSize.id })
		.from(productSize)
		.where(and(ilike(productSize.name, name), eq(productSize.sizeCategory, sizeCategory)))
		.limit(1);

	if (existing) {
		sizeCache.set(key, existing.id);
		return existing.id;
	}

	// Create new size
	const [created] = await db
		.insert(productSize)
		.values({ name: name.trim(), sizeCategory, sortOrder: 99 })
		.returning({ id: productSize.id });

	if (created) {
		sizeCache.set(key, created.id);
		return created.id;
	}
}

// ---------------------------------------------------------------------------
// Helper: find category / brand by name
// ---------------------------------------------------------------------------

async function findCategoryId(name: string): Promise<string | undefined> {
	const [row] = await db
		.select({ id: category.id })
		.from(category)
		.where(ilike(category.name, name))
		.limit(1);
	return row?.id;
}

async function findBrandId(name: string): Promise<string | undefined> {
	const [row] = await db
		.select({ id: brand.id })
		.from(brand)
		.where(ilike(brand.name, name))
		.limit(1);
	return row?.id;
}

// ---------------------------------------------------------------------------
// Helper: ensure slug is unique
// ---------------------------------------------------------------------------

async function uniqueSlug(base: string): Promise<string> {
	let slug = base || generateSlug("product");
	let attempt = 0;

	while (true) {
		const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
		const [existing] = await db
			.select({ id: product.id })
			.from(product)
			.where(eq(product.slug, candidate))
			.limit(1);
		if (!existing) return candidate;
		attempt++;
	}
}

// ---------------------------------------------------------------------------
// Import result type
// ---------------------------------------------------------------------------

export interface ImportResult {
	created: number;
	skipped: number;
	totalVariants: number;
	errors: Array<{ product: string; error: string }>;
}

// ---------------------------------------------------------------------------
// Server Function: Execute Import
// ---------------------------------------------------------------------------

export const $adminImportProducts = createServerFn({ method: "POST" })
	.inputValidator((data: unknown) => validate(ImportPayloadSchema, data))
	.middleware([accessMiddleware({ permissions: { products: ["write"] } })])
	.handler(async ({ data }): Promise<{ ok: boolean; data?: ImportResult; error?: string }> => {
		return safe(async () => {
			if (!data.ok) throw data.error;

			const { products, dryRun } = data.data;

			if (dryRun) {
				// Return preview stats without writing
				const totalVariants = products.reduce((s, p) => s + p.variants.length, 0);
				return {
					created: 0,
					skipped: 0,
					totalVariants,
					errors: [],
				} satisfies ImportResult;
			}

			const colorCache = new Map<string, string>();
			const sizeCache = new Map<string, string>();
			const result: ImportResult = { created: 0, skipped: 0, totalVariants: 0, errors: [] };

			for (const p of products) {
				try {
					// Resolve category + brand
					const categoryId = p.category ? await findCategoryId(p.category) : undefined;
					const brandId = p.brand ? await findBrandId(p.brand) : undefined;

					// Ensure unique slug
					const slug = await uniqueSlug(p.slug ?? generateSlug(p.name));

					// Create product
					const [createdProduct] = await db
						.insert(product)
						.values({
							name: p.name,
							slug,
							description: p.description,
							shortDescription: p.shortDescription,
							basePrice: p.basePrice,
							costPrice: p.costPrice,
							salePrice: p.salePrice,
							status: p.status,
							isFeatured: p.featured,
							tags: p.tags,
							categoryId,
							brandId,
							totalStock: 0,
						})
						.returning({ id: product.id });

					if (!createdProduct) {
						result.errors.push({ product: p.name, error: "Failed to insert product" });
						result.skipped++;
						continue;
					}

					// Create variants
					let variantStock = 0;
					for (const v of p.variants) {
						const colorId = v.colorName
							? await findOrCreateColor(v.colorName, v.colorHex ?? "#CCCCCC", colorCache)
							: undefined;

						const sizeId =
							v.sizeName && v.sizeCategory
								? await findOrCreateSize(v.sizeName, v.sizeCategory, sizeCache)
								: undefined;

						await db.insert(productVariant).values({
							productId: createdProduct.id,
							sku: v.sku,
							colorId,
							sizeId,
							stock: v.stock,
							isActive: true,
						});

						variantStock += v.stock;
						result.totalVariants++;
					}

					// Update denormalized totalStock
					await db
						.update(product)
						.set({ totalStock: variantStock })
						.where(eq(product.id, createdProduct.id));

					result.created++;
				} catch (err) {
					result.errors.push({
						product: p.name,
						error: err instanceof Error ? err.message : "Unknown error",
					});
					result.skipped++;
				}
			}

			return result;
		});
	});
