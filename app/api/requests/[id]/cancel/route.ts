import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const request = await prisma.request.findUnique({
    where: { id },
    include: { patient: true, requester: true },
  });

  if (!request) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const requesterLink = await prisma.patientRequester.findFirst({
    where: { patientId: request.patientId, userId: authUser.userId },
  });

  const isPrimaryOrSecondary = requesterLink?.isPrimary || requesterLink?.isSecondary;
  const isRequesterUser = request.requester.userId === authUser.userId;

  if (!isPrimaryOrSecondary && !isRequesterUser) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const previousStatus = request.status;

  const updated = await prisma.request.update({
    where: { id },
    data: {
      status: "CANCEL_REQUESTED",
      supportType: "CANCEL",
      lastActionByUserId: authUser.userId,
    },
  });

  await prisma.requestLog.create({
    data: {
      requestId: id,
      actorUserId: authUser.userId,
      action: "CANCEL_REQUESTED",
      payload: JSON.stringify({ previousStatus }),
    },
  });

  return Response.json(updated);
}
