import { TRAILWORKS_CATALOG } from "@/demo-merchants/trailworks-catalog";
import { subResource } from "@/demo-merchants/rest-handlers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return subResource(TRAILWORKS_CATALOG, params.id, "returns");
}
