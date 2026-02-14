import { findUserByPhone } from "@/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = body?.phone?.toString();

  if (!phone) {
    return Response.json({ error: "phone_required" }, { status: 400 });
  }

  const user = await findUserByPhone(phone);
  return Response.json({ exists: Boolean(user) });
}
