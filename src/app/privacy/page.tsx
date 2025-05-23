"use client";

import Header from "@/components/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">1. Introduction</h2>
              <p className="text-gray-300 leading-relaxed">
                Remlo ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our cryptocurrency wallet service. By using Remlo, 
                you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium mb-3 text-white">2.1 Personal Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Email address (required for account creation and authentication)</li>
                <li>Username (for social payment features)</li>
                <li>Phone number (optional, for additional security)</li>
                <li>Profile information you choose to provide</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6 text-white">2.2 Wallet and Transaction Data</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Encrypted wallet data and cryptographic keys</li>
                <li>Transaction history and metadata</li>
                <li>Payment requests and payment links you create</li>
                <li>Blockchain addresses associated with your account</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6 text-white">2.3 Technical Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data and analytics</li>
                <li>Log files and error reports</li>
                <li>Authentication tokens and session data</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">3. How We Use Your Information</h2>
              <p className="text-gray-300 mb-4">We use the collected information for:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Providing and maintaining our wallet services</li>
                <li>Processing cryptocurrency transactions securely</li>
                <li>Authenticating your identity and preventing fraud</li>
                <li>Communicating with you about your account and transactions</li>
                <li>Improving our services and user experience</li>
                <li>Complying with legal obligations and regulatory requirements</li>
                <li>Providing customer support and technical assistance</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">4. Data Security</h2>
              <p className="text-gray-300 mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li><strong>Encryption:</strong> All sensitive data is encrypted at rest and in transit using AES-256 encryption</li>
                <li><strong>Multi-Party Computation (MPC):</strong> Private keys are secured using advanced MPC technology</li>
                <li><strong>Zero-Knowledge Architecture:</strong> We cannot access your private keys or funds</li>
                <li><strong>Secure Infrastructure:</strong> Our systems are hosted on secure, compliant cloud infrastructure</li>
                <li><strong>Regular Audits:</strong> We conduct regular security audits and penetration testing</li>
                <li><strong>Access Controls:</strong> Strict access controls and authentication for all team members</li>
              </ul>
            </section>

            {/* Blockchain Transparency */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">5. Blockchain Transparency</h2>
              <p className="text-gray-300 leading-relaxed">
                Please note that blockchain transactions are publicly visible on the Solana network. While your personal 
                information is not directly linked to your blockchain address, transaction amounts, timestamps, and addresses 
                are permanently recorded on the public ledger. We recommend being mindful of your privacy when sharing 
                your wallet address publicly.
              </p>
            </section>

            {/* Information Sharing */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">6. Information Sharing and Disclosure</h2>
              <p className="text-gray-300 mb-4">We do not sell, trade, or otherwise transfer your personal information to third parties, except:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To prevent fraud or protect the security of our service</li>
                <li>With trusted service providers who assist in operating our service (under strict confidentiality agreements)</li>
                <li>In connection with a merger, acquisition, or sale of business assets</li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">7. Data Retention</h2>
              <p className="text-gray-300 leading-relaxed">
                We retain your information for as long as necessary to provide our services and comply with legal obligations. 
                Transaction data may be retained longer due to regulatory requirements. You can request deletion of your 
                account data, but note that some information may need to be retained for legal or security purposes.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">8. Your Privacy Rights</h2>
              <p className="text-gray-300 mb-4">Depending on your jurisdiction, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Access and receive a copy of your personal data</li>
                <li>Rectify inaccurate or incomplete information</li>
                <li>Request deletion of your personal data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Data portability (receive your data in a structured format)</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-gray-300 mt-4">
                To exercise these rights, please contact us at <span className="text-emerald-400">privacy@remlo.com</span>
              </p>
            </section>

            {/* Cookies and Tracking */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">9. Cookies and Tracking</h2>
              <p className="text-gray-300 leading-relaxed">
                We use essential cookies and similar technologies to provide our services, authenticate users, and prevent fraud. 
                We do not use advertising cookies or track you across other websites. You can control cookie preferences through 
                your browser settings, but disabling essential cookies may affect the functionality of our service.
              </p>
            </section>

            {/* International Transfers */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">10. International Data Transfers</h2>
              <p className="text-gray-300 leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. 
                We ensure appropriate safeguards are in place to protect your data in accordance with applicable data 
                protection laws, including the use of Standard Contractual Clauses where required.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">11. Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Our service is not intended for individuals under the age of 18. We do not knowingly collect personal 
                information from children under 18. If we become aware that we have collected personal information from 
                a child under 18, we will take steps to delete such information.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">12. Changes to This Privacy Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
                new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this 
                Privacy Policy periodically for any changes.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-emerald-400">13. Contact Us</h2>
              <p className="text-gray-300 mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <p className="text-gray-300">Email: <span className="text-emerald-400">privacy@remlo.com</span></p>
                <p className="text-gray-300">Support: <span className="text-emerald-400">support@remlo.com</span></p>
                <p className="text-gray-300">Website: <Link href="/" className="text-emerald-400 hover:underline">https://remlo.com</Link></p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 