import "next-auth";
import { DefaultSession } from "next-auth";

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
      /** Whether the user has set up a passcode */
      hasPasscode?: boolean;
      /** The user's unique username */
      username?: string | null;
    } & DefaultSession["user"];
    google_id_token?: string;
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User {
    /** The user's Solana wallet address */
    solanaAddress?: string;
    /** Whether the user has set up a passcode */
    hasPasscode?: boolean;
    /** The user's unique username */
    username?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    google_id_token?: string;
    userId?: string;
    solanaAddress?: string | null;
    hasPasscode?: boolean;
    username?: string | null;
  }
}
