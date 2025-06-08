import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
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
    TwitterProvider({
      clientId: process.env.TWITTER_ID!,
      clientSecret: process.env.TWITTER_SECRET!,
      version: "2.0", // Use Twitter API v2
      authorization: {
        params: {
          scope: "users.read tweet.read",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    signIn: async ({ account, profile, user }) => {
      if (account?.provider === "google") {
        console.log("acc", account, profile);
        // return profile?.email_verified && profile.email.endsWith("@example.com");
      }
      if (account?.provider === "twitter") {
        console.log("Twitter login:", account, profile);
        
        // Store Twitter username if user was just created or update it if needed
        const twitterProfile = profile as any; // Twitter profile structure
        if (account?.providerAccountId && twitterProfile?.data?.username) {
          try {
            console.log("Updating user with Twitter username:", twitterProfile.data.username);
            console.log("Twitter provider account ID:", account.providerAccountId);
            
            // Find user by Twitter account connection
            const userAccount = await prisma.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: "twitter",
                  providerAccountId: account.providerAccountId
                }
              },
              include: {
                user: true
              }
            });

            if (userAccount?.user) {
              await prisma.user.update({
                where: { id: userAccount.user.id },
                data: { 
                  username: twitterProfile.data.username,
                  name: twitterProfile.data.name || userAccount.user.name,
                  image: twitterProfile.data.profile_image_url || userAccount.user.image,
                },
              });
              console.log("Successfully updated Twitter user data");
            } else {
              console.log("User account not found for Twitter update");
            }
          } catch (error) {
            console.error("Failed to update Twitter username:", error);
            // Don't block sign in if this fails
          }
        }
      }
      return true; // Do different verification for other providers that don't have `email_verified`
    },
    jwt: async ({ token, user, account, trigger }) => {
      // On sign in, store basic user info in token
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        
        // Try to get additional user data from database
        try {
          let userData = null;
          
          // For users with email (Google, etc.)
          if (user.email) {
            userData = await prisma.user.findUnique({
              where: { email: user.email },
              select: {
                id: true,
                email: true,
                solanaAddress: true,
                hasPasscode: true,
                username: true,
              },
            });
          }
          
          // For users without email (Twitter, etc.), find by other means
          if (!userData && user.id) {
            userData = await prisma.user.findUnique({
              where: { id: user.id },
              select: {
                id: true,
                email: true,
                solanaAddress: true,
                hasPasscode: true,
                username: true,
              },
            });
          }

          if (userData) {
            token.userId = userData.id;
            token.solanaAddress = userData.solanaAddress;
            token.hasPasscode = userData.hasPasscode;
            token.username = userData.username;
          } else {
            // If user not found in database yet (first sign in), set defaults
            token.solanaAddress = null;
            token.hasPasscode = false;
            token.username = null;
          }
        } catch (error) {
          console.error("Error fetching user data in JWT callback:", error);
          // Set defaults if there's an error
          token.solanaAddress = null;
          token.hasPasscode = false;
          token.username = null;
        }
      }
      
      // Always return token with userId at minimum
      if (!token.userId && user?.id) {
        token.userId = user.id;
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
