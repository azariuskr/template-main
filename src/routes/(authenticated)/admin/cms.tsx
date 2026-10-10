import { createFileRoute } from "@tanstack/react-router";
import { CmsView } from "@/components/admin/cms/cms-view";

export const Route = createFileRoute("/(authenticated)/admin/cms")({
  component: CmsPage,
});

function CmsPage() {
  return <CmsView />;
}
