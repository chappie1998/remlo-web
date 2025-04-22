"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/button";
import { CircleDollarSign, LogOut, Shield, ExternalLink } from "lucide-react";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="py-4 px-6 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <CircleDollarSign className="w-6 h-6 text-primary" />
          <Link href="/" className="text-xl font-bold">
            StableFi
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {session?.user && (
            <>
              <Link
                href="/wallet"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                About
              </Link>
              <a
                href="https://solscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-primary transition-colors flex items-center"
              >
                Explorer <ExternalLink className="ml-1 w-3 h-3" />
              </a>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {status === "authenticated" ? (
            <>
              <span className="hidden md:inline-block text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                <Shield className="w-3 h-3 inline mr-1" /> Protected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="text-sm"
              >
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button size="sm" className="text-sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
