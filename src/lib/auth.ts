import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { verifyOTP } from "./otp";

// Create a Prisma client instance
export const db = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      id: "otp-login",
      name: "OTP Login",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) {
          return null;
        }

        try {
          // Verify OTP using external helper function
          const isValidOTP = await verifyOTP(credentials.email, credentials.otp);
          if (!isValidOTP) {
            return null;
          }

          // Delete the OTP record to prevent reuse
          await db.verificationToken.deleteMany({
            where: {
              identifier: credentials.email,
              token: credentials.otp,
            },
          });

          // Get or create user
          const user = await db.user.upsert({
            where: { email: credentials.email },
            update: {
              emailVerified: new Date(),
            },
            create: {
              email: credentials.email,
              emailVerified: new Date(),
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Error during OTP verification:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token?.userId) {
        // Fetch additional user data for the session
        const userData = await db.user.findUnique({
          where: { id: token.userId as string },
          select: {
            id: true,
            email: true,
            solanaAddress: true,
            hasPasscode: true,
          },
        });

        session.user = {
          ...session.user,
          id: token.userId as string,
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
