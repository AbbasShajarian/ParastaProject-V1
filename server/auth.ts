import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MINUTES = 5;

export type RoleName = "ADMIN" | "EXPERT" | "USER" | "CARE_GIVER" | "SUPPORT";

export async function findUserByPhone(phone: string) {
  return prisma.user.findUnique({
    where: { phone },
    include: { roles: { include: { role: true } } },
  });
}

export function getRoleNames(user: NonNullable<Awaited<ReturnType<typeof findUserByPhone>>>) {
  return user.roles.map((r) => r.role.name as RoleName);
}

export async function verifyPasswordLogin(phone: string, password: string) {
  const user = await findUserByPhone(phone);
  if (!user) return null;
  if (!user.password) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  return {
    id: user.id.toString(),
    phone: user.phone,
    roles: getRoleNames(user),
  };
}

export async function createOtp(phone: string, purpose: string = "login") {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const user = await prisma.user.findUnique({ where: { phone } });

  const otp = await prisma.otp.create({
    data: {
      phone,
      codeHash,
      purpose,
      expiresAt,
      userId: user?.id ?? null,
    },
  });

  return { otpId: otp.id, code, expiresAt };
}

export async function verifyOtpCode(phone: string, code: string, purposes: string[]) {
  const otp = await prisma.otp.findFirst({
    where: {
      phone,
      purpose: { in: purposes },
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return false;

  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) return false;

  return true;
}

export async function verifyOtpLogin(phone: string, code: string) {
  const otp = await prisma.otp.findFirst({
    where: {
      phone,
      purpose: { in: ["login", "register"] },
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return null;

  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) return null;

  await prisma.otp.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  const user = await findUserByPhone(phone);
  if (!user) return null;

  return {
    id: user.id.toString(),
    phone: user.phone,
    roles: getRoleNames(user),
  };
}

export function hasRole(userRoles: string[], required: RoleName[]) {
  return userRoles.some((r) => required.includes(r as RoleName));
}

export async function createUser(
  phone: string,
  password?: string | null,
  name?: string,
  nationalCode?: string,
) {
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const user = await prisma.user.create({
    data: {
      phone,
      password: hashedPassword,
      nationalCode: nationalCode?.trim() || null,
      firstName: name?.trim() || null,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: { name: "USER" },
  });

  await prisma.userRole.create({
    data: { userId: user.id, roleId: userRole.id },
  });

  return user;
}
