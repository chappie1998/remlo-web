"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">About Solana Passcode Wallet</h1>
            <p className="text-lg text-muted-foreground">
              A demonstration project showcasing account abstraction concepts on Solana blockchain.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">What is Account Abstraction?</h2>
            <p>
              Account abstraction is a concept that simplifies blockchain interaction by abstracting away
              complex cryptographic operations from the end user. Instead of managing private keys and
              signing transactions directly, users can authenticate using more familiar methods - like
              a 6-digit passcode.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">How This Wallet Works</h2>
            <p>
              This implementation creates a deterministic keypair based on your email address. The keypair
              is then encrypted with your 6-digit passcode and stored securely. When you want to send SOL,
              you simply enter your passcode which is used to decrypt your keypair and sign the transaction.
            </p>

            <p>
              The security model works as follows:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>Your identity is established through email authentication</li>
              <li>Your keypair is encrypted with your passcode</li>
              <li>Transactions are only authorized with a valid passcode</li>
              <li>No browser extensions or complicated key management required</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Technical Implementation</h2>
            <p>
              This wallet is built using:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>Next.js for the web application framework</li>
              <li>Solana Web3.js SDK for blockchain interactions</li>
              <li>NextAuth.js for authentication</li>
              <li>Prisma for database operations</li>
              <li>TweetNaCl and BS58 for cryptographic operations</li>
            </ul>

            <p>
              For demonstration purposes, this wallet operates on Solana's devnet. In a production environment,
              additional security measures would be implemented.
            </p>
          </div>

          <div className="border-t pt-6 flex justify-center">
            <Button asChild>
              <Link href="/wallet">Try the Wallet</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
