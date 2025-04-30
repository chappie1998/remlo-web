"use client";

import { SessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
  return (
    <SessionProvider 
      refetchInterval={60 * 5} // Check session every 5 minutes instead of every 15 seconds
      refetchOnWindowFocus={false} // Don't refetch when window gains focus
    >
      {children}
    </SessionProvider>
  );
}
