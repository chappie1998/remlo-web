"use client";

import Header from "@/components/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  HelpCircle, 
  Shield, 
  CreditCard, 
  Users, 
  Settings, 
  Zap,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Mail,
  Book,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I create a Remlo wallet?",
    answer: "Creating a Remlo wallet is simple! Click 'Get Started' and sign up with your email address. You'll then set a 6-digit passcode to secure your wallet. That's it - no complicated seed phrases to remember!"
  },
  {
    category: "Getting Started", 
    question: "What cryptocurrencies does Remlo support?",
    answer: "Remlo currently supports USDC and USDs (Solana USD) on the Solana blockchain. We chose these stablecoins to provide a reliable store of value for everyday transactions."
  },
  {
    category: "Getting Started",
    question: "Is Remlo free to use?",
    answer: "Yes! Remlo is free to use. You only pay the minimal network fees required by the Solana blockchain for transactions, which are typically just a fraction of a penny."
  },
  {
    category: "Security",
    question: "How secure is my wallet?",
    answer: "Your wallet is secured with industry-leading technology including Multi-Party Computation (MPC) and AES-256 encryption. We use a non-custodial architecture, meaning only you have access to your funds."
  },
  {
    category: "Security",
    question: "What if I forget my passcode?",
    answer: "If you forget your passcode, you can recover your wallet using the email associated with your account. We recommend keeping your recovery information safe and up to date."
  },
  {
    category: "Security",
    question: "Can Remlo access my funds?",
    answer: "No, Remlo cannot access your funds. We use a non-custodial architecture where your private keys are secured using Multi-Party Computation. Only you have control over your cryptocurrency."
  },
  {
    category: "Sending & Receiving",
    question: "How do I send money to someone?",
    answer: "You can send money in several ways: by username (like @alice), by Solana wallet address, or by creating a payment request link. Simply enter the amount, choose the recipient method, and confirm with your passcode."
  },
  {
    category: "Sending & Receiving",
    question: "What's the difference between payment requests and payment links?",
    answer: "Payment requests are targeted to specific users - you're asking someone specific to pay you. Payment links are general links that anyone can use to pay you, useful for selling items or services."
  },
  {
    category: "Sending & Receiving",
    question: "How long do transactions take?",
    answer: "Transactions on Solana are typically confirmed within seconds. You'll see the transaction as 'pending' briefly before it's confirmed on the blockchain."
  },
  {
    category: "Payment Links",
    question: "How do payment links work?",
    answer: "Payment links allow you to pre-approve funds for someone to claim. You set aside the amount, and anyone with the link can claim it. It's perfect for gifts, refunds, or rewards."
  },
  {
    category: "Payment Links",
    question: "Can I cancel a payment link?",
    answer: "Yes, you can cancel active payment links before they're claimed. This will return the funds to your wallet immediately."
  },
  {
    category: "Payment Links",
    question: "Do payment links expire?",
    answer: "Yes, payment links have an expiration date that you set when creating them. After expiration, the funds automatically return to your wallet."
  },
  {
    category: "Troubleshooting",
    question: "Why is my transaction taking longer than usual?",
    answer: "Occasionally, the Solana network may experience congestion. If your transaction is taking longer than expected, it will usually resolve within a few minutes. Check the activity page for updates."
  },
  {
    category: "Troubleshooting",
    question: "I can't see my balance or transaction history",
    answer: "Try refreshing the page or checking your internet connection. If the problem persists, there may be a temporary network issue. Your funds are always safe on the blockchain."
  },
  {
    category: "Account Management",
    question: "How do I change my username?",
    answer: "You can update your username in the Settings page. Keep in mind that other users will need to use your new username to send you payments."
  },
  {
    category: "Account Management",
    question: "Can I use Remlo on multiple devices?",
    answer: "Yes! You can access your Remlo wallet from any device by logging in with your email and passcode. Your wallet is securely synced across all devices."
  }
];

