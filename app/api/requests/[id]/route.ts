import { prisma } from "@/lib/prisma";
import { updateRequestFields } from "@/server/requests";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
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
    include: {
      serviceItem: true,
      patient: true,
      requester: true,
      logs: {
        include: {
          actorUser: true,
          actorRequester: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!request) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const isStaff = hasRole(authUser.roles, ["ADMIN", "EXPERT", "SUPPORT"]);
  if (isStaff) {
    return Response.json(request);
  }

  if (hasRole(authUser.roles, ["CARE_GIVER"]) && request.assignedCaregiverId === authUser.userId) {
    return Response.json(request);
  }

  const requesterLink = await prisma.patientRequester.findFirst({
    where: { patientId: request.patientId, userId: authUser.userId },
  });

  const isPrimaryOrSecondary = requesterLink?.isPrimary || requesterLink?.isSecondary;
  const isRequesterUser = request.requester.userId === authUser.userId;

  if (isPrimaryOrSecondary || isRequesterUser) {
    return Response.json(request);
  }

  return Response.json({ error: "forbidden" }, { status: 403 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const canUpdate = hasRole(authUser.roles, ["ADMIN", "EXPERT"]);
  if (!canUpdate) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const updated = await updateRequestFields(id, {
    serviceItemId: body?.serviceItemId ? Number(body.serviceItemId) : undefined,
    patientId: body?.patientId ? Number(body.patientId) : undefined,
    city: body?.city,
    time: body?.time,
    notes: body?.notes,
    status: body?.status,
    assignedCaregiverId: body?.assignedCaregiverId ? Number(body.assignedCaregiverId) : undefined,
    assignedExpertId: body?.assignedExpertId ? Number(body.assignedExpertId) : undefined,
    currentOwnerUserId: body?.currentOwnerUserId ? Number(body.currentOwnerUserId) : undefined,
    lastActionByUserId: authUser.userId,
    supportType: body?.supportType,
  });

  return Response.json(updated);
}
