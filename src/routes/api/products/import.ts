/**
 * Product Import API Route
 *
 * POST /api/products/import
 * Accepts an xlsx file upload and returns parsed product data for preview.
 * Does NOT write to the database - use the $adminImportProducts server fn for that.
 */

import { createFileRoute } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth/auth";
import { parseImportRows, type ImportParseResult } from "@/lib/ecommerce/import-parser";

export const Route = createFileRoute("/api/products/import")({
	component: () => null,
	server: {
		handlers: {
			POST: async ({ request }) => {
				// Auth check
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session?.user) {
					return new Response("Unauthorized", { status: 401 });
				}

				// Parse form data
				let formData: FormData;
				try {
					formData = await request.formData();
				} catch {
					return Response.json({ error: "Invalid form data" }, { status: 400 });
				}

				const file = formData.get("file");
				if (!(file instanceof File)) {
					return Response.json({ error: "No file provided" }, { status: 400 });
				}

				// Validate file type
				const name = file.name.toLowerCase();
				if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
					return Response.json(
						{ error: "File must be .xlsx, .xls, or .csv" },
						{ status: 400 },
					);
				}

				// Read file buffer
				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(new Uint8Array(arrayBuffer));

				// Parse with xlsx
				let rows: Record<string, unknown>[];
				try {
					const wb = XLSX.read(buffer, { type: "buffer" });

					// Look for "Products" sheet first, fallback to first sheet
					const sheetName = wb.SheetNames.includes("Products")
						? "Products"
						: wb.SheetNames[0];

					if (!sheetName) {
						return Response.json({ error: "Empty workbook" }, { status: 400 });
					}

					const ws = wb.Sheets[sheetName];
					rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
						raw: false,
						defval: "",
					});
				} catch (err) {
					return Response.json(
						{ error: `Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}` },
						{ status: 400 },
					);
				}

				if (rows.length === 0) {
					return Response.json(
						{ error: "No data rows found in the Products sheet" },
						{ status: 400 },
					);
				}

				// Parse rows into structured product data
				const result: ImportParseResult = parseImportRows(rows);

				return Response.json(result);
			},
		},
	},
});
