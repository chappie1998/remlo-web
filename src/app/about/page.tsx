"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { Shield, Zap, Users, Globe, ArrowRight, CheckCircle2 } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto py-16 px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              Remlo
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              The simplest way to send, receive, and manage cryptocurrency. 
              No complex keys, no confusing interfaces — just simple, secure payments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/wallet">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-zinc-700 text-gray-300 hover:bg-zinc-800">
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-zinc-900/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Remlo?</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                We're building the future of digital payments with simplicity and security at the core.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-emerald-900/30 rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold">Lightning Fast</h3>
                <p className="text-gray-400">
                  Send money in seconds, not minutes. Built on Solana for instant transactions.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold">Bank-Level Security</h3>
                <p className="text-gray-400">
                  Your funds are protected with advanced encryption and secure MPC technology.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold">Social Payments</h3>
                <p className="text-gray-400">
                  Send money to friends using just their username. No complicated addresses.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-orange-900/30 rounded-xl flex items-center justify-center">
                  <Globe className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold">Global Access</h3>
                <p className="text-gray-400">
                  Send money anywhere in the world without borders or banking restrictions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">How Remlo Works</h2>
                <p className="text-xl text-gray-400">
                  Getting started is as easy as 1-2-3
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-semibold">Sign Up</h3>
                  <p className="text-gray-400">
                    Create your account with just your email. No complicated seed phrases to remember.
                  </p>
                </div>

                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-semibold">Set Your Passcode</h3>
                  <p className="text-gray-400">
                    Choose a 6-digit passcode to secure your wallet. That's all the setup you need.
                  </p>
                </div>

                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-semibold">Start Sending</h3>
                  <p className="text-gray-400">
                    Send money to anyone instantly using their username or wallet address.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="py-20 bg-zinc-900/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Built on Cutting-Edge Technology</h2>
                <p className="text-xl text-gray-400">
                  Powered by Solana blockchain and advanced cryptographic security
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Solana Blockchain</h3>
                      <p className="text-gray-400">Lightning-fast transactions with minimal fees, processing thousands of transactions per second.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Multi-Party Computation (MPC)</h3>
                      <p className="text-gray-400">Advanced cryptographic security that eliminates single points of failure in key management.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Account Abstraction</h3>
                      <p className="text-gray-400">Simplified user experience without compromising on security or decentralization.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Open Source</h3>
                      <p className="text-gray-400">Transparent, auditable code that puts security and trust first.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 p-8 rounded-2xl border border-zinc-800">
                  <h3 className="text-xl font-semibold mb-4">Security First</h3>
                  <p className="text-gray-400 mb-6">
                    Your private keys are protected using industry-leading encryption. We use multi-party computation 
                    to ensure that no single entity ever has complete access to your funds.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• End-to-end encryption</li>
                    <li>• Hardware-level security</li>
                    <li>• Regular security audits</li>
                    <li>• Non-custodial architecture</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
              <p className="text-xl text-gray-400">
                Join thousands of users who are already sending money the simple way with Remlo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/wallet">
                    Create Wallet <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-zinc-700 text-gray-300 hover:bg-zinc-800">
                  <Link href="/help">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
