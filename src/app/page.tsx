'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';
import { LoadingSpinner } from '@/components/ui';
import { FanDashboard } from '@/components/home/FanDashboard';
import { MarketingPage } from '@/components/home/MarketingPage';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupRedirectTo, setSignupRedirectTo] = useState('/welcome');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const loginParam = searchParams.get('login');

    if (loginParam === 'true' && emailParam) {
      setLoginEmail(emailParam);
      setShowLogin(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            const role = data.user?.role;
            const username = data.user?.username;

            if (!username || username.startsWith('user_')) {
              router.replace('/welcome/username');
              return;
            }

            if (role === 'admin') {
              router.replace('/admin');
              return;
            } else if (role === 'creator') {
              router.replace('/creator/dashboard');
              return;
            } else {
              router.replace('/explore');
              return;
            }
          } else if (response.status === 404) {
            router.replace('/welcome/username');
            return;
          } else {
            setIsAuthenticated(true);
            setLoading(false);
          }
        } catch {
          setIsAuthenticated(true);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-cyan-400/40 scale-150" />
            <Image
              src="/images/digis-logo-white.png"
              alt="Digis"
              width={120}
              height={40}
              className="relative animate-pulse drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]"
              priority
            />
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <FanDashboard />;
  }

  return (
    <>
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToSignup={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
        initialEmail={loginEmail}
      />
      <SignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        onSwitchToLogin={() => {
          setShowSignup(false);
          setShowLogin(true);
        }}
        redirectTo={signupRedirectTo}
      />

      <MarketingPage
        onLogin={() => setShowLogin(true)}
        onSignup={(redirectTo) => {
          setSignupRedirectTo(redirectTo);
          setShowSignup(true);
        }}
      />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><LoadingSpinner /></div>}>
      <HomeContent />
    </Suspense>
  );
}
