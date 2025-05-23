import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
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
    jwt: async ({ token, user, account }) => {
      if (user) {
        const userData = await prisma.user.findUnique({
          where: { email: user.email! },
          select: {
            id: true,
            email: true,
            solanaAddress: true,
            hasPasscode: true,
            username: true,
          },
        });

        if (userData) {
          token.userId = userData.id;
          token.solanaAddress = userData.solanaAddress;
          token.hasPasscode = userData.hasPasscode;
          token.username = userData.username;
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user = {
          ...session.user,
          id: token.userId as string,
          solanaAddress: token.solanaAddress as string | null,
          hasPasscode: token.hasPasscode as boolean,
          username: token.username as string | null,
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
