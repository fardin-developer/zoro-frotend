'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api/axios';
import TopSection from './TopSection';

interface OrderStatusPageProps {
  onNavigate?: (screen: string) => void;
}

type OrderStatus = 'processing' | 'completed' | 'failed' | 'cancelled' | 'pending';

interface OrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  _id: string;
}

interface OrderData {
  _id: string;
  orderType: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  items: OrderItem[];
  description: string;
  createdAt: string;
}

interface OrderStatusResponse {
  success: boolean;
  message: string;
  orderId: string;
  performance: {
    totalProviders: number;
    successfulCount: number;
    failedCount: number;
  };
  successfulProviders: string[];
  failedProviders: string[];
  attemptedProviders: string[];
  order: OrderData;
}

const OrderStatusPage: React.FC<OrderStatusPageProps> = ({ onNavigate }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkOrderStatus = useCallback(async (orderId: string | null) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!orderId) {
        setError('Missing required parameter: orderId');
        setIsLoading(false);
        return;
      }

      console.log('checkOrderStatus called with:', { orderId });

      const apiUrl = `/order/order-status?orderId=${encodeURIComponent(orderId)}`;
      console.log('Calling API:', apiUrl);
      const response = await apiClient.get(apiUrl);
      const result = response.data;

      console.log('API Response:', result);

      if (result.success) {
        setOrderData(result);
      } else {
        setError(result.message || 'Failed to fetch order status');
      }
    } catch (error: any) {
      console.error('Error fetching order status:', error);
      setError(error?.response?.data?.message || 'Failed to fetch order status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const getUrlParam = (param: string) => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
      }
      return null;
    };

    // Check for orderId in URL params
    const orderId = getUrlParam('orderId') ||
      searchParams?.get('orderId') ||
      getUrlParam('order_id') ||
      searchParams?.get('order_id');

    console.log('useEffect - URL params:', {
      orderId,
      searchParams: searchParams?.toString(),
      windowLocation: typeof window !== 'undefined' ? window.location.search : 'N/A'
    });

    if (orderId) {
      checkOrderStatus(orderId);
    } else {
      console.error('Missing required parameter: orderId');
      setError('Missing required parameter: orderId');
      setIsLoading(false);
    }
  }, [searchParams, checkOrderStatus]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const parseDescription = (description: string) => {
    try {
      const parsed = JSON.parse(description);
      return parsed;
    } catch {
      return { text: description };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden p-0 m-0" style={{ backgroundColor: '#232426' }}>
        <TopSection showLogo={true} onNavigate={onNavigate} />
        <div className="flex items-center justify-center py-20">
          <div className="text-white text-base sm:text-xl">Loading order status...</div>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: OrderStatus | undefined) => {
    if (!status) return { icon: null, text: 'Unknown Status', bgColor: '#6B7280', textColor: 'text-gray-400' };

    switch (status) {
      case 'completed':
        return {
          icon: (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ),
          text: 'Order Completed Successfully',
          bgColor: '#20B2AA',
          textColor: 'text-green-400'
        };
      case 'failed':
        return {
          icon: (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          text: 'Order Failed',
          bgColor: '#DC2626',
          textColor: 'text-red-400'
        };
      case 'cancelled':
        return {
          icon: (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          text: 'Order Cancelled',
          bgColor: '#DC2626',
          textColor: 'text-red-400'
        };
      case 'processing':
      case 'pending':
        return {
          icon: (
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: '#FEF3C7' }}>
                <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"></circle>
                <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0110 10h-2a8 8 0 00-8-8V2z"></path>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#FEF3C7' }}></div>
              </div>
            </div>
          ),
          text: 'Order Processing',
          bgColor: '#FDE047',
          textColor: 'text-yellow-300'
        };
      default:
        return {
          icon: null,
          text: 'Unknown Status',
          bgColor: '#6B7280',
          textColor: 'text-gray-400'
        };
    }
  };

  const statusConfig = orderData?.order ? getStatusConfig(orderData.order.status) : getStatusConfig(undefined);

  return (
    <div className="min-h-screen relative overflow-hidden p-0 m-0" style={{ backgroundColor: '#232426' }}>
      {/* Desktop Container */}
      <div className="w-full">
        {/* Top Section with Logo */}
        <div className="relative z-10">
          <TopSection showLogo={true} onNavigate={onNavigate} />
        </div>

        {/* Status Section */}
        <div className="flex flex-col items-center py-6">
          {/* Status Icon */}
          <div
            className="rounded-full flex items-center justify-center mb-4"
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: statusConfig.bgColor
            }}
          >
            {statusConfig.icon}
          </div>

          {/* Status Text */}
          <h1 className="text-white font-bold mb-2 text-2xl sm:text-3xl text-center">
            {error ? 'Error' : statusConfig.text}
          </h1>
          {error && (
            <p className="text-red-400 text-sm mt-2 text-center px-4">
              {error}
            </p>
          )}
        </div>

        {/* Order Details Card */}
        {orderData && orderData.order && (
          <div className="px-4 md:px-6 lg:px-8 mb-6">
            <div
              className="p-4 rounded-lg"
              style={{
                background: 'linear-gradient(90deg, #7F8CAA 0%, #5C667C 100%)',
                boxShadow: '0px 4px 4px 0px #00000040'
              }}
            >
              <div className="flex">
                {/* Left Column - Labels */}
                <div className="space-y-3" style={{ width: '120px' }}>
                  <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Order Date</div>
                  <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Order ID</div>
                  <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Product</div>
                  <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Order Details</div>
                  <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Price</div>
                  <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Payment Method</div>
                  <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Status</div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px bg-white mx-4"></div>

                {/* Right Column - Values */}
                <div className="flex-1 space-y-3">
                  <div className="text-green-400 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                    {formatDate(orderData.order.createdAt)}
                  </div>
                  <div className="text-blue-400 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                    {orderData.orderId}
                  </div>
                  <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                    {orderData.order.items && orderData.order.items.length > 0
                      ? orderData.order.items.map(item => item.itemName).join(', ')
                      : 'N/A'}
                  </div>
                  <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                    {(() => {
                      const desc = parseDescription(orderData.order.description);
                      return desc.text || desc.playerId || 'N/A';
                    })()}
                  </div>
                  <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                    {orderData.order.amount} {orderData.order.currency}
                  </div>
                  <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                    {orderData.order.paymentMethod ? orderData.order.paymentMethod.charAt(0).toUpperCase() + orderData.order.paymentMethod.slice(1) : 'N/A'}
                  </div>
                  <div
                    className={`text-sm font-medium ${statusConfig.textColor}`}
                    style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}
                  >
                    {orderData.order.status.charAt(0).toUpperCase() + orderData.order.status.slice(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Info */}
            {orderData.performance && (
              <div
                className="p-4 rounded-lg mt-4"
                style={{
                  background: 'linear-gradient(90deg, #7F8CAA 0%, #5C667C 100%)',
                  boxShadow: '0px 4px 4px 0px #00000040'
                }}
              >
                <div className="text-white text-sm mb-2" style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: '14px' }}>
                  Processing Info
                </div>
                <div className="text-gray-300 text-xs" style={{ fontFamily: 'Poppins', fontSize: '12px' }}>
                  Total Providers: {orderData.performance.totalProviders} |
                  Successful: {orderData.performance.successfulCount} |
                  Failed: {orderData.performance.failedCount}
                </div>
                {orderData.successfulProviders && orderData.successfulProviders.length > 0 && (
                  <div className="text-green-400 text-xs mt-1" style={{ fontFamily: 'Poppins', fontSize: '12px' }}>
                    Successful: {orderData.successfulProviders.join(', ')}
                  </div>
                )}
                {orderData.failedProviders && orderData.failedProviders.length > 0 && (
                  <div className="text-red-400 text-xs mt-1" style={{ fontFamily: 'Poppins', fontSize: '12px' }}>
                    Failed: {orderData.failedProviders.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-4 md:px-6 lg:px-8 mb-8">
          <div className="flex gap-4">
            <button
              className="flex-1 py-3 px-4 rounded-4xl border-2 border-white text-white"
              style={{ fontSize: '16px', backgroundColor: 'transparent' }}
              onClick={() => onNavigate ? onNavigate('topup') : router.push('/')}
            >
              Top Up Again
            </button>
            <button
              className="flex-1 py-3 px-4 rounded-4xl text-white"
              style={{ backgroundColor: 'rgb(75, 85, 99)', fontSize: '16px' }}
              onClick={() => onNavigate ? onNavigate('orders') : router.push('/orders')}
            >
              Order History
            </button>
          </div>
        </div>

        {/* Bottom Spacing for Fixed Navigation */}
        <div className="h-15"></div>

        {/* Bottom Navigation */}
      </div>
    </div>
  );
};

export default OrderStatusPage;