export default function Help() {
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", ...Array.from(new Set(faqs.map(faq => faq.category)))];
  
  const filteredFAQs = selectedCategory === "All" 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  const toggleFAQ = (question: string) => {
    setOpenFAQ(openFAQ === question ? null : question);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />

      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <Link href="/about">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to About
              </Link>
            </Button>
            <h1 className="text-4xl font-bold mb-4">Help Center</h1>
            <p className="text-xl text-gray-400">Everything you need to know about using Remlo</p>
          </div>

          {/* Quick Help Cards */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Quick Help</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-emerald-800 transition-colors">
                <div className="w-12 h-12 bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
                <p className="text-gray-400 mb-4">Learn how to create your wallet and make your first transaction</p>
                <Button asChild variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
                  <Link href="#getting-started">Learn More</Link>
                </Button>
              </div>

              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-blue-800 transition-colors">
                <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Sending Money</h3>
                <p className="text-gray-400 mb-4">Send cryptocurrency using usernames or wallet addresses</p>
                <Button asChild variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                  <Link href="#sending-receiving">Learn More</Link>
                </Button>
              </div>

              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-purple-800 transition-colors">
                <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Payment Links</h3>
                <p className="text-gray-400 mb-4">Create links to receive payments from anyone</p>
                <Button asChild variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                  <Link href="#payment-links">Learn More</Link>
                </Button>
              </div>

              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-orange-800 transition-colors">
                <div className="w-12 h-12 bg-orange-900/30 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Security</h3>
                <p className="text-gray-400 mb-4">Keep your wallet and funds secure</p>
                <Button asChild variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300">
                  <Link href="#security">Learn More</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-8">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "border-zinc-700 text-gray-300 hover:bg-zinc-800"
                  }
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* FAQ Items */}
            <div className="space-y-4">
              {filteredFAQs.map((faq, index) => (
                <div key={index} className="bg-zinc-900 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => toggleFAQ(faq.question)}
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center">
                      <HelpCircle className="h-5 w-5 text-emerald-400 mr-3 flex-shrink-0" />
                      <span className="font-medium">{faq.question}</span>
                    </div>
                    {openFAQ === faq.question ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  {openFAQ === faq.question && (
                    <div className="px-6 pb-6">
                      <p className="text-gray-300 leading-relaxed ml-8">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Guides Section */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Step-by-Step Guides</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <div className="flex items-center mb-4">
                  <Book className="h-6 w-6 text-emerald-400 mr-3" />
                  <h3 className="text-xl font-semibold">Complete Beginner's Guide</h3>
                </div>
                <p className="text-gray-400 mb-6">
                  New to cryptocurrency? This comprehensive guide will walk you through everything from 
                  creating your first wallet to making your first transaction.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
                    Create your Remlo account
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
                    Set up your secure passcode
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
                    Fund your wallet
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">4</span>
                    Send your first payment
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <div className="flex items-center mb-4">
                  <Settings className="h-6 w-6 text-blue-400 mr-3" />
                  <h3 className="text-xl font-semibold">Advanced Features</h3>
                </div>
                <p className="text-gray-400 mb-6">
                  Master advanced features like payment links, bulk payments, and security settings 
                  to get the most out of your Remlo wallet.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
                    Create and manage payment links
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
                    Set up payment requests
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
                    Manage your transaction history
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">4</span>
                    Optimize security settings
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Safety Tips */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Safety & Security Tips</h2>
            <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 p-6 rounded-xl border border-orange-800/50">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-orange-400 mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-orange-400">Important Security Guidelines</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2 text-white">✅ Do:</h4>
                      <ul className="space-y-1 text-gray-300 text-sm">
                        <li>• Keep your passcode private and secure</li>
                        <li>• Use a unique passcode not used elsewhere</li>
                        <li>• Double-check recipient addresses</li>
                        <li>• Keep your recovery information safe</li>
                        <li>• Log out from shared devices</li>
                        <li>• Enable additional security features</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 text-white">❌ Don't:</h4>
                      <ul className="space-y-1 text-gray-300 text-sm">
                        <li>• Share your passcode with anyone</li>
                        <li>• Use Remlo on public computers</li>
                        <li>• Click suspicious links or emails</li>
                        <li>• Send payments to unknown addresses</li>
                        <li>• Ignore security warnings</li>
                        <li>• Use weak or common passcodes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Support */}
          <section className="text-center">
            <h2 className="text-2xl font-bold mb-4">Still Need Help?</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Our support team is here to help you with any questions or issues you might have. 
              We typically respond within 24 hours.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <Mail className="h-8 w-8 text-emerald-400 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-gray-400 text-sm mb-4">Get detailed help via email</p>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <a href="mailto:support@remlo.com">
                    Send Email
                  </a>
                </Button>
              </div>

              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <MessageCircle className="h-8 w-8 text-blue-400 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Community</h3>
                <p className="text-gray-400 text-sm mb-4">Join our community discussions</p>
                <Button asChild variant="outline" className="w-full border-zinc-700 text-gray-300 hover:bg-zinc-800">
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    Join Community
                  </a>
                </Button>
              </div>
            </div>

            <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <p className="text-sm text-gray-400">
                <strong>Emergency:</strong> If you believe your account has been compromised, 
                immediately change your passcode and contact us at{" "}
                <span className="text-emerald-400">emergency@remlo.com</span>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
} 