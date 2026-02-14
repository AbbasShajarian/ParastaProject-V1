import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["SUPPORT", "ADMIN"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (request.supportType !== "CHANGE") {
    return Response.json({ error: "not_in_change_queue" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const approve = body?.approve !== false;

  const updates: Record<string, unknown> = {};
  if (approve) {
    if (body?.serviceItemId) updates.serviceItemId = Number(body.serviceItemId);
    if (body?.city !== undefined) updates.city = body.city;
    if (body?.time !== undefined) updates.time = body.time;
    if (body?.notes !== undefined) updates.notes = body.notes;
  }

  const updated = await prisma.request.update({
    where: { id },
    data: {
      ...updates,
      supportType: null,
      lastActionByUserId: authUser.userId,
    },
  });

  await prisma.requestLog.create({
    data: {
      requestId: id,
      actorUserId: authUser.userId,
      action: approve ? "CHANGE_APPROVED" : "CHANGE_REJECTED",
      payload: JSON.stringify({ updates, approve }),
    },
  });

  return Response.json(updated);
}
