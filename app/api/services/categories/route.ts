import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "true";

  if (all) {
    const authUser = await getAuthUser(req);
    if (!authUser || !hasRole(authUser.roles, ["ADMIN"])) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const categories = await prisma.serviceCategory.findMany({
    where: all ? undefined : { isActive: true },
    include: { items: { where: all ? undefined : { isActive: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return Response.json(categories);
}

export async function POST(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const title = body?.title?.toString();
  if (!title) {
    return Response.json({ error: "title_required" }, { status: 400 });
  }

  const created = await prisma.serviceCategory.create({
    data: {
      title,
      sortOrder: body?.sortOrder ? Number(body.sortOrder) : 0,
      isActive: body?.isActive ?? true,
    },
  });

  return Response.json(created);
}
