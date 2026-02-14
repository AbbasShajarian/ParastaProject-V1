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

  if (request.supportType !== "CANCEL") {
    return Response.json({ error: "not_in_cancel_queue" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const approve = body?.approve !== false;

  let nextStatus = "CANCELED";
  if (!approve) {
    const lastLog = await prisma.requestLog.findFirst({
      where: { requestId: id, action: "CANCEL_REQUESTED" },
      orderBy: { createdAt: "desc" },
    });

    try {
      const payload = lastLog?.payload ? JSON.parse(lastLog.payload) : null;
      nextStatus = payload?.previousStatus || "NEW";
    } catch {
      nextStatus = "NEW";
    }
  }

  const updated = await prisma.request.update({
    where: { id },
    data: {
      status: nextStatus,
      supportType: null,
      lastActionByUserId: authUser.userId,
    },
  });

  await prisma.requestLog.create({
    data: {
      requestId: id,
      actorUserId: authUser.userId,
      action: approve ? "CANCEL_APPROVED" : "CANCEL_REJECTED",
      payload: JSON.stringify({ nextStatus }),
    },
  });

  return Response.json(updated);
}
