import { prisma } from "@/lib/prisma";
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

  const canSeeAll = hasRole(authUser.roles, ["ADMIN", "EXPERT", "SUPPORT"]);

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      requests: {
        include: {
          serviceItem: true,
        },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        select: {
          id: true,
          type: true,
          title: true,
          doctorName: true,
          visitDate: true,
          visitReason: true,
          visitLocation: true,
          notes: true,
          mimeType: true,
          size: true,
          originalSize: true,
          isCompressed: true,
          status: true,
          uploadedByRequesterId: true,
          verifiedByUserId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!patient) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (!canSeeAll) {
    const requester = await prisma.patientRequester.findFirst({
      where: {
        patientId: id,
        OR: [
          { userId: authUser.userId },
          authUser.phone ? { phone: authUser.phone } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!requester) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  return Response.json(patient);
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

  const body = await req.json().catch(() => null);

  const isExpert = hasRole(authUser.roles, ["ADMIN", "EXPERT"]);
  if (!isExpert) {
    const requester = await prisma.patientRequester.findFirst({
      where: {
        patientId: id,
        OR: [
          { userId: authUser.userId },
          authUser.phone ? { phone: authUser.phone } : undefined,
        ].filter(Boolean) as any,
      },
    });
    if (!requester) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const firstName = body?.firstName?.toString();
  const lastName = body?.lastName?.toString();
  const fullName =
    firstName || lastName
      ? `${firstName ?? ""} ${lastName ?? ""}`.trim()
      : body?.fullName?.toString();

  const data: any = {
    firstName,
    lastName,
    fullName,
    age: body?.age !== undefined ? Number(body.age) : undefined,
    gender: body?.gender,
    birthDate: body?.birthDate ? new Date(body.birthDate) : undefined,
    medicalNotes: body?.medicalNotes,
    conditions: body?.conditions,
    nationalCode: body?.nationalCode,
  };

  if (isExpert) {
    data.verificationStatus = body?.verificationStatus;
  }

  const updated = await prisma.patient.update({
    where: { id },
    data,
  });

  return Response.json(updated);
}
