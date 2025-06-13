"use client";

import { SessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
  return (
    <SessionProvider 
      refetchInterval={0} // No polling
      refetchOnWindowFocus={true} // Only refetch when window regains focus
    >
      {children}
    </SessionProvider>
  );
}
