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
  Wallet,
  HelpCircle
} from "lucide-react";

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="border-b shadow-sm bg-card/80 backdrop-blur-md sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
            <SolanaIcon className="h-6 w-6" />
            <span>Passcode Wallet</span>
          </Link>

          {session && (
            <nav className="hidden md:flex items-center ml-8 space-x-1">
              <Link
                href="/wallet"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/wallet")
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted hover:text-foreground text-muted-foreground"
                }`}
              >
                <Wallet size={16} />
                <span>My Wallet</span>
              </Link>
              <Link
                href="/about"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/about")
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted hover:text-foreground text-muted-foreground"
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
              <div className="hidden md:flex items-center text-sm text-muted-foreground border-l pl-3 mr-1">
                <User size={14} className="mr-1" />
                <span>{session.user?.email || ""}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="gap-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="gap-2">
              <Link href="/auth/signin">
                <User size={14} />
                <span>Sign In</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {session && (
        <div className="md:hidden border-t bg-card/60">
          <div className="container mx-auto px-4 py-1.5 flex justify-between">
            <Link
              href="/wallet"
              className={`flex flex-col items-center text-xs py-1 px-4 ${
                isActive("/wallet") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Wallet size={16} />
              <span>Wallet</span>
            </Link>
            <Link
              href="/about"
              className={`flex flex-col items-center text-xs py-1 px-4 ${
                isActive("/about") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <HelpCircle size={16} />
              <span>About</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
