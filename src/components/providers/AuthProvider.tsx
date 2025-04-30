"use client";

import { SessionProvider } from "next-auth/react";
import { PropsWithChildren } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
  return (
    <SessionProvider 
      refetchInterval={15} // Check session every 15 seconds
      refetchOnWindowFocus={true} // Refetch session when window gains focus
    >
      {children}
    </SessionProvider>
  );
}
