"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, LineChart, Sparkles } from "lucide-react";

export default function ClientBody() {
  const { data: session, status } = useSession();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Earn 4.2% APY with StableFi
          </h1>

          <p className="text-xl text-muted-foreground">
            The easiest way to earn yield on your stablecoins. Deposit USDC, earn interest, withdraw anytime.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {status === "authenticated" ? (
              <Button asChild size="lg" className="px-8">
                <Link href="/wallet">
                  {session?.user?.hasPasscode ? "Go to Dashboard" : "Set Up Wallet"}
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="px-8">
                <Link href="/auth/signin">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
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
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <LineChart className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Competitive Yield</h3>
          </div>
          <p className="text-muted-foreground">
            Earn 4.2% APY on your stablecoins, significantly higher than traditional banks with no lockup periods.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Bank-Grade Security</h3>
          </div>
          <p className="text-muted-foreground">
            Your funds are protected with state-of-the-art encryption and multi-party computation technology.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Optimized Strategies</h3>
          </div>
          <p className="text-muted-foreground">
            Our yield comes from providing liquidity, hedging strategies, and institutional partnerships on Solana.
          </p>
        </div>
      </div>
    </div>
  );
}
