"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

export default function TokenRefreshProvider() {
  const { data: session, status } = useSession();
  const hasRefreshed = useRef(false);

  useEffect(() => {
    // Only run once per session load and when user is authenticated
    if (status === "authenticated" && session?.user?.solanaAddress && !hasRefreshed.current) {
      hasRefreshed.current = true;
      
      // Check if we have a JWT token cookie
      const hasJWTToken = document.cookie.includes('auth-token=');
      
      if (!hasJWTToken) {
        // Refresh token in the background
        fetch('/api/auth/refresh-token', {
          method: 'POST',
          credentials: 'include',
        }).catch(console.error); // Silent fail - not critical
      }
    }
  }, [status, session]);

  // This component doesn't render anything
  return null;
} 