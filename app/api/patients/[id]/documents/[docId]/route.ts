import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function GET(req: Request, { params }: { params: { id: string; docId: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  const docId = Number(params.docId);
  if (!id || !docId) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const isStaff = hasRole(authUser.roles, ["ADMIN", "EXPERT", "SUPPORT"]);
  if (!isStaff) {
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

  const doc = await prisma.patientDocument.findUnique({
    where: { id: docId },
  });

  if (!doc || doc.patientId !== id) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({
    id: doc.id,
    type: doc.type,
    title: doc.title,
    doctorName: doc.doctorName,
    visitDate: doc.visitDate,
    visitReason: doc.visitReason,
    visitLocation: doc.visitLocation,
    notes: doc.notes,
    mimeType: doc.mimeType,
    size: doc.size,
    data: doc.data.toString("base64"),
    createdAt: doc.createdAt,
    status: doc.status,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string; docId: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN", "EXPERT"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const docId = Number(params.docId);
  if (!docId) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const status = body?.status?.toString();
  if (!status) {
    return Response.json({ error: "status_required" }, { status: 400 });
  }

  const updated = await prisma.patientDocument.update({
    where: { id: docId },
    data: {
      status,
      verifiedByUserId: status === "PENDING" ? null : authUser.userId,
    },
  });

  return Response.json(updated);
}
