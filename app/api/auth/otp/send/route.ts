import { createOtp, findUserByPhone } from "@/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = body?.phone?.toString();
  const purpose = body?.purpose?.toString() ?? "login";

  if (!phone) {
    return Response.json({ error: "phone_required" }, { status: 400 });
  }

  const existing = await findUserByPhone(phone);
  if (purpose === "register" && existing) {
    return Response.json({ error: "phone_exists" }, { status: 409 });
  }
  if (purpose === "login" && !existing) {
    return Response.json({ error: "phone_not_found" }, { status: 404 });
  }

  const { code, expiresAt } = await createOtp(phone, purpose);

  const response: any = { ok: true, expiresAt };
  if (process.env.NODE_ENV !== "production") {
    response.devCode = code;
  }

  return Response.json(response);
}
