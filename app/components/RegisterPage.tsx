'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/hooks/redux';
import { registerStart, registerSuccess, registerFailure } from '@/lib/store/authSlice';
import apiClient from '@/lib/api/axios';
import FadedCircle from './FadedCircle';

interface RegisterPageProps {
  onNavigate?: (screen: string) => void;
}

export default function RegisterPage({ onNavigate }: RegisterPageProps = {}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<null | { isPhoneLogin: boolean }>(null);
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Prefill and lock phone/email based on previous login method
  useEffect(() => {
    try {
      const stored = localStorage.getItem('loginData');
      let phonePrefilled = false;
      let emailPrefilled = false;

      if (stored) {
        const parsed = JSON.parse(stored) as { email: string; isPhoneLogin: boolean };
        setLoginMethod({ isPhoneLogin: parsed.isPhoneLogin });
        if (parsed.isPhoneLogin) {
          // Prefill phone number from login
          setFormData(prev => ({ ...prev, phone: parsed.email }));
          phonePrefilled = true;
        } else {
          // Prefill email from login
          setFormData(prev => ({ ...prev, email: parsed.email }));
          emailPrefilled = true;
        }
      }

      // Also check if there's a phone number stored separately (fallback)
      if (!phonePrefilled) {
        const phoneFromLogin = localStorage.getItem('loginPhone');
        if (phoneFromLogin) {
          setFormData(prev => ({ ...prev, phone: phoneFromLogin }));
        }
      }

      // Also check if there's an email stored separately (fallback)
      if (!emailPrefilled) {
        const emailFromLogin = localStorage.getItem('loginEmail');
        if (emailFromLogin) {
          setFormData(prev => ({ ...prev, email: emailFromLogin }));
        }
      }
    } catch (_) {
      // ignore parsing errors
    }
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRegister = async () => {
    // Validation
    if (!formData.name.trim()) {
      return;
    }
    if (!loginMethod?.isPhoneLogin) {
      if (!formData.phone.trim()) {
        return;
      }
    }
    if (loginMethod?.isPhoneLogin) {
      // phone is prefilled and locked, require email instead
      if (!formData.email.trim()) {
        return;
      }
    } else {
      if (!formData.email.trim()) {
        return;
      }
    }
    if (!formData.password.trim()) {
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!loginMethod || loginMethod.isPhoneLogin || (!loginMethod && formData.email)) {
      if (!emailRegex.test(formData.email)) {
        return;
      }
    }

    // Basic phone validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!loginMethod || !loginMethod.isPhoneLogin) {
      if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
        return;
      }
    }

    setIsLoading(true);
    dispatch(registerStart());

    try {
      const requestBody = {
        phone: formData.phone,
        name: formData.name,
        email: formData.email,
        password: formData.password
      };

      const response = await apiClient.post('/user/complete-registration', requestBody);
      const responseData = response.data;

      // Dispatch register success action
      dispatch(registerSuccess({
        user: responseData.user,
        token: responseData.token
      }));

      // Store only token in localStorage for persistence
      if (responseData.token) {
        localStorage.setItem('authToken', responseData.token);
      }

      // Navigate to intended path or dashboard after successful registration
      setTimeout(() => {
        try {
          const intended = localStorage.getItem('intendedPath');
          if (intended) {
            localStorage.removeItem('intendedPath');
            if (onNavigate) {
              onNavigate('home');
            } else {
              router.push(intended);
              return;
            }
          }
        } catch { }
        if (onNavigate) {
          onNavigate('home');
        } else {
          router.push('/');
        }
      }, 1500);
    } catch (error) {
      dispatch(registerFailure('Network error. Please check your connection and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-10 sm:pt-12 px-4 relative overflow-hidden" style={{ backgroundColor: '#232426' }}>
      {/* Desktop Container */}
      <div className="w-full max-w-md lg:max-w-lg">
        {/* Logo */}
        <div className="mb-8 relative z-10">
          <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Creds Zone Logo"
              width={144}
              height={144}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Registration Form */}
        <div className="w-full max-w-sm relative">
          {/* Form Container */}
          <div className="rounded-2xl p-6 pt-12 shadow-lg relative border-2 border-white" style={{ backgroundColor: '#7F8CAA' }}>
            {/* User Icon */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
              <div className="rounded-full flex items-center justify-center" style={{
                width: '70px',
                height: '70px',
                backgroundColor: '#C3BFBF'
              }}>
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'black' }}>
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div className="mt-6 sm:mt-8 mb-6">
              <h1 className="text-center font-bold mb-4 text-2xl sm:text-3xl" style={{ color: 'white' }}>
                Register
              </h1>
              <div className="w-full h-px" style={{ backgroundColor: 'white' }}></div>
            </div>

            {/* Name Input */}
            <div className="mb-4">
              <label htmlFor="reg-name" className="block mb-2 font-medium" style={{ color: 'white', fontSize: '18px' }}>
                Name
              </label>
              <input
                type="text"
                id="reg-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="enter your name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent placeholder-white text-gray-800"
                style={{
                  backgroundColor: '#C3BFBF',
                  color: '#232426',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Phone Number Input */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'white' }}>
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <label htmlFor="reg-phone" className="font-medium" style={{ color: 'white', fontSize: '18px' }}>
                  Phone Number
                </label>
              </div>
              <input
                type="tel"
                id="reg-phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="enter your number"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent placeholder-white text-gray-800"
                style={{
                  backgroundColor: '#C3BFBF',
                  color: '#232426',
                  fontSize: '16px'
                }}
                disabled={!!loginMethod?.isPhoneLogin}
              />
              {loginMethod?.isPhoneLogin && (
                <p className="mt-1 text-xs" style={{ color: 'white' }}>prefilled from phone login</p>
              )}
            </div>

            {/* Email Input */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'white' }}>
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <label htmlFor="reg-email" className="font-medium" style={{ color: 'white', fontSize: '18px' }}>
                  Email Address
                </label>
              </div>
              <input
                type="email"
                id="reg-email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="enter your email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent placeholder-white text-gray-800"
                style={{
                  backgroundColor: '#C3BFBF',
                  color: '#232426',
                  fontSize: '16px'
                }}
                disabled={loginMethod?.isPhoneLogin === false}
              />
              {loginMethod?.isPhoneLogin === false && (
                <p className="mt-1 text-xs" style={{ color: 'white' }}>prefilled from email login</p>
              )}
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <label htmlFor="reg-password" className="block mb-2 font-medium" style={{ color: 'white', fontSize: '18px' }}>
                Create Password
              </label>
              <input
                type="password"
                id="reg-password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="create your password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent placeholder-white text-gray-800"
                style={{
                  backgroundColor: '#C3BFBF',
                  color: '#232426',
                  fontSize: '16px'
                }}
              />
            </div>

          </div>

          {/* Register Button */}
          <div className="mt-6 px-2 sm:px-0">
            <button
              type="button"
              onClick={handleRegister}
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full py-3 sm:py-4 text-white font-bold text-base sm:text-lg transition-colors border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#7F8CAA', borderRadius: '25px' }}
            >
              {isLoading ? 'CREATING ACCOUNT...' : 'SIGN UP NOW'}
            </button>
          </div>

          {/* Login Link */}
          <div className="mt-3 text-center">
            <span className="text-white mr-2 text-sm sm:text-base">
              existing user?
            </span>
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('login') : router.push('/login')}
              className="text-white hover:opacity-80 transition-colors font-medium"
              style={{ color: '#7F8CAA' }}
            >
              Login Now
            </button>
          </div>
        </div>

        {/* Faded Circle */}
        <FadedCircle top="-60px" />
      </div>
    </div>
  );
}
