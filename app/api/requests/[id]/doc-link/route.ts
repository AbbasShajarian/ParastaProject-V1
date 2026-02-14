import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";
import crypto from "crypto";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN", "EXPERT"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);

  const updated = await prisma.request.update({
    where: { id },
    data: {
      docUploadToken: token,
      docUploadExpiresAt: expiresAt,
      lastActionByUserId: authUser.userId,
    },
  });

  return Response.json({ token, expiresAt, patientId: updated.patientId });
}
