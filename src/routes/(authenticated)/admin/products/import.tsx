import { createFileRoute } from "@tanstack/react-router";
import { ProductImportView } from "@/components/admin/ecommerce/products/product-import-view";

export const Route = createFileRoute("/(authenticated)/admin/products/import")({
	component: ProductImportPage,
});

function ProductImportPage() {
	return <ProductImportView />;
}
