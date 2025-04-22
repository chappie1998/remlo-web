import Header from "@/components/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Shield,
  LineChart,
  ArrowDownUp,
  CheckCircle2,
  BarChart4,
  LockKeyhole
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto p-4 md:p-6">
        <section className="py-12 max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6">Welcome to StableFi</h1>
          <p className="text-xl text-muted-foreground mb-6">
            The easiest way to earn 4.2% APY with your stablecoins on Solana.
          </p>
          <div className="flex justify-center">
            <Link href="/wallet">
              <Button size="lg" className="gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-12 border-t">
          <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border rounded-lg p-6 text-center">
              <div className="bg-primary/10 rounded-full p-3 inline-block mb-4">
                <ArrowDownUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">1. Swap USDC</h3>
              <p className="text-muted-foreground">
                Deposit your USDC and swap it for StableFi tokens. Each token is backed 1:1 with USDC.
              </p>
            </div>
            <div className="border rounded-lg p-6 text-center">
              <div className="bg-primary/10 rounded-full p-3 inline-block mb-4">
                <LineChart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">2. Earn Yield</h3>
              <p className="text-muted-foreground">
                Your StableFi tokens automatically earn 4.2% APY, with interest accruing daily.
              </p>
            </div>
            <div className="border rounded-lg p-6 text-center">
              <div className="bg-primary/10 rounded-full p-3 inline-block mb-4">
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">3. Withdraw Anytime</h3>
              <p className="text-muted-foreground">
                Swap back to USDC whenever you want with no lockup periods or withdrawal fees.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 border-t">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">Where Does the Yield Come From?</h2>
            <p className="text-lg mb-6">
              StableFi generates sustainable yield through a diversified strategy:
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold">DeFi Lending:</span> We allocate funds to the most secure lending platforms on Solana.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Liquidity Provision:</span> We earn fees by providing liquidity to AMMs like Kamino Finance, which currently offers up to 5.8% returns.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Risk Hedging:</span> We implement sophisticated risk management strategies to protect against market volatility.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Institutional Partnerships:</span> We work with market makers to generate additional yield through vetted counterparties.
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="py-12 border-t">
          <h2 className="text-2xl font-bold mb-8 text-center">Why Choose StableFi?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border rounded-lg p-6">
              <Shield className="w-6 h-6 mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2">Secure</h3>
              <p className="text-muted-foreground">
                Bank-grade security with multi-party computation and audited smart contracts. Your funds are always protected.
              </p>
            </div>
            <div className="border rounded-lg p-6">
              <BarChart4 className="w-6 h-6 mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2">Competitive</h3>
              <p className="text-muted-foreground">
                4.2% APY is significantly higher than traditional banks and competitive with other DeFi protocols, but with much lower risk.
              </p>
            </div>
            <div className="border rounded-lg p-6">
              <LockKeyhole className="w-6 h-6 mb-4 text-primary" />
              <h3 className="text-xl font-bold mb-2">Non-Custodial</h3>
              <p className="text-muted-foreground">
                You maintain control of your funds at all times. We never take custody of your assets, unlike centralized platforms.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 border-t text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to start earning?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Join thousands of users who are already earning passive income with StableFi.
          </p>
          <Link href="/wallet">
            <Button size="lg" className="gap-2">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} StableFi. All rights reserved.</p>
          <p className="mt-1">
            StableFi is currently running on Solana {process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}.
          </p>
        </div>
      </footer>
    </div>
  );
}
