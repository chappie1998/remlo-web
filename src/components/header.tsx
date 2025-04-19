"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b py-3">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">
          Solana Passcode Wallet
        </Link>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              {session.user?.isAdmin && (
                <Link href="/admin/relayer" className="text-primary hover:underline text-sm">
                  Admin
                </Link>
              )}
              <Link
                href="/wallet"
                className="text-foreground hover:text-foreground/80"
              >
                My Wallet
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="text-foreground hover:text-foreground/80"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
