import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId");
  const all = url.searchParams.get("all") === "true";

  if (all) {
    const authUser = await getAuthUser(req);
    if (!authUser || !hasRole(authUser.roles, ["ADMIN"])) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const where: any = all ? {} : { isActive: true };
  if (categoryId) where.categoryId = Number(categoryId);

  const items = await prisma.serviceItem.findMany({
    where,
    orderBy: { id: "asc" },
  });

  return Response.json(items);
}

export async function POST(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const title = body?.title?.toString();
  const categoryId = Number(body?.categoryId);

  if (!title || !categoryId) {
    return Response.json({ error: "title_and_category_required" }, { status: 400 });
  }

  const created = await prisma.serviceItem.create({
    data: {
      title,
      categoryId,
      price: body?.price !== undefined ? Number(body.price) : null,
      isActive: body?.isActive ?? true,
    },
  });

  return Response.json(created);
}
