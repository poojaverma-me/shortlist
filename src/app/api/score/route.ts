import { CANDIDATES } from "@/lib/candidates";
import { scoreStream } from "@/lib/score";
import type { Attribute } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { roleId?: string; attributes?: Attribute[]; ids?: string[]; fresh?: boolean };
  const attributes = Array.isArray(body.attributes) ? body.attributes.slice(0, 24) : [];
  if (!process.env.TYPESAFE_API_KEY) return Response.json({ error: "TYPESAFE_API_KEY is not set" }, { status: 500 });
  if (!attributes.length) return Response.json({ error: "attributes are required" }, { status: 400 });
  const ids = body.ids?.length ? body.ids : CANDIDATES.filter((c) => c.roleId === body.roleId).map((c) => c.id);
  return new Response(scoreStream(ids, attributes, Boolean(body.fresh)), {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
