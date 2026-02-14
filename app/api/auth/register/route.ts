import { createUser, verifyOtpCode, findUserByPhone } from "@/server/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = body?.phone?.toString();
  const otp = body?.otp?.toString();
  const nationalCode = body?.nationalCode?.toString();

  if (!phone || !otp || !nationalCode) {
    return Response.json({ error: "phone_otp_national_required" }, { status: 400 });
  }

  const existing = await findUserByPhone(phone);
  if (existing) {
    return Response.json({ error: "phone_exists" }, { status: 409 });
  }

  const otpValid = await verifyOtpCode(phone, otp, ["register"]);
  if (!otpValid) {
    return Response.json({ error: "otp_invalid" }, { status: 400 });
  }

  try {
    const user = await createUser(phone, null, undefined, nationalCode);
    return Response.json({ id: user.id, phone: user.phone });
  } catch (err: any) {
    return Response.json({ error: "register_failed" }, { status: 400 });
  }
}
