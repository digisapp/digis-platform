'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-gray-400 mb-8">Last Modified: December 10, 2024</p>

          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Welcome to Digis!</h2>
              <p>
                These Terms of Service (these "Terms") are an agreement between you and Digis ("Company," "we," or "us")
                that describes your rights and responsibilities as a User of the Digis streaming platform where Users can
                connect with creators and communicate with others through live streams, video calls, messages, and other
                methods (collectively, the "Service").
              </p>
              <p className="mt-4">
                By accessing or using the Service, or by clicking "Sign Up", you signify that you have read, understood,
                and agree to be bound by these Terms and to the collection and use of your information as set forth in
                our Privacy Policy, whether or not you are a registered user of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. The Service</h2>
              <p>
                Digis provides a platform for online streaming services where Users can connect with creators and
                communicate with others through live streams, video calls, paid content, and messaging. Users may
                visit the website, view content, post content, purchase virtual currency (Coins), and interact with creators.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.1 Eligibility</h3>
              <p>
                You must be at least 18 years old to use the Service. By using the Service, you represent and warrant
                that you are at least 18 years of age. If you are under 18, you may not use the Service under any circumstances.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.2 User Accounts</h3>
              <p>
                Your account on the Service gives you access to the services and functionality that we may establish
                and maintain from time to time at our sole discretion. You may never use another User's account without
                permission. When creating your account, you must provide accurate and complete information. You are
                solely responsible for the activity that occurs on your account, and you must keep your account password secure.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.3 Service Rules</h3>
              <p>You agree not to engage in any of the following prohibited activities:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Copying, distributing, or disclosing any part of the Service in any medium</li>
                <li>Using any automated system to access the Service</li>
                <li>Transmitting spam, chain letters, or other unsolicited communications</li>
                <li>Attempting to interfere with or compromise the system integrity or security</li>
                <li>Uploading viruses, malware, or other harmful software</li>
                <li>Impersonating another person or misrepresenting your identity</li>
                <li>Harassing, threatening, or abusing other users</li>
                <li>Posting illegal content or content that violates others' rights</li>
                <li>Using the Service for any illegal purpose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Creator Terms</h2>
              <p>
                If you apply to become a Creator on Digis, you agree to the following additional terms:
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.1 Creator Eligibility</h3>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>You must be at least 18 years of age</li>
                <li>You must provide accurate information in your Creator application</li>
                <li>You must comply with all applicable laws and regulations</li>
                <li>You are responsible for all content you create and share on the platform</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.2 Content Guidelines</h3>
              <p>As a Creator, you agree that all content you post:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Is created by you or you have the rights to share it</li>
                <li>Does not violate any third party's intellectual property rights</li>
                <li>Does not contain illegal content</li>
                <li>Complies with our Community Guidelines</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.3 Earnings and Payouts</h3>
              <p>
                Creators may earn Coins through subscriptions, tips, paid messages, video calls, and content sales.
                Coins can be converted to real currency and withdrawn according to our payout policies. We reserve
                the right to withhold payments in cases of suspected fraud or Terms violations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Virtual Currency (Coins)</h2>
              <p>
                Digis uses a virtual currency called "Coins" for transactions on the platform. By purchasing or
                using Coins, you agree to the following:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Coins are a limited license right, not real currency or property</li>
                <li>Coins cannot be exchanged for cash except through Creator payouts</li>
                <li>Coins cannot be transferred between users except through platform features (tips, subscriptions, etc.)</li>
                <li>All Coin purchases are final and non-refundable except as required by law</li>
                <li>We may modify Coin pricing and features at any time</li>
                <li>Unused Coins may be forfeited upon account termination</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. User Content</h2>
              <p>
                You retain ownership of content you create. However, by posting content on Digis, you grant us a
                non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and distribute your content
                in connection with the Service.
              </p>
              <p className="mt-4">
                You are solely responsible for your content and the consequences of posting it. We do not endorse
                any user content and are not liable for any content posted by users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Intellectual Property</h2>
              <p>
                The Service and all materials therein, including software, images, text, graphics, logos, and
                trademarks, are the property of Digis and its licensors. You may not use any of our intellectual
                property without our prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Termination</h2>
              <p>
                We may terminate or suspend your account at any time, with or without cause, with or without notice.
                Upon termination, your right to use the Service will immediately cease. You may also delete your
                account at any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Disclaimers</h2>
              <p className="uppercase text-sm">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
                OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Limitation of Liability</h2>
              <p className="uppercase text-sm">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DIGIS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. We will notify you of material changes by posting the updated
                Terms on our website. Your continued use of the Service after any changes constitutes your acceptance
                of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Contact</h2>
              <p>
                If you have any questions about these Terms, please contact us at{' '}
                <a href="mailto:support@digis.cc" className="text-cyan-400 hover:underline">support@digis.cc</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
