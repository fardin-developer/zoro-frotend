'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/hooks/redux';
import { loginStart, loginFailure, clearError } from '@/lib/store/authSlice';
import apiClient from '@/lib/api/axios';
import FadedCircle from './FadedCircle';

interface LoginPageProps {
  onNavigate?: (screen: string) => void;
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone'); // Phone is default
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Reset loading state immediately when component mounts
  useEffect(() => {
    setIsLoading(false);
    dispatch(loginFailure(''));
    dispatch(clearError());
  }, [dispatch]);

  // Handle browser back button - prevent navigation outside app
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      if (onNavigate) {
        onNavigate('home');
      } else {
        router.push('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router, onNavigate]);

  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    if (loginMethod === 'phone' && !phone.trim()) return;
    if (loginMethod === 'email' && !email.trim()) return;

    setIsLoading(true);
    setLoginError('');
    dispatch(loginStart());

    try {
      const requestBody = loginMethod === 'phone' ? { phone } : { email };
      const response = await apiClient.post('/user/send-otp', requestBody);

      if (response.data) {
        const loginValue = loginMethod === 'phone' ? phone : email;
        localStorage.setItem('loginData', JSON.stringify({
          email: loginValue,
          isPhoneLogin: loginMethod === 'phone'
        }));

        if (loginMethod === 'phone') {
          localStorage.setItem('loginPhone', phone);
        } else {
          localStorage.setItem('loginEmail', email);
        }

        if (onNavigate) {
          onNavigate('otp-verification');
        } else {
          router.push('/otp-verification');
        }
      }
    } catch (error: any) {
      let msg = 'Failed to send OTP';
      if (error?.response?.data?.message) {
        msg = error.response.data.message;
      } else if (typeof error?.response?.data === 'string') {
        try {
          const parsed = JSON.parse(error.response.data);
          if (parsed.message) msg = parsed.message;
          else msg = error.response.data;
        } catch {
          msg = error.response.data;
        }
      } else if (error?.message) {
        msg = error.message;
      }
      setLoginError(msg);
      dispatch(loginFailure(msg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#232426] relative overflow-hidden font-poppins">

      {/* Background Enhancements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <FadedCircle top="-10%" left="-10%" className="opacity-20 transform scale-150" />
        <FadedCircle top="90%" right="-10%" className="opacity-20 transform scale-150" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => onNavigate ? onNavigate('home') : router.push('/')}
          className="absolute -top-16 left-6 flex items-center text-[#7F8CAA] hover:text-white transition-colors duration-300 font-bold text-sm"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {/* Main Card */}
        <div className="bg-[#2A2B2E] border border-[#3A3B40] rounded-3xl shadow-2xl p-8 backdrop-blur-sm">

          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex justify-center items-center w-20 h-20 mb-4 bg-[#232426] rounded-2xl shadow-inner border border-[#3A3B40]">
              <Image
                src="/logo.png"
                alt="Creds Zone"
                width={50}
                height={50}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-[#7F8CAA] text-sm font-medium">
              Sign in to continue to <span className="text-white">Creds Zone</span>
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex p-1 mb-8 bg-[#232426] rounded-xl border border-[#3A3B40]">
            {(['phone', 'email'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setLoginMethod(method);
                  setLoginError('');
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 capitalize ${loginMethod === method
                    ? 'bg-[#7F8CAA] text-white shadow-lg'
                    : 'text-[#7F8CAA] hover:text-[#9BA6C0]'
                  }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="login-input"
                className="block text-xs uppercase tracking-wider text-[#7F8CAA] font-bold ml-1"
              >
                {loginMethod === 'phone' ? 'Phone Number' : 'Email Address'}
              </label>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7F8CAA] group-focus-within:text-white transition-colors duration-300">
                  {loginMethod === 'phone' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  )}
                </div>
                <input
                  id="login-input"
                  type={loginMethod === 'phone' ? 'tel' : 'email'}
                  value={loginMethod === 'phone' ? phone : email}
                  onChange={(e) => loginMethod === 'phone' ? setPhone(e.target.value) : setEmail(e.target.value)}
                  placeholder={loginMethod === 'phone' ? 'Enter phone number' : 'Enter email address'}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#232426] border border-[#3A3B40] rounded-xl text-white placeholder-[#5A6375] focus:outline-none focus:border-[#7F8CAA] focus:ring-1 focus:ring-[#7F8CAA] transition-all duration-300"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center animate-shake">
                {loginError}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-3.5 bg-[#7F8CAA] hover:bg-[#6A7690] text-white font-bold rounded-xl shadow-lg hover:shadow-[#7F8CAA]/30 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Sending Code...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center mt-8 text-[#5A6375] text-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}