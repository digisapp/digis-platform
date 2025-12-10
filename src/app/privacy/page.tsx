'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/10">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis"
            width={100}
            height={33}
            className="h-8 w-auto"
          />
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-10">
        <div className="prose prose-invert prose-cyan max-w-none">
          <h1 className="text-4xl font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-2">
            Privacy Policy
          </h1>
          <p className="text-gray-400 mb-8">Last Modified: December 10, 2024</p>

          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
              <p>
                At Digis ("Company," "we," "us," or "our"), we respect your privacy and are committed to protecting
                your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard
                your information when you use our streaming platform and services (the "Service").
              </p>
              <p className="mt-4">
                Please read this Privacy Policy carefully. By using the Service, you consent to the collection and
                use of your information as described in this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.1 Information You Provide</h3>
              <p>We collect information you provide directly to us, including:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Account Information:</strong> Email address, username, display name, password, and profile picture</li>
                <li><strong>Creator Application:</strong> Social media handles and other information submitted when applying to become a creator</li>
                <li><strong>Payment Information:</strong> Payment method details processed through our payment providers</li>
                <li><strong>Communications:</strong> Messages, comments, and other content you share on the platform</li>
                <li><strong>Support Requests:</strong> Information you provide when contacting customer support</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.2 Information Collected Automatically</h3>
              <p>When you use the Service, we automatically collect:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Device Information:</strong> Device type, operating system, browser type, and unique device identifiers</li>
                <li><strong>Usage Information:</strong> Pages viewed, features used, streams watched, and interactions with content</li>
                <li><strong>Log Information:</strong> IP address, access times, and referring URLs</li>
                <li><strong>Location Information:</strong> General location based on IP address</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.3 Information from Third Parties</h3>
              <p>We may receive information from third parties, including:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Social media platforms if you choose to link your accounts</li>
                <li>Payment processors for transaction verification</li>
                <li>Analytics providers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process transactions and send related information</li>
                <li>Create and manage your account</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze usage trends and preferences</li>
                <li>Detect, prevent, and address fraud and security issues</li>
                <li>Personalize and improve your experience</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. How We Share Your Information</h2>
              <p>We may share your information in the following circumstances:</p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.1 With Other Users</h3>
              <p>
                Your public profile information (username, display name, profile picture) is visible to other users.
                Content you post publicly will be visible to anyone who accesses the Service.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.2 With Service Providers</h3>
              <p>
                We share information with third-party vendors and service providers who perform services on our behalf,
                such as payment processing, data analysis, email delivery, hosting, and customer service.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.3 For Legal Reasons</h3>
              <p>We may disclose your information if required by law or if we believe disclosure is necessary to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Comply with legal process or government requests</li>
                <li>Protect our rights, privacy, safety, or property</li>
                <li>Enforce our Terms of Service</li>
                <li>Protect against legal liability</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.4 Business Transfers</h3>
              <p>
                If we are involved in a merger, acquisition, or sale of assets, your information may be transferred
                as part of that transaction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information
                against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission
                over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to provide
                you services. We may retain certain information for longer periods as required by law or for
                legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights and Choices</h2>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">6.1 Account Information</h3>
              <p>
                You can update your account information at any time through your account settings. You can also
                request deletion of your account by contacting us.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">6.2 Communications</h3>
              <p>
                You can opt out of receiving promotional emails by following the unsubscribe instructions in those
                emails. You may still receive transactional or account-related communications.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">6.3 Cookies</h3>
              <p>
                Most web browsers are set to accept cookies by default. You can usually modify your browser settings
                to decline cookies, but this may affect your ability to use certain features of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Children's Privacy</h2>
              <p>
                The Service is not intended for users under 18 years of age. We do not knowingly collect personal
                information from children under 18. If we learn that we have collected personal information from a
                child under 18, we will take steps to delete that information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence.
                These countries may have different data protection laws. By using the Service, you consent to the
                transfer of your information to these countries.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting
                the new Privacy Policy on this page and updating the "Last Modified" date. Your continued use of
                the Service after any changes constitutes your acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:support@digis.cc" className="text-cyan-400 hover:underline">support@digis.cc</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
