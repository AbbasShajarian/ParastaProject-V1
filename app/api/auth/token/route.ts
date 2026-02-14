import { encode } from "next-auth/jwt";
import { verifyOtpLogin, verifyPasswordLogin } from "@/server/auth";

const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = body?.phone?.toString();
  const method = body?.method?.toString();

  if (!phone || !method) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  let user = null;
  if (method === "password") {
    user = await verifyPasswordLogin(phone, body?.password?.toString() ?? "");
  } else if (method === "otp") {
    user = await verifyOtpLogin(phone, body?.otp?.toString() ?? "");
  }

  if (!user) {
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const token = await encode({
    token: {
      sub: user.id,
      phone: user.phone,
      roles: user.roles,
    } as any,
    secret,
    maxAge: TOKEN_MAX_AGE,
  });

  return Response.json({
    tokenType: "Bearer",
    accessToken: token,
    expiresIn: TOKEN_MAX_AGE,
    user: { id: user.id, phone: user.phone, roles: user.roles },
  });
}
