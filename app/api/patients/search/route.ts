import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/server/auth-helpers";
import { hasRole } from "@/server/auth";

export async function GET(req: Request) {
  const authUser = await getAuthUser(req);
  if (!authUser || !hasRole(authUser.roles, ["ADMIN", "EXPERT", "SUPPORT"])) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const nationalCode = url.searchParams.get("nationalCode")?.toString();
  if (!nationalCode) {
    return Response.json({ error: "national_code_required" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { nationalCode },
    select: {
      id: true,
      nationalCode: true,
      firstName: true,
      lastName: true,
      fullName: true,
      birthDate: true,
      age: true,
      gender: true,
      medicalNotes: true,
      conditions: true,
      verificationStatus: true,
    },
  });

  if (!patient) {
    return Response.json({ found: false });
  }

  return Response.json({ found: true, patient });
}
