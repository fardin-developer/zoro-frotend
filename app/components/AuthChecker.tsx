'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks/redux';
import { checkAuthSuccess, checkAuthFailure } from '@/lib/store/authSlice';
import apiClient from '@/lib/api/axios';

interface AuthCheckerProps {
  children: React.ReactNode;
}

export default function AuthChecker({ children }: AuthCheckerProps) {
  const dispatch = useAppDispatch();
  const { token, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const checkAuthentication = async () => {
      // Check if we have a token in Redux state or localStorage
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);

      // Fetch user data whenever we have a token
      // This runs on: page load, after login (when isAuthenticated changes), or when token changes
      if (authToken) {
        // Don't dispatch checkAuthStart to avoid setting isLoading to true
        // This allows the page to render immediately while auth check runs in background

        try {
          const response = await apiClient.get('/user/me');
          const userData = response.data;
          dispatch(checkAuthSuccess(userData));
        } catch (error: any) {
          // Token is invalid or expired
          const errorMessage = error.response?.status === 401
            ? 'Authentication failed. Please login again.'
            : 'Network error. Please check your connection.';
          dispatch(checkAuthFailure(errorMessage));
        }
      }
    };

    // Run authentication check in background without blocking
    checkAuthentication();
  }, [token, isAuthenticated, dispatch]);

  // Always render children immediately (non-blocking)
  // Authentication check runs in parallel in the background
  return <>{children}</>;
}
