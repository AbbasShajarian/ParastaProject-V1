import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const type = body?.type?.toString();
  const title = body?.title?.toString();
  const doctorName = body?.doctorName?.toString();
  const visitDate = body?.visitDate ? new Date(body.visitDate) : undefined;
  const visitReason = body?.visitReason?.toString();
  const visitLocation = body?.visitLocation?.toString();
  const notes = body?.notes?.toString();
  const mimeType = body?.mimeType?.toString();
  const dataBase64 = body?.data?.toString();
  const uploadToken = body?.uploadToken?.toString();

  if (!type || !mimeType || !dataBase64) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const authUser = await getAuthUser(req);

  let uploadedByRequesterId: number | null = null;

  if (!authUser) {
    if (!uploadToken) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const request = await prisma.request.findFirst({
      where: {
        docUploadToken: uploadToken,
        docUploadExpiresAt: { gt: new Date() },
        patientId: id,
      },
    });

    if (!request) {
      return Response.json({ error: "invalid_token" }, { status: 401 });
    }

    uploadedByRequesterId = request.requesterId;
  } else {
    const requester = await prisma.patientRequester.findFirst({
      where: { patientId: id, userId: authUser.userId },
    });
    uploadedByRequesterId = requester?.id ?? null;
  }

  const buffer = Buffer.from(dataBase64, "base64");

  const existing = await prisma.patientDocument.findFirst({
    where: { patientId: id, type },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const updated = await prisma.patientDocument.update({
      where: { id: existing.id },
      data: {
        title,
        doctorName,
        visitDate,
        visitReason,
        visitLocation,
        notes,
        mimeType,
        size: buffer.length,
        data: buffer,
        isCompressed: body?.isCompressed ?? false,
        originalSize: body?.originalSize ? Number(body.originalSize) : null,
        uploadedByRequesterId,
        status: "PENDING",
        verifiedByUserId: null,
      },
    });

    await prisma.patientDocument.deleteMany({
      where: { patientId: id, type, id: { not: existing.id } },
    });

    return Response.json({ id: updated.id, replaced: true });
  }

  const created = await prisma.patientDocument.create({
    data: {
      patientId: id,
      type,
      title,
      doctorName,
      visitDate,
      visitReason,
      visitLocation,
      notes,
      mimeType,
      size: buffer.length,
      data: buffer,
      isCompressed: body?.isCompressed ?? false,
      originalSize: body?.originalSize ? Number(body.originalSize) : null,
      uploadedByRequesterId,
      status: "PENDING",
    },
  });

  return Response.json({ id: created.id });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const isStaff = hasRole(authUser.roles, ["ADMIN", "EXPERT", "SUPPORT"]);
  if (!isStaff) {
    const requester = await prisma.patientRequester.findFirst({
      where: { patientId: id, userId: authUser.userId },
    });
    if (!requester) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const docs = await prisma.patientDocument.findMany({
    where: { patientId: id },
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
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(docs);
}
