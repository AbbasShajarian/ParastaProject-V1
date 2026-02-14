import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";

export async function GET(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      id: true,
      phone: true,
      nationalCode: true,
      firstName: true,
      lastName: true,
    },
  });

  return Response.json(user);
}

export async function PATCH(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const password = body?.password?.toString();

  const data: any = {
    firstName: body?.firstName?.toString() ?? undefined,
    lastName: body?.lastName?.toString() ?? undefined,
    nationalCode: body?.nationalCode?.toString() ?? undefined,
  };

  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const updated = await prisma.user.update({
    where: { id: authUser.userId },
    data,
    select: {
      id: true,
      phone: true,
      nationalCode: true,
      firstName: true,
      lastName: true,
    },
  });

  return Response.json(updated);
}
