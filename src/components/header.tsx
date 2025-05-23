"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { RemloIcon } from "@/components/icons";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User, Home, Activity, DollarSign, Bell, ArrowLeft, ArrowLeftRight, LinkIcon } from "lucide-react";

interface HeaderProps {
  title?: string;
  backUrl?: string;
}

export default function Header({ title, backUrl }: Readonly<HeaderProps>) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    return pathname === path;
  };

  // Custom signout function for JWT authentication
  const handleSignOut = async () => {
    try {
      // Call our JWT signout endpoint
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // Clear any client-side state
        // Redirect to home page
        window.location.href = '/';
      } else {
        console.error('Signout failed');
        // Still redirect to be safe
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error during signout:', error);
      // Still redirect to be safe
      window.location.href = '/';
    }
  };

  // If a back URL is provided, show a simpler header with back button and title
  if (backUrl) {
    return (
      <header className="border-b border-zinc-800 fixed top-0 left-0 right-0 z-40 bg-black">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-emerald-400" onClick={() => router.push(backUrl)}>
              <ArrowLeft size={20} />
            </Button>
            {title && <h1 className="text-lg font-medium">{title}</h1>}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>
    );
  }

  // Default header with navigation
  return (
    <header className="border-b border-zinc-800 sticky top-0 z-40 bg-black">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-emerald-400">
            <RemloIcon className="h-6 w-6 text-emerald-400" />
            <span>Remlo</span>
          </Link>

          {session?.user && (
            <nav className="hidden md:flex items-center ml-8 space-x-2">
              <Link
                href="/wallet"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/wallet") ? "bg-emerald-950/50 text-emerald-400 font-medium" : "hover:bg-zinc-800 hover:text-gray-200 text-gray-400"
                }`}>
                <Home size={16} />
                <span>Home</span>
              </Link>
              <Link
                href="/wallet/send"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/wallet/send") ? "bg-emerald-950/50 text-emerald-400 font-medium" : "hover:bg-zinc-800 hover:text-gray-200 text-gray-400"
                }`}>
                <span>Send</span>
              </Link>
              <Link
                href="/wallet/receive"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/wallet/receive") ? "bg-emerald-950/50 text-emerald-400 font-medium" : "hover:bg-zinc-800 hover:text-gray-200 text-gray-400"
                }`}>
                <span>Receive</span>
              </Link>
              <Link
                href="/wallet/swap?from=usdc"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/wallet/swap") ? "bg-emerald-950/50 text-emerald-400 font-medium" : "hover:bg-zinc-800 hover:text-gray-200 text-gray-400"
                }`}>
                <ArrowLeftRight size={16} />
                <span>Earn</span>
              </Link>
              <Link
                href="/payment-links"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/payment-links") ? "bg-emerald-950/50 text-emerald-400 font-medium" : "hover:bg-zinc-800 hover:text-gray-200 text-gray-400"
                }`}>
                <LinkIcon size={16} />
                <span>Links</span>
              </Link>
              <Link
                href="/payment-requests"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/payment-requests") ? "bg-emerald-950/50 text-emerald-400 font-medium" : "hover:bg-zinc-800 hover:text-gray-200 text-gray-400"
                }`}>
                <DollarSign size={16} />
                <span>Requests</span>
              </Link>
              <Link
                href="/activity"
                className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                  isActive("/activity") ? "bg-emerald-950/50 text-emerald-400 font-medium" : "hover:bg-zinc-800 hover:text-gray-200 text-gray-400"
                }`}>
                <Activity size={16} />
                <span>Activity</span>
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {session?.user && (
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-emerald-400 hover:bg-zinc-800">
              <Bell size={18} />
            </Button>
          )}
          <ThemeToggle />
          {session?.user ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center text-sm text-gray-400 border-l border-zinc-800 pl-3 mr-1">
                <User size={14} className="mr-1" />
                <span>{session.user?.email ?? ""}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1 text-gray-300 border-zinc-700 hover:bg-zinc-800 hover:text-gray-100">
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
