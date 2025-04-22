"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-primary">
            Solana Passcode Wallet
          </Link>

          {session && (
            <nav className="hidden md:flex items-center space-x-4 text-sm">
              <Link href="/wallet" className="hover:text-primary transition-colors">
                My Wallet
              </Link>
              <Link href="/about" className="hover:text-primary transition-colors">
                About
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {session ? (
            <>
              <span className="text-sm text-muted-foreground hidden md:inline-block ml-2 mr-2">
                {session.user?.email || ""}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="border-primary/40 hover:border-primary hover:bg-primary/10"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="ml-2">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
