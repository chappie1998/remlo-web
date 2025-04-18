import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST || "localhost",
        port: Number(process.env.EMAIL_SERVER_PORT) || 1025,
        auth: {
          user: process.env.EMAIL_SERVER_USER || "",
          pass: process.env.EMAIL_SERVER_PASSWORD || "",
        },
      },
      from: process.env.EMAIL_FROM || "noreply@solanawallet.app",
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      // Fetch additional user data for the session
      if (user && session.user) {
        const userData = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            solanaAddress: true,
            hasPasscode: true,
          },
        });

        session.user = {
          ...session.user,
          id: user.id,
          solanaAddress: userData?.solanaAddress || null,
          hasPasscode: userData?.hasPasscode || false,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },
  session: {
    strategy: "jwt",
  },
};
