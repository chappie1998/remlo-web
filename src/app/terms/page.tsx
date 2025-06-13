"use client";

import Header from "@/components/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />

      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button asChild variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <Link href="/about">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to About
              </Link>
            </Button>
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">1. Acceptance of Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                Welcome to Remlo. These Terms of Service ("Terms") govern your use of the Remlo cryptocurrency wallet 
                service ("Service") operated by Remlo ("we," "us," or "our"). By accessing or using our Service, you 
                agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access 
                the Service.
              </p>
            </section>

            {/* Service Description */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">2. Description of Service</h2>
              <p className="text-gray-300 mb-4">
                Remlo provides a non-custodial cryptocurrency wallet service that allows you to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Store, send, and receive supported cryptocurrencies on the Solana blockchain</li>
                <li>Create and manage payment requests and payment links</li>
                <li>Interact with decentralized applications (dApps) and smart contracts</li>
                <li>Access wallet functionality through our web application</li>
              </ul>
              <p className="text-gray-300 mt-4">
                <strong>Important:</strong> Remlo is a non-custodial service, meaning we do not have access to or control 
                over your cryptocurrency or private keys. You are solely responsible for the security of your wallet and funds.
              </p>
            </section>

            {/* Eligibility */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">3. Eligibility</h2>
              <p className="text-gray-300 mb-4">To use our Service, you must:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Be at least 18 years old or the age of majority in your jurisdiction</li>
                <li>Have the legal capacity to enter into these Terms</li>
                <li>Not be located in a jurisdiction where cryptocurrency services are prohibited</li>
                <li>Not be subject to any sanctions or prohibited persons lists</li>
                <li>Comply with all applicable laws and regulations in your jurisdiction</li>
              </ul>
            </section>

            {/* Account Registration */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">4. Account Registration and Security</h2>
              
              <h3 className="text-xl font-medium mb-3 text-white">4.1 Account Creation</h3>
              <p className="text-gray-300 mb-4">
                To create an account, you must provide accurate and complete information. You are responsible for 
                maintaining the confidentiality of your account credentials, including your passcode and any recovery information.
              </p>

              <h3 className="text-xl font-medium mb-3 text-white">4.2 Security Responsibilities</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Keep your passcode secure and do not share it with anyone</li>
                <li>Use a strong, unique passcode that is not used elsewhere</li>
                <li>Immediately notify us of any unauthorized access to your account</li>
                <li>Regularly back up your wallet information and recovery data</li>
                <li>Use secure devices and internet connections when accessing your wallet</li>
              </ul>
            </section>

            {/* Prohibited Uses */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">5. Prohibited Uses</h2>
              <p className="text-gray-300 mb-4">You agree not to use the Service for any of the following prohibited activities:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Illegal activities, including money laundering, terrorist financing, or tax evasion</li>
                <li>Fraud, impersonation, or misrepresentation</li>
                <li>Activities that violate sanctions or embargoes</li>
                <li>Purchasing or selling illegal goods or services</li>
                <li>Gambling or activities related to gambling where prohibited</li>
                <li>Hacking, phishing, or other malicious activities</li>
                <li>Circumventing or attempting to circumvent our security measures</li>
                <li>Reverse engineering or attempting to extract source code</li>
              </ul>
            </section>

            {/* Risks and Disclaimers */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">6. Risks and Disclaimers</h2>
              
              <h3 className="text-xl font-medium mb-3 text-white">6.1 Cryptocurrency Risks</h3>
              <p className="text-gray-300 mb-4">
                Cryptocurrency transactions involve significant risks, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Price volatility and potential loss of value</li>
                <li>Irreversible transactions</li>
                <li>Network congestion and high transaction fees</li>
                <li>Regulatory changes that may affect cryptocurrency use</li>
                <li>Technical issues with blockchain networks</li>
                <li>Loss of access due to forgotten passwords or technical failures</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6 text-white">6.2 Service Availability</h3>
              <p className="text-gray-300">
                We strive to maintain high availability but cannot guarantee uninterrupted service. The Service may 
                be temporarily unavailable due to maintenance, technical issues, or circumstances beyond our control.
              </p>
            </section>

            {/* Financial Disclaimer */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">7. Financial Disclaimer</h2>
              <p className="text-gray-300 leading-relaxed">
                Remlo is not a financial institution, investment advisor, or broker-dealer. We do not provide financial, 
                investment, legal, or tax advice. Any information provided through our Service is for informational 
                purposes only and should not be considered as financial advice. You should consult with qualified 
                professionals before making financial decisions.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">8. Limitation of Liability</h2>
              <p className="text-gray-300 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, REMLO SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Loss of profits, data, or other intangible losses</li>
                <li>Damages resulting from unauthorized access to your account</li>
                <li>Losses due to price volatility of cryptocurrencies</li>
                <li>Technical failures of third-party services or blockchain networks</li>
                <li>Your failure to secure your account credentials</li>
              </ul>
              <p className="text-gray-300 mt-4">
                Our total liability shall not exceed the amount of fees you have paid to us in the 12 months preceding 
                the claim, or $100, whichever is greater.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">9. Indemnification</h2>
              <p className="text-gray-300 leading-relaxed">
                You agree to indemnify and hold harmless Remlo and its affiliates, officers, directors, employees, and 
                agents from any claims, damages, losses, costs, or expenses arising from your use of the Service, violation 
                of these Terms, or infringement of any rights of third parties.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">10. Intellectual Property</h2>
              <p className="text-gray-300 mb-4">
                The Service and its content, features, and functionality are owned by Remlo and are protected by 
                international copyright, trademark, and other intellectual property laws. You may not:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Copy, modify, or distribute our proprietary software or content</li>
                <li>Use our trademarks or logos without permission</li>
                <li>Create derivative works based on our Service</li>
                <li>Reverse engineer our software or security measures</li>
              </ul>
            </section>

            {/* Privacy */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">11. Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Your privacy is important to us. Please review our{" "}
                <Link href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</Link>{" "}
                to understand how we collect, use, and protect your information. By using our Service, you consent to 
                the collection and use of information as outlined in our Privacy Policy.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">12. Termination</h2>
              <p className="text-gray-300 mb-4">
                We may terminate or suspend your access to the Service immediately, without prior notice or liability, 
                for any reason, including if you breach these Terms. You may also terminate your account at any time.
              </p>
              <p className="text-gray-300">
                Upon termination, your right to use the Service will cease immediately. However, since we operate a 
                non-custodial service, you will retain access to your funds through your private keys.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">13. Governing Law and Dispute Resolution</h2>
              <p className="text-gray-300 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], without 
                regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the 
                Service shall be resolved through binding arbitration in accordance with the rules of [Arbitration Organization].
              </p>
              <p className="text-gray-300">
                You agree to waive your right to a jury trial and to participate in class action lawsuits.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">14. Changes to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will 
                provide at least 30 days' notice prior to any new terms taking effect. Material changes will be 
                communicated through email or prominent notice on our Service.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">15. Severability</h2>
              <p className="text-gray-300 leading-relaxed">
                If any provision of these Terms is held to be invalid or unenforceable, such provision shall be struck 
                and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">16. Contact Information</h2>
              <p className="text-gray-300 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <p className="text-gray-300">Email: <span className="text-emerald-400">legal@remlo.com</span></p>
                <p className="text-gray-300">Support: <span className="text-emerald-400">support@remlo.com</span></p>
                <p className="text-gray-300">Website: <Link href="/" className="text-emerald-400 hover:underline">https://remlo.com</Link></p>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="border-t border-zinc-800 pt-8">
              <p className="text-gray-400 text-sm leading-relaxed">
                By using Remlo, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. 
                You also acknowledge the risks associated with cryptocurrency transactions and confirm that you are using our 
                Service at your own risk.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 