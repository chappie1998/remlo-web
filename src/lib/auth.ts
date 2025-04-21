import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongooseAdapter } from "./mongodb-adapter";
import { User, VerificationToken } from "./mongodb";
import { connectToDatabase } from "./mongodb";

export const authOptions: NextAuthOptions = {
  adapter: MongooseAdapter(),
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
          await connectToDatabase();

          // Find the OTP in the database
          const otpRecord = await VerificationToken.findOne({
            identifier: credentials.email,
            token: credentials.otp,
            expires: {
              $gt: new Date(),
            },
          });

          if (!otpRecord) {
            return null;
          }

          // Delete the OTP record to prevent reuse
          await VerificationToken.findOneAndDelete({
            identifier: credentials.email,
            token: credentials.otp,
          });

          // Get or create user
          let user = await User.findOne({ email: credentials.email });

          if (!user) {
            user = await User.create({
              email: credentials.email,
              emailVerified: new Date(),
            });
          } else {
            user = await User.findOneAndUpdate(
              { email: credentials.email },
              { emailVerified: new Date() },
              { new: true }
            );
          }

          return {
            id: user._id.toString(),
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
        await connectToDatabase();

        // Fetch additional user data for the session
        const userData = await User.findById(token.userId);

        if (userData) {
          session.user = {
            ...session.user,
            id: token.userId as string,
            solanaAddress: userData.solanaAddress || null,
            hasPasscode: userData.hasPasscode || false,
          };
        }
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
