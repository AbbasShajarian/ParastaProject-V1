import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  const updated = await prisma.serviceCategory.update({
    where: { id },
    data: {
      title: body?.title,
      sortOrder: body?.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      isActive: body?.isActive,
    },
  });

  return Response.json(updated);
}
