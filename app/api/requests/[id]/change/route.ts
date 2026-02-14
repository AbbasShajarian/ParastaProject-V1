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

  if (request.supportType) {
    return Response.json({ error: "already_in_support_queue" }, { status: 400 });
  }

  const requesterLink = await prisma.patientRequester.findFirst({
    where: { patientId: request.patientId, userId: authUser.userId },
  });

  const isPrimaryOrSecondary = requesterLink?.isPrimary || requesterLink?.isSecondary;
  const isRequesterUser = request.requester.userId === authUser.userId;

  if (!isPrimaryOrSecondary && !isRequesterUser) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const requestedChanges: Record<string, unknown> = {};

  if (body?.serviceItemId) {
    requestedChanges.serviceItemId = Number(body.serviceItemId);
  }
  if (body?.city) requestedChanges.city = body.city;
  if (body?.time) requestedChanges.time = body.time;
  if (body?.notes) requestedChanges.notes = body.notes;

  const updated = await prisma.request.update({
    where: { id },
    data: {
      supportType: "CHANGE",
      lastActionByUserId: authUser.userId,
    },
  });

  await prisma.requestLog.create({
    data: {
      requestId: id,
      actorUserId: authUser.userId,
      action: "CHANGE_REQUESTED",
      payload: JSON.stringify({
        note: body?.note ?? null,
        requestedChanges,
      }),
    },
  });

  return Response.json(updated);
}
