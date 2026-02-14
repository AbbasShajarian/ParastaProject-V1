import {
  createRequest,
  listRequestsForAdmin,
  listRequestsForCaregiver,
  listRequestsForExpert,
  listRequestsForSupport,
  listRequestsForUser,
} from "@/server/requests";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const authUser = await getAuthUser(req);

  const requesterPhone = body?.phone?.toString() ?? authUser?.phone;
  const serviceItemId = body?.serviceItemId ? Number(body.serviceItemId) : undefined;
  const patientId = body?.patientId ? Number(body.patientId) : undefined;

  if (!requesterPhone) {
    return Response.json({ error: "phone_required" }, { status: 400 });
  }
  if (body?.phone && !/^09\d{9}$/.test(requesterPhone)) {
    return Response.json({ error: "invalid_phone" }, { status: 400 });
  }

  const patientPayload = body?.patient
    ? {
        nationalCode: body?.patient?.nationalCode?.toString(),
        firstName: body?.patient?.firstName,
        lastName: body?.patient?.lastName,
        age: body?.patient?.age ? Number(body.patient.age) : undefined,
        gender: body?.patient?.gender,
      }
    : undefined;

  try {
    const request = await createRequest({
      requesterPhone,
      userId: authUser?.userId ?? null,
      patientId,
      patient: patientPayload,
      serviceItemId,
      city: body?.city,
      time: body?.time,
      notes: body?.notes,
    });

    return Response.json(request);
  } catch (err: any) {
    return Response.json({ error: "request_failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (hasRole(authUser.roles, ["ADMIN"])) {
    const requests = await listRequestsForAdmin();
    return Response.json(requests);
  }

  if (hasRole(authUser.roles, ["SUPPORT"])) {
    const requests = await listRequestsForSupport();
    return Response.json(requests);
  }

  if (hasRole(authUser.roles, ["CARE_GIVER"])) {
    const requests = await listRequestsForCaregiver(authUser.userId);
    return Response.json(requests);
  }

  if (hasRole(authUser.roles, ["EXPERT"])) {
    const requests = await listRequestsForExpert();
    return Response.json(requests);
  }

  const requests = await listRequestsForUser(authUser.userId);
  return Response.json(requests);
}
