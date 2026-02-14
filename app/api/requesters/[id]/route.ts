import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN", "EXPERT", "SUPPORT"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const requester = await prisma.patientRequester.findUnique({
    where: { id },
    include: {
      user: true,
      patient: true,
      requests: {
        include: { serviceItem: true, patient: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!requester) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(requester);
}
