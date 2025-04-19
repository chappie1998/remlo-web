import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import type { Adapter } from "next-auth/adapters";

const prisma = new PrismaClient();

// List of admin email addresses
const ADMIN_EMAILS = ['admin@example.com']; // Add actual admin emails here

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
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
          // Find the OTP in the database
          const otpRecord = await prisma.verificationToken.findFirst({
            where: {
              identifier: credentials.email,
              token: credentials.otp,
              expires: {
                gt: new Date(),
              },
            },
          });

          if (!otpRecord) {
            return null;
          }

          // Delete the OTP record to prevent reuse
          await prisma.verificationToken.delete({
            where: {
              identifier_token: {
                identifier: credentials.email,
                token: credentials.otp,
              },
            },
          });

          // Get or create user
          const user = await prisma.user.upsert({
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
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST as string,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER as string,
          pass: process.env.EMAIL_SERVER_PASSWORD as string,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },
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
        const userData = await prisma.user.findUnique({
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

        // Check if user is an admin
        if (userData?.email && ADMIN_EMAILS.includes(userData.email)) {
          session.user.isAdmin = true;
        } else {
          session.user.isAdmin = false;
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
