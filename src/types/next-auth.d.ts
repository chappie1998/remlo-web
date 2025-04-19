import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    /** The user's Solana wallet address */
    solanaAddress?: string;
    /** Whether the user has set up a passcode */
    hasPasscode?: boolean;
    /** Whether the user is an admin */
    isAdmin?: boolean;
  }

  interface Session {
    user?: {
      /** The user's ID from the database */
      id?: string;
      /** The user's name */
      name?: string | null;
      /** The user's email */
      email?: string | null;
      /** The user's image */
      image?: string | null;
      /** The user's Solana wallet address */
      solanaAddress?: string;
      /** Whether the user has set up a passcode */
      hasPasscode?: boolean;
      /** Whether the user is an admin */
      isAdmin?: boolean;
    } & DefaultSession["user"];
  }
}
