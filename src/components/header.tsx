"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SolanaIcon } from "@/components/icons";
import { usePathname } from "next/navigation";
import {
  LogOut,
  User,
  HelpCircle
} from "lucide-react";

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="border-b border-zinc-800 bg-black sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-emerald-400">
            <SolanaIcon className="h-6 w-6 text-emerald-400" />
            <span>Passcode Wallet</span>
          </Link>

          {session && (
            <nav className="hidden md:flex items-center ml-8 space-x-1">
              <Link
                href="/wallet"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/wallet")
                    ? "bg-emerald-950/50 text-emerald-400 font-medium"
                    : "hover:bg-zinc-800 hover:text-gray-200 text-gray-400"
                }`}
              >
                <span>My Wallet</span>
              </Link>
              <Link
                href="/about"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/about")
                    ? "bg-emerald-950/50 text-emerald-400 font-medium"
                    : "hover:bg-zinc-800 hover:text-gray-200 text-gray-400"
                }`}
              >
                <HelpCircle size={16} />
                <span>About</span>
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center text-sm text-gray-400 border-l border-zinc-800 pl-3 mr-1">
                <User size={14} className="mr-1" />
                <span>{session.user?.email || ""}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="gap-1 text-gray-300 border-zinc-700 hover:bg-zinc-800 hover:text-gray-100"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/auth/signin">
                <User size={14} />
                <span>Sign In</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
