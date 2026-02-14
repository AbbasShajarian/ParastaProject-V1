import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const roleHome = () => "/";

const hasRole = (roles: string[], allowed: string[]) =>
  roles.some((role) => allowed.includes(role));

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (pathname === "/login" || pathname === "/register" || pathname === "/request") {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search ?? ""}`);
    return NextResponse.redirect(loginUrl);
  }

  const roles = ((token as any).roles as string[]) ?? [];
  const home = roleHome();

  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!hasRole(roles, ["ADMIN"])) {
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/requests") || pathname.startsWith("/requesters")) {
    if (!hasRole(roles, ["ADMIN", "EXPERT", "SUPPORT", "CARE_GIVER"])) {
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/patients")) {
    if (!hasRole(roles, ["ADMIN", "EXPERT", "SUPPORT", "CARE_GIVER", "USER"])) {
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    if (!hasRole(roles, ["ADMIN", "USER"])) {
      return NextResponse.redirect(new URL(home, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/requests/:path*",
    "/patients/:path*",
    "/requesters/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/profile",
    "/request",
  ],
};
