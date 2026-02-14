import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function GET(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "true";

  if (all && hasRole(authUser.roles, ["ADMIN", "EXPERT", "SUPPORT"])) {
    const patients = await prisma.patient.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return Response.json(patients);
  }

  const patients = await prisma.patient.findMany({
    where: {
      requesters: {
        some: {
          OR: [
            { userId: authUser.userId },
            authUser.phone ? { phone: authUser.phone } : undefined,
          ].filter(Boolean) as any,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json(patients);
}

export async function POST(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const nationalCode = body?.nationalCode?.toString();
  if (!nationalCode) {
    return Response.json({ error: "national_code_required" }, { status: 400 });
  }

  let patient = await prisma.patient.findUnique({
    where: { nationalCode },
  });

  if (!patient) {
    const fullName =
      body?.firstName || body?.lastName
        ? `${body?.firstName ?? ""} ${body?.lastName ?? ""}`.trim()
        : undefined;
    patient = await prisma.patient.create({
      data: {
        nationalCode,
        firstName: body?.firstName,
        lastName: body?.lastName,
        fullName,
        age: body?.age ? Number(body.age) : undefined,
        gender: body?.gender,
        verificationStatus: "PENDING",
      },
    });
  }

  const existingRequester = await prisma.patientRequester.findFirst({
    where: { patientId: patient.id, userId: authUser.userId },
  });

  if (!existingRequester) {
    const requesterCount = await prisma.patientRequester.count({
      where: { patientId: patient.id },
    });

    await prisma.patientRequester.create({
      data: {
        patientId: patient.id,
        userId: authUser.userId,
        phone: authUser.phone ?? "",
        score: 0,
        totalRequests: 0,
        lastRequestAt: null,
        isPrimary: requesterCount === 0,
        isSecondary: false,
        historyAccessGranted: requesterCount === 0,
      },
    });
  }

  return Response.json(patient);
}
