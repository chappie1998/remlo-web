"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/components/header";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Solana Wallet with 6-Digit Passcode
            </h1>

            <p className="text-xl text-muted-foreground">
              Secure your Solana assets with a simple 6-digit passcode instead of managing complex keys.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {status === "authenticated" ? (
                <Button asChild size="lg" className="px-8">
                  <Link href="/wallet">
                    {session?.user?.hasPasscode ? "Go to My Wallet" : "Set Up Wallet"}
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="px-8">
                  <Link href="/auth/signin">Get Started</Link>
                </Button>
              )}

              <Button asChild variant="outline" size="lg">
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 px-6 bg-muted/50">
          <div className="space-y-3">
            <h3 className="text-xl font-bold">Simplified Security</h3>
            <p className="text-muted-foreground">
              Replace complex seed phrases with a memorizable 6-digit passcode to authorize transactions.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-bold">Solana Blockchain</h3>
            <p className="text-muted-foreground">
              Interact with the Solana blockchain's speed and low transaction costs through a simple interface.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-bold">Account Abstraction</h3>
            <p className="text-muted-foreground">
              Built with next-generation account abstraction principles for improved user experience.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>
          Solana Passcode Wallet - A demonstration project for account abstraction
        </p>
      </footer>
    </div>
  );
}
