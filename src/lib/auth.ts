import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    signIn: async ({ account, profile }) => {
      if (account?.provider === "google") {
        console.log("acc", account, profile);
        // return profile?.email_verified && profile.email.endsWith("@example.com");
      }
      return true; // Do different verification for other providers that don't have `email_verified`
    },
    session: async ({ session, token }) => {
      if (token?.userId) {
        // Fetch additional user data for the session
        const userData = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: {
            id: true,
            email: true,
            solanaAddress: true,
            hasPasscode: true,
            username: true,
          },
        });

        session.user = {
          ...session.user,
          id: token.userId as string,
          solanaAddress: userData?.solanaAddress || null,
          hasPasscode: userData?.hasPasscode || false,
          username: userData?.username || null,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },
};
