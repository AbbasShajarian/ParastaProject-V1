import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN", "EXPERT"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const caregiverId = Number(body?.caregiverId);
  if (!caregiverId) {
    return Response.json({ error: "caregiver_required" }, { status: 400 });
  }

  const updated = await prisma.request.update({
    where: { id },
    data: {
      assignedCaregiverId: caregiverId,
      assignedExpertId: authUser.userId,
      status: "ASSIGNED",
      lastActionByUserId: authUser.userId,
    },
  });

  await prisma.requestLog.create({
    data: {
      requestId: id,
      actorUserId: authUser.userId,
      action: "ASSIGNED_CAREGIVER",
      payload: JSON.stringify({ caregiverId }),
    },
  });

  return Response.json(updated);
}
