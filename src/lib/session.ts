// Session utility to minimize multiple session fetches
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// Global session cache
let cachedSession: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * An optimized version of useSession that uses a global cache
 * to prevent multiple components from triggering separate session fetches
 */
export function useOptimizedSession() {
  const { data: session, status, update } = useSession();
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    if (session && !isLoaded) {
      // Update cache when session data is received
      cachedSession = session;
      lastFetchTime = Date.now();
      setIsLoaded(true);
    }
  }, [session, isLoaded]);
  
  // Use cached session if available and not expired
  if (cachedSession && Date.now() - lastFetchTime < CACHE_TTL) {
    return { 
      data: cachedSession, 
      status: 'authenticated',
      update
    };
  }
  
  return { data: session, status, update };
}

/**
 * Manually get the current session without triggering a new fetch
 * if there's a valid cached session
 */
export function getCurrentSession() {
  if (cachedSession && Date.now() - lastFetchTime < CACHE_TTL) {
    return cachedSession;
  }
  return null;
} 