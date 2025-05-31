"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Link as LinkIcon,
  Shield,
  Zap,
  CreditCard,
  RefreshCw,
  CircleDollarSign,
  User,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Dynamically import the PDF export libraries to avoid SSR issues
// const Html2Canvas = dynamic(() => import("html2canvas"), { ssr: false });
// const Html2Pdf = dynamic(() => import("html2pdf.js"), { ssr: false });

// Define the sections of our pitch deck
const sections = [
  {
    id: "title",
    title: "Remlo",
    subtitle: "Your On-Chain Bank That Earns While You Spend",
    description: "Built by: Ankit Kumar Saini",
    memeUrl:
      "https://media.tenor.com/wMKC6ItYfhAAAAAi/money-with-wings-joypixels.gif",
  },
  {
    id: "vision",
    title: "A Bank for Everyone, Powered by Blockchain",
    subtitle: "Banking reimagined with blockchain simplicity",
    points: [
      "Your dollars live, move, and grow—all in one place",
      "Earn 4.2% APY on idle balances from day one",
      "Seamless spending and transfers, no crypto expertise needed",
      "Bridge the gap between crypto and real-world users",
      "Built on Solana for fast, low-cost transactions",
    ],
    memeUrl:
      "/seed.webp",
    memeCaption: "No more seed phrases or technical hurdles for family & friends",
  },
  {
    id: "problem",
    title: "Modern Finance Is Broken",
    subtitle: "Banking and crypto both fail today's consumers",
    points: [
      "Traditional banks offer almost zero interest on deposits (average savings yield ~0.41% APY)",
      "Even top high‑yield savings accounts cap at ~5.00% APY",
      "Crypto bridges yield returns but demand complex wallets, seed phrases, and high fees",
      "Consumers crave both simple banking and meaningful returns—today they get neither",
      "Wallets, seed phrases, and gas fees confuse mainstream users",
    ],
    memeUrl: "/problem.png",
    memeCaption: "The reality of blockchain projects today... but we're changing that",
  },
  {
    id: "solution",
    title: "Remlo: Digital Bank + Yield Engine",
    subtitle: "Banking & yield, simplified for everyone",
    points: [
      "Deposit & Earn: Swap USDC → USDs and earn 4.2% via trusted vaults (Ethena, Peddle)",
      "Spend & Send: On-chain fast payments; send via link or to any address",
      "Receive Everywhere: Payouts to bank, PayPal, or custodial wallet—no account needed",
      "No staking, no locking, no complex DeFi strategies",
      "Earn while you spend, send, or hold",
    ],
    memeUrl: "/solution.png",
    memeCaption: "Current wallet UX vs Remlo SafeLink",
  },
  {
    id: "core-product",
    title: "Core Product Experience",
    subtitle: "Banking that works for everyone",
    tableData: {
      headers: ["Banking Feature", "Description"],
      rows: [
        ["Dashboard", "One view: total balance + APY + recent activity"],
        ["Account Tabs", "Spend (USDC), Earn (USDs), Vault (compounding)"],
        ["On/Off-Ramp", "Card (MoonPay) or Bank Transfer (zk-KYC)"],
        ["Send & Pay", "Classic send + \"Send via Link\" as fun feature"],
        ["Savings Vault", "Long-term yield with auto-compounding"],
      ]
    },
    featureSpotlight: {
      title: "Send via Link: Viral Adoption Hook",
      points: [
        "Generate shareable link + 6-digit code in one click",
        "Recipients claim funds without installing apps or wallets",
        "Surprise users with banking via link—viral consumer hook",
        "No seed phrases, no wallets, no complexity",
      ]
    },
  },
  {
    id: "yield-strategy",
    title: "Yield Strategy: Delivering 4.2% APY",
    subtitle: "Sustainable, reliable yield generation",
    points: [
      "Phase 1: Integrate Ethena.fi & Peddle Finance vaults",
      "Phase 2: Build proprietary yield-optimizer contract",
      "Phase 3: Introduce dynamic APY tiers & premium vaults",
      "Ethena.fi Integration: Leverage sETH derivatives and lending markets",
      "Peddle Finance Vaults: Auto-compound yield across lending protocols",
      "Continuous Optimization: Monitor on-chain yields and rebalance monthly",
    ],
    memeCaption: "Flow diagram showing USDC → Ethena sToken → Pendle fYT → APY distribution",
  },
  {
    id: "ramp-compliance",
    title: "On/Off-Ramp & Compliance",
    subtitle: "Banking-grade security with web3 freedom",
    points: [
      "Third-party Rails: MoonPay for instant card top-ups and withdrawals",
      "Bank Transfers: Optional zk-KYC for full rail access (no PII stored)",
      "Future Goal: Acquire payment license to internalize all rails",
      "Focus on compliance & regulation from day 1",
      "Security without compromising privacy",
    ],
  },
  {
    id: "growth-strategy",
    title: "Growth & Go-to-Market Strategy",
    subtitle: "Built-in virality with strategic partnerships",
    points: [
      "Built-in referral program: share Remlo, earn USDC bonuses",
      "Dashboard tile shows referrals sent and rewards earned",
      "Phase 1 (B2C Focus): Launch in US & APAC with referral virality",
      "Enterprise Partnerships: Parallel pilots with gig platforms & payroll providers",
      "Leverage B2C traction to land B2B engagements",
    ],
    strategy: {
      phases: [
        {
          name: "Phase 1",
          target: "Consumer Adoption",
          tactic: "Referral programs + Send via Link virality",
        },
        {
          name: "Phase 2",
          target: "B2B Integration",
          tactic: "Enterprise partnerships with gig/payroll platforms",
        },
      ]
    }
  },
  {
    id: "market-opportunity",
    title: "Market Opportunity & Timing",
    subtitle: "The perfect time for a crypto-powered bank",
    points: [
      "Stablecoins: USD‑pegged stablecoins hold over $220 billion in market cap (1% of U.S. M2) and grew 59.7% YTD as of Q1 2025",
      "Transaction Volume: Stablecoins facilitated $28 trillion in payments last year—surpassing Visa and Mastercard",
      "Digital Banking: Valued at $20.8 billion in 2021 and projected to grow at a 20.5% CAGR through 2030",
      "Solana's high throughput and low fees make it perfect for payments",
      "Stripe's stablecoin pilot (March 2025), PayPal's stablecoin integration",
      "EU MiCA framework creating regulatory clarity for stablecoin payments",
    ],
    marketSize: {
      total: "$220+ Billion",
      label: "Stablecoin Market Cap",
      breakdown: "Growing 59.7% YTD | Surpassing traditional payment networks"
    }
  },
  {
    id: "founder",
    title: "Meet the Founder",
    subtitle: "Ankit Kumar Saini",
    points: [
      "🧠 Technical Researcher at QuickNode | Specializing in Modular Rollups & Decentralized Systems",
      "Founder @ FuelArt — Building tools at the intersection of creativity, ownership, and open infrastructure",
      "Core contributor @ Orbitron — Scalable rollup infrastructure for high-throughput dApps",
      "Expertise in L2 design, smart contract predicates, and seamless wallet UX",
      "🎓 Lifelong Learner with a deep belief in user-first decentralization",
    ],
    founderImageUrl: "/founder2.png",
  },
  {
    id: "ask",
    title: "The Ask",
    subtitle: "Looking to raise: $1.8M Pre-Seed",
    points: [
      "40% Engineering: Complete product development & scalability",
      "30% Compliance & Legal: Regulatory framework in key markets",
      "20% Go-to-Market: Early partnerships and pilot program",
      "10% Operations: Team expansion and infrastructure",
    ],
    closingMessage: "Remlo is how the next billion receive money on-chain. Let's build the bridge between crypto and real people.",
    contact: (
      <div className="space-y-2">
        <p>Connect with us:</p>
        <div className="flex gap-4">
          <a 
            href="mailto:ankitgci12@gmail.com" 
            className="text-primary hover:underline"
          >
            ankitgci12@gmail.com
          </a>
          <a 
            href="https://twitter.com/chappie1998" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Twitter
          </a>
          <a 
            href="https://t.me/chappie1998" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Telegram
          </a>
        </div>
      </div>
    ),
  },
];

export default function PitchDeck() {
  const [activeSection, setActiveSection] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);

  // Export as PDF function
  const exportAsPdf = async () => {
    if (!deckRef.current || typeof window === "undefined") return;

    try {
      setExportingPdf(true);

      // Clone the current element to modify it for PDF export
      const element = deckRef.current.cloneNode(true) as HTMLElement;

      // Remove navigation elements for cleaner PDF
      const navElements = element.querySelectorAll(".fixed");
      navElements.forEach((el) => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });

      // Set options for PDF generation
      const options = {
        filename: "StableFi-Pitch-Deck.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      };

      // Generate PDF
      // const html2pdf = Html2Pdf();
      // await html2pdf.set(options).from(element).save();
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setExportingPdf(false);
    }
  };

  const nextSection = () => {
    if (activeSection < sections.length - 1) {
      setActiveSection(activeSection + 1);
    }
  };

  const prevSection = () => {
    if (activeSection > 0) {
      setActiveSection(activeSection - 1);
    }
  };

  const goToSection = (index: number) => {
    setActiveSection(index);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const docEl = document.documentElement;
      const requestFullScreen =
        docEl.requestFullscreen ||
        (docEl as any).mozRequestFullScreen ||
        (docEl as any).webkitRequestFullScreen ||
        (docEl as any).msRequestFullscreen;

      if (requestFullScreen) {
        requestFullScreen.call(docEl);
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        nextSection();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        prevSection();
      } else if (e.key === "f") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSection]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div className="relative bg-background min-h-screen" ref={deckRef}>
      {/* Navigation sidebar */}
      <div className="fixed left-0 top-0 z-10 h-full w-16 bg-muted/50 flex flex-col items-center justify-center md:w-24">
        {/* Slide number centered vertically and horizontally */}
        <div className="flex flex-col justify-center items-center h-full w-full">
          <div className="mb-6 rounded-full border px-3 py-1 bg-background/80 backdrop-blur-sm">
            <span className="text-base font-medium">
              {activeSection + 1} / {sections.length}
            </span>
          </div>
          {/* Navigation sidebar buttons */}
          <div className="flex flex-col items-center">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => goToSection(index)}
                className={`w-8 h-8 rounded-full mb-1 flex items-center justify-center ${
                  activeSection === index
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 z-50">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((activeSection + 1) / sections.length) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="ml-16 md:ml-24 relative w-[calc(100%-4rem)] md:w-[calc(100%-6rem)] min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
            className="h-screen flex items-center justify-center p-8"
          >
            <div className="max-w-4xl w-full">
              {renderSection(sections[activeSection])}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="fixed bottom-6 right-6 flex gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={prevSection}
            disabled={activeSection === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextSection}
            disabled={activeSection === sections.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
                <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
                <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </svg>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function renderSection(section: any) {
  switch (section.id) {
    case "title":
      return (
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-4 rounded-full">
              <CircleDollarSign className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-4">
            {section.title}
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground mb-8">
            {section.subtitle}
          </p>
          <p className="text-md text-muted-foreground">{section.description}</p>
          {section.memeUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex justify-center"
            >
              <div className="max-w-[250px]">
                <img
                  src={section.memeUrl}
                  alt="Money flying"
                  className="mx-auto h-auto rounded-lg"
                />
              </div>
            </motion.div>
          )}
        </div>
      );
      
    case "vision":
    case "problem":
    case "solution":
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            {section.title}
          </h2>
          <p className="text-xl mb-8 text-muted-foreground">
            {section.subtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <ul className="space-y-4">
                {section.points.map((point: string, i: number) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-start gap-3"
                  >
                    <div className="bg-primary/10 p-1 rounded-full mt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-lg">{point}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div>
              {section.memeUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg overflow-hidden border p-2 shadow-sm"
                >
                  <img
                    src={section.memeUrl}
                    alt={section.memeCaption || section.title}
                    className="w-full h-auto rounded"
                  />
                  {section.memeCaption && (
                    <p className="text-sm text-muted-foreground mt-2 text-center italic">
                      "{section.memeCaption}"
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      );

    case "core-product":
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            {section.title}
          </h2>
          <p className="text-xl mb-8 text-muted-foreground">
            {section.subtitle}
          </p>

          {section.tableData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="overflow-x-auto rounded-lg border mb-6"
            >
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {section.tableData.headers.map((header: string, i: number) => (
                      <th key={i} className="px-4 py-3 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.tableData.rows.map((row: string[], i: number) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="border-t"
                    >
                      {row.map((cell: string, j: number) => (
                        <td key={j} className="px-4 py-3">
                          {cell}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {section.featureSpotlight && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-6 bg-gradient-to-r from-primary/10 to-primary/20 border border-primary/30 rounded-lg p-6"
            >
              <h3 className="text-xl font-semibold text-primary mb-3">
                {section.featureSpotlight.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ul className="space-y-2">
                  {section.featureSpotlight.points.map((point: string, i: number) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                      className="flex items-start gap-2"
                    >
                      <div className="bg-primary/10 p-1 rounded-full mt-1">
                        <LinkIcon size={12} className="text-primary" />
                      </div>
                      <span className="text-foreground">{point}</span>
                    </motion.li>
                  ))}
                </ul>
                <div className="flex items-center justify-center">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                    <LinkIcon size={40} className="text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      The easiest way to onboard non-crypto users to your platform
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {section.memeUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-lg overflow-hidden border p-2 shadow-sm"
            >
              <img
                src={section.memeUrl}
                alt={section.memeCaption || section.title}
                className="w-full h-auto rounded"
              />
              {section.memeCaption && (
                <p className="text-sm text-muted-foreground mt-2 text-center italic">
                  "{section.memeCaption}"
                </p>
              )}
            </motion.div>
          )}
        </div>
      );

    case "yield-strategy":
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-xl mb-8 text-muted-foreground">
              {section.subtitle}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <ul className="space-y-4">
                {section.points.map((point: string, i: number) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-start gap-3"
                  >
                    <div className="bg-primary/10 p-1 rounded-full mt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-lg">{point}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div>
              {section.memeUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg overflow-hidden border p-2 shadow-sm"
                >
                  <img
                    src={section.memeUrl}
                    alt={section.memeCaption || section.title}
                    className="w-full h-auto rounded"
                  />
                  {section.memeCaption && (
                    <p className="text-sm text-muted-foreground mt-2 text-center italic">
                      "{section.memeCaption}"
                    </p>
                  )}
                </motion.div>
              )}

              {section.chartUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg overflow-hidden border p-2 shadow-sm"
                >
                  <img
                    src={section.chartUrl}
                    alt="Chart"
                    className="w-full h-auto rounded"
                  />
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Stablecoin Growth Projections
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      );

    case "ramp-compliance":
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            {section.title}
          </h2>
          <p className="text-xl mb-8 text-muted-foreground">
            {section.subtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <ul className="space-y-4">
                {section.points.map((point: string, i: number) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-start gap-3"
                  >
                    <div className="bg-primary/10 p-1 rounded-full mt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-lg">{point}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div>
              {section.memeUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg overflow-hidden border p-2 shadow-sm"
                >
                  <img
                    src={section.memeUrl}
                    alt={section.memeCaption || section.title}
                    className="w-full h-auto rounded"
                  />
                  {section.memeCaption && (
                    <p className="text-sm text-muted-foreground mt-2 text-center italic">
                      "{section.memeCaption}"
                    </p>
                  )}
                </motion.div>
              )}

              {section.chartUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg overflow-hidden border p-2 shadow-sm"
                >
                  <img
                    src={section.chartUrl}
                    alt="Chart"
                    className="w-full h-auto rounded"
                  />
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Stablecoin Growth Projections
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      );

    case "growth-strategy":
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-xl mb-8 text-muted-foreground">
              {section.subtitle}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <ul className="space-y-4">
                {section.points.map((point: string, i: number) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-start gap-3"
                  >
                    <div className="bg-primary/10 p-1 rounded-full mt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-lg">{point}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div>
              {section.strategy && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-6"
                >
                  <h3 className="text-xl font-semibold mb-4">Go-To-Market Strategy</h3>
                  <div className="space-y-4">
                    {section.strategy.phases.map((phase: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + i * 0.15 }}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div className="bg-primary/10 px-4 py-2 border-b">
                          <span className="font-medium">
                            {phase.name}: {phase.target}
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <p>{phase.tactic}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            
              {section.memeUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg overflow-hidden border p-2 shadow-sm"
                >
                  <img
                    src={section.memeUrl}
                    alt={section.memeCaption || section.title}
                    className="w-full h-auto rounded"
                  />
                  {section.memeCaption && (
                    <p className="text-sm text-muted-foreground mt-2 text-center italic">
                      "{section.memeCaption}"
                    </p>
                  )}
                </motion.div>
              )}

              {section.chartUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg overflow-hidden border p-2 shadow-sm"
                >
                  <img
                    src={section.chartUrl}
                    alt="Chart"
                    className="w-full h-auto rounded"
                  />
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Stablecoin Growth Projections
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      );

    case "market-opportunity":
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-xl mb-8 text-muted-foreground">
              {section.subtitle}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <ul className="space-y-4">
                {section.points.map((point: string, i: number) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-start gap-3"
                  >
                    <div className="bg-primary/10 p-1 rounded-full mt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-lg">{point}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div>
              {section.marketSize && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mb-8 flex flex-col items-center"
                >
                  <div className="bg-primary/10 border border-primary/20 rounded-lg px-6 py-4 text-center max-w-md w-full">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {section.marketSize.total}
                    </div>
                    <div className="text-base font-medium mb-1">
                      {section.marketSize.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {section.marketSize.breakdown}
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* X reference (formerly Twitter) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mb-6 border rounded-lg p-4 bg-primary/5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-semibold mr-2">Robert Hackett</span>
                      <span className="text-muted-foreground text-sm">@rhhackett · April 2025</span>
                    </div>
                    <p className="text-sm mb-2 font-medium">
                      Stablecoins are a payments inflection point:
                    </p>
                    <div className="border rounded-md p-3 mb-2 bg-background/50">
                      <p className="text-sm font-semibold mb-1">Stablecoins: A Payments Inflection Point</p>
                      <p className="text-sm font-semibold mt-2">Stats</p>
                      <ul className="text-xs list-disc pl-5 space-y-1 mt-1">
                        <li>$33 trillion in transaction volume over the past year — surpassing Visa, PayPal, and nearing ACH</li>
                        <li>$224 billion in circulating supply backed largely by U.S. Treasuries</li>
                        <li>Near-instant, near-free transfers (&lt;1 sec, &lt;1 cent) are now reality</li>
                      </ul>
                      <p className="text-sm font-semibold mt-2">Trends</p>
                      <ul className="text-xs list-disc pl-5 space-y-1 mt-1">
                        <li>Activity decoupled from crypto speculation — showing consistent growth</li>
                        <li>Usage rising in global remittances, commerce, and fintech infrastructure</li>
                      </ul>
                    </div>
                    <div className="text-sm text-primary">
                      <span>💬 2.1K</span>
                      <span className="mx-2">🔄 5.7K</span>
                      <span>❤️ 18.3K</span>
                    </div>
                    <div className="mt-2 text-xs">
                      <a 
                        href="https://x.com/rhhackett/status/1923387552817435064" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary flex items-center hover:underline"
                      >
                        <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        View on X
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {section.memeUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg overflow-hidden border p-2 shadow-sm"
                >
                  <img
                    src={section.memeUrl}
                    alt={section.memeCaption || section.title}
                    className="w-full h-auto rounded"
                  />
                  {section.memeCaption && (
                    <p className="text-sm text-muted-foreground mt-2 text-center italic">
                      "{section.memeCaption}"
                    </p>
                  )}
                </motion.div>
              )}

              {section.chartUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-lg overflow-hidden border p-2 shadow-sm"
                >
                  <img
                    src={section.chartUrl}
                    alt="Chart"
                    className="w-full h-auto rounded"
                  />
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Stablecoin Growth Projections
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      );

    case "founder":
      return (
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {section.founderImageUrl ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-muted/30 rounded-full w-48 h-48 overflow-hidden"
            >
              <img
                src={section.founderImageUrl}
                alt="Founder"
                className="w-full h-full object-cover"
              />
            </motion.div>
          ) : (
            <div className="bg-muted/30 rounded-full w-48 h-48 flex items-center justify-center">
              <User className="h-24 w-24 text-muted-foreground" />
            </div>
          )}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">
              {section.title}
            </h2>
            <p className="text-xl mb-6 text-primary">{section.subtitle}</p>
            <ul className="space-y-2">
              {section.points.map((point: string, i: number) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>{point}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      );
    case "ask":
      return (
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            {section.title}
          </h2>
          <p className="text-2xl mb-6 text-primary font-semibold">
            {section.subtitle}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Use of Funds</h3>
              <div className="space-y-4">
                {section.points.map((point: string, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <div className="bg-primary/10 p-1 rounded-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-lg">{point}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {section.unitEconomics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-xl font-semibold mb-4">Unit Economics</h3>
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Transaction Fee
                      </div>
                      <div className="font-medium">
                        {section.unitEconomics.fee}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Acquisition Cost
                      </div>
                      <div className="font-medium">
                        {section.unitEconomics.cac}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Lifetime Value
                      </div>
                      <div className="font-medium text-primary">
                        {section.unitEconomics.ltv}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Runway Goal
                      </div>
                      <div className="font-medium">
                        {section.unitEconomics.timeline}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {section.closingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-6 bg-primary/10 border border-primary/20 rounded-lg p-4 text-center"
            >
              <p className="text-lg font-medium">{section.closingMessage}</p>
            </motion.div>
          )}

          <div className="border-t pt-4">
            <p className="text-muted-foreground">{section.contact}</p>
          </div>

          {section.memeUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 rounded-lg overflow-hidden border p-2 shadow-sm max-w-xl mx-auto"
            >
              <img
                src={section.memeUrl}
                alt={section.memeCaption || section.title}
                className="w-full h-auto rounded"
              />
              {section.memeCaption && (
                <p className="text-sm text-muted-foreground mt-2 text-center italic">
                  "{section.memeCaption}"
                </p>
              )}
            </motion.div>
          )}
        </div>
      );

    case "closing":
      return (
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {section.title}
          </h2>
          <p className="text-xl sm:text-2xl mb-8">{section.subtitle}</p>
          <p className="text-muted-foreground">{section.description}</p>

          {section.memeUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 mb-6 max-w-md mx-auto"
            >
              <img
                src={section.memeUrl}
                alt={section.memeCaption || "Closing meme"}
                className="w-full h-auto rounded-lg shadow-md"
              />
              {section.memeCaption && (
                <p className="text-sm text-muted-foreground mt-2 text-center italic">
                  "{section.memeCaption}"
                </p>
              )}
            </motion.div>
          )}

          <div className="mt-10">
            <Button size="lg" asChild>
              <a href="/">Join the Revolution</a>
            </Button>
          </div>
        </div>
      );

    default:
      return (
        <div>
          <h2 className="text-3xl font-bold mb-4">{section.title}</h2>
          {section.subtitle && (
            <p className="text-xl mb-4">{section.subtitle}</p>
          )}
        </div>
      );
  }
}
