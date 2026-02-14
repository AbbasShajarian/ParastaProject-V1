import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function GET(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN", "EXPERT"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const roleFilter = url.searchParams.get("role");

  const users = await prisma.user.findMany({
    where: roleFilter
      ? { roles: { some: { role: { name: roleFilter } } } }
      : undefined,
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(
    users.map((u) => ({
      id: u.id,
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      status: u.status,
      roles: u.roles.map((r) => r.role.name),
    })),
  );
}

export async function POST(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN", "EXPERT"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const phone = body?.phone?.toString();
  const password = body?.password?.toString();
  const roles = (body?.roles as string[]) ?? [];

  if (!phone || !password || roles.length === 0) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const wantsAdminRole = roles.some((r) => ["ADMIN", "SUPPORT", "EXPERT"].includes(r));
  if (wantsAdminRole && !hasRole(authUser.roles, ["ADMIN"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return Response.json({ error: "phone_exists" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      phone,
      password: hashedPassword,
      firstName: body?.firstName,
      lastName: body?.lastName,
    },
  });

  for (const roleName of roles) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });
  }

  return Response.json({
    id: user.id,
    phone: user.phone,
  });
}
