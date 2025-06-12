import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** The user's ID from the database */
    userId?: string;
    /** The user's Solana wallet address */
    solanaAddress?: string | null;
    /** The user's EVM wallet address */
    evmAddress?: string | null;
    /** Whether the user has set up a passcode */
    hasPasscode?: boolean;
    /** The user's unique username */
    username?: string | null;
  }
}

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `Provider` React Context
   */
  interface Session {
    user: {
      /** The user's ID from the database */
      id?: string;
      /** The user's Solana wallet address */
      solanaAddress?: string | null;
      /** The user's EVM wallet address */
      evmAddress?: string | null;
      /** Whether the user has set up a passcode */
      hasPasscode?: boolean;
      /** The user's unique username */
      username?: string | null;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User {
    /** The user's Solana wallet address */
    solanaAddress?: string;
    /** The user's EVM wallet address */
    evmAddress?: string;
    /** Whether the user has set up a passcode */
    hasPasscode?: boolean;
    /** The user's unique username */
    username?: string;
  }
}
