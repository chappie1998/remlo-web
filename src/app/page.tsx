"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/components/header";
import { SendMoneyIcon, RequestMoneyIcon, ActivityIcon } from "@/components/icons";
import { ArrowRight, CreditCard, Smartphone, ShieldCheck } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />

      <main className="flex-1 flex flex-col">
        {/* Hero section */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 text-center">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-emerald-400">
              Money flows between friends
            </h1>

            <p className="text-xl text-gray-400">
              Send and receive money instantly, simply, and securely with Remlo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {status === "authenticated" ? (
                <Button asChild size="lg" className="px-8 bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/wallet" className="flex items-center gap-2">
                    {session?.user?.hasPasscode ? "Go to My Account" : "Set Up Account"}
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="px-8 bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/auth/signin" className="flex items-center gap-2">
                    Get Started
                    <ArrowRight size={16} />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Feature blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 md:p-10 max-w-6xl mx-auto w-full">
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col">
            <div className="h-12 w-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <SendMoneyIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Send Money Instantly</h3>
            <p className="text-gray-400 mb-4 flex-1">
              Send money to anyone with just their email or phone number. No waiting, no fees.
            </p>
            <Button variant="ghost" asChild className="mt-auto justify-start px-0 text-emerald-400 hover:text-emerald-300 hover:bg-transparent">
              <Link href={status === "authenticated" ? "/wallet/send" : "/auth/signin"} className="flex items-center gap-1">
                Send Money
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col">
            <div className="h-12 w-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <RequestMoneyIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Request Payments</h3>
            <p className="text-gray-400 mb-4 flex-1">
              Split bills, collect money, or request payments from anyone in just a few taps.
            </p>
            <Button variant="ghost" asChild className="mt-auto justify-start px-0 text-emerald-400 hover:text-emerald-300 hover:bg-transparent">
              <Link href={status === "authenticated" ? "/wallet/receive" : "/auth/signin"} className="flex items-center gap-1">
                Request Money 
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col">
            <div className="h-12 w-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <ActivityIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Track Your Money</h3>
            <p className="text-gray-400 mb-4 flex-1">
              View your transaction history, see payment statuses, and manage your finances in one place.
            </p>
            <Button variant="ghost" asChild className="mt-auto justify-start px-0 text-emerald-400 hover:text-emerald-300 hover:bg-transparent">
              <Link href={status === "authenticated" ? "/activity" : "/auth/signin"} className="flex items-center gap-1">
                View Activity
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </div>

        {/* Benefits section */}
        <div className="bg-emerald-900/20 border-y border-emerald-800/50 text-white p-10 mt-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-10 text-center text-emerald-400">Why people love Remlo</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <ShieldCheck className="w-8 h-8 flex-shrink-0 text-emerald-400" />
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-white">Secure by Design</h3>
                  <p className="text-gray-300">
                    Your account is protected by advanced security, with no complex keys to manage or lose.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Smartphone className="w-8 h-8 flex-shrink-0 text-emerald-400" />
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-white">Simplified Experience</h3>
                  <p className="text-gray-300">
                    No technical jargon or complicated processes. Just simple, intuitive money transfers.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <CreditCard className="w-8 h-8 flex-shrink-0 text-emerald-400" />
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-white">No Hidden Fees</h3>
                  <p className="text-gray-300">
                    Send and receive money without worrying about transaction fees or hidden costs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-zinc-900 py-8 border-t border-zinc-800">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">
            Remlo — Send and receive money instantly
          </p>
          <div className="flex justify-center gap-8 mt-4 text-sm text-gray-500">
            <Link href="/about" className="hover:text-emerald-400 transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link>
            <Link href="/help" className="hover:text-emerald-400 transition-colors">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
