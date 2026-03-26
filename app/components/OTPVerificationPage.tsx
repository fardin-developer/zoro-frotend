'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/hooks/redux';
import { loginSuccess, loginFailure } from '@/lib/store/authSlice';
import apiClient from '@/lib/api/axios';
import FadedCircle from './FadedCircle';

interface OTPVerificationPageProps {
  onNavigate?: (screen: string) => void;
}

export default function OTPVerificationPage({ onNavigate }: OTPVerificationPageProps) {
  const [otp, setOtp] = useState('');
  const [loginData, setLoginData] = useState<{ email: string, isPhoneLogin: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(false);

    // Get login data
    const storedData = localStorage.getItem('loginData');
    if (storedData) {
      try {
        setLoginData(JSON.parse(storedData));
      } catch (error) {
        console.error('Error parsing loginData:', error);
        localStorage.removeItem('loginData');
        navigateBack();
      }
    } else {
      navigateBack();
    }
    setIsInitializing(false);
  }, []);

  const navigateBack = () => {
    if (onNavigate) {
      onNavigate('login');
    } else {
      router.push('/login');
    }
  };

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsLoading(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-focus input on mount
  useEffect(() => {
    if (!isInitializing && loginData) {
      inputRef.current?.focus();
    }
  }, [isInitializing, loginData]);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    if (errorMessage) setErrorMessage('');
  };

  const handleProceed = async () => {
    if (otp.length !== 6 || !loginData) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const requestBody = loginData.isPhoneLogin
        ? { phone: loginData.email, otp } // loginData.email stores the phone number for phone login
        : { email: loginData.email, otp };

      const response = await apiClient.post('/user/verify-otp', requestBody);
      const responseData = response.data;

      setIsSuccess(true);

      setTimeout(() => {
        if (responseData.requiresRegistration) {
          localStorage.removeItem('loginData');
          if (onNavigate) onNavigate('register');
          else router.push('/register');
        } else {
          dispatch(loginSuccess({
            user: responseData.user,
            token: responseData.token
          }));

          if (responseData.token) {
            localStorage.setItem('authToken', responseData.token);
          }
          localStorage.removeItem('loginData');

          try {
            const intended = localStorage.getItem('intendedPath');
            if (intended) {
              localStorage.removeItem('intendedPath');
              if (!onNavigate) {
                router.push(intended);
                return;
              }
            }
          } catch { }

          if (onNavigate) onNavigate('home');
          else router.push('/');
        }
      }, 1500);

    } catch (error: any) {
      setIsLoading(false);
      const msg = error.response?.data?.message || 'Invalid OTP. Please try again.';
      setErrorMessage(msg);
      dispatch(loginFailure(msg));
    }
  };

  // Allow pressing Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && otp.length === 6) {
      handleProceed();
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#232426]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!loginData) return null;

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
          onClick={navigateBack}
          className="absolute -top-16 left-6 flex items-center text-[#7F8CAA] hover:text-white transition-colors duration-300 font-bold text-sm"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Login
        </button>

        {/* Main Card */}
        <div className="bg-[#2A2B2E] border border-[#3A3B40] rounded-3xl shadow-2xl p-8 backdrop-blur-sm">

          {/* Header */}
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
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              OTP Verification
            </h1>
            <p className="text-[#7F8CAA] text-sm font-medium px-4">
              Enter the 6-digit code sent to
              <br />
              <span className="text-white block mt-1">{loginData.email}</span>
            </p>
          </div>

          {/* OTP Input */}
          <div className="mb-8">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                maxLength={6}
                inputMode="numeric"
                value={otp}
                onChange={handleOtpChange}
                onKeyDown={handleKeyDown}
                placeholder="000000"
                className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 bg-[#232426] border border-[#3A3B40] rounded-xl text-white placeholder-[#3A3B40] focus:outline-none focus:border-[#7F8CAA] focus:ring-1 focus:ring-[#7F8CAA] transition-all duration-300"
                style={{ fontFamily: 'monospace' }} // Monospace ensures even spacing for digits
              />
            </div>
            {errorMessage && (
              <p className="mt-3 text-red-500 text-sm font-medium text-center animate-shake">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleProceed}
            disabled={isLoading || isSuccess || otp.length !== 6}
            className={`w-full py-3.5 font-bold rounded-xl shadow-lg transition-all duration-300 transform active:scale-95 flex justify-center items-center gap-2 ${isSuccess
                ? 'bg-green-500 text-white'
                : 'bg-[#7F8CAA] hover:bg-[#6A7690] text-white hover:shadow-[#7F8CAA]/30 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
          >
            {isSuccess ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Verified!</span>
              </>
            ) : isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify Code</span>
            )}
          </button>

          {/* Footer Actions */}
          <div className="mt-6 text-center space-y-3">
            <button
              onClick={navigateBack}
              className="text-sm text-[#7F8CAA] hover:text-white transition-colors"
            >
              Didn't receive code? <span className="font-semibold underline decoration-dotted">Resend</span>
            </button>
            <div className="block">
              <button
                onClick={navigateBack}
                className="text-xs text-[#5A6375] hover:text-[#7F8CAA] transition-colors"
              >
                Change {loginData.isPhoneLogin ? 'Phone Number' : 'Email Address'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
