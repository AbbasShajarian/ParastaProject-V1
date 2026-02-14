import { getToken } from "next-auth/jwt";

export type AuthUser = {
  userId: number;
  phone?: string;
  roles: string[];
};

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const token = await getToken({ req: req as any, secret });
  if (!token?.sub) return null;

  return {
    userId: Number(token.sub),
    phone: (token as any).phone,
    roles: ((token as any).roles as string[]) ?? [],
  };
}
