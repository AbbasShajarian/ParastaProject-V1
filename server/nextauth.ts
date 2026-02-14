import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyOtpLogin, verifyPasswordLogin } from "@/server/auth";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        method: { label: "Method", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.method) return null;

        if (credentials.method === "password") {
          if (!credentials.password) return null;
          return verifyPasswordLogin(credentials.phone, credentials.password);
        }

        if (credentials.method === "otp") {
          if (!credentials.otp) return null;
          return verifyOtpLogin(credentials.phone, credentials.otp);
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        (token as any).phone = (user as any).phone;
        (token as any).roles = (user as any).roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).phone = (token as any).phone;
        (session.user as any).roles = (token as any).roles ?? [];
      }
      return session;
    },
  },
};
