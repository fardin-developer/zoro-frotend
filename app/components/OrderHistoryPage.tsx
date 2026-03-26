'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/lib/hooks/redux';
import apiClient from '@/lib/api/axios';
import TopSection from './TopSection';

interface OrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  _id: string;
}

interface Order {
  _id: string;
  userId: string;
  orderType: string;
  orderId: string;
  gameName?: string;
  amount: number;
  currency: string;
  status: string;
  manualOrder: boolean;
  paymentMethod: string;
  items: OrderItem[];
  description: string;
  nextStatusCheck: string;
  statusCheckCount: number;
  maxStatusChecks: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderHistoryResponse {
  success: boolean;
  orders: Order[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface OrderHistoryPageProps {
  onNavigate?: (screen: string) => void;
}

interface LedgerTransaction {
  _id: string;
  userId: string;
  transactionType: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  referenceType: string;
  description: string;
  status: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdByType: string;
  isReversal: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  metadata?: any;
}

interface LedgerResponse {
  success: boolean;
  data: {
    transactions: LedgerTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: string;
  balanceBefore?: number;
  balanceAfter?: number;
  reference?: string;
  referenceType?: string;
}

interface TransactionResponse {
  _id: string;
  userId: string;
  orderId: string;
  amount: number;
  paymentNote: string;
  customerName: string;
  customerEmail: string;
  customerNumber: string;
  redirectUrl: string;
  status: string;
  gatewayId: string;
  gatewayType: string;
  gatewayResponse: any;
  udf1: string;
  udf2: string;
  createdAt: string;
  updatedAt: string;
  gatewayOrderId?: string;
  payerUpi?: string;
  txnId?: string;
  utr?: string;
}

interface TransactionHistoryResponse {
  success: boolean;
  transactions: TransactionResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalTransactions: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface PaymentTransaction {
  id: string;
  method: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  transactionId: string;
  orderId?: string;
  payerUpi?: string;
}

export default function OrderHistoryPage({ onNavigate }: OrderHistoryPageProps = {}) {
  const router = useRouter();
  const { isAuthenticated, token, user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'orders' | 'wallet' | 'payment'>('orders');
  const [orderData, setOrderData] = useState<OrderHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(!isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedWalletTransaction, setSelectedWalletTransaction] = useState<WalletTransaction | null>(null);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [walletPagination, setWalletPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [paymentPagination, setPaymentPagination] = useState({ currentPage: 1, totalPages: 0, totalTransactions: 0, hasNextPage: false, hasPrevPage: false });
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const paymentDateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Only fetch data once authenticated; don't self-redirect (ProtectedRoute handles it)
    if (isAuthenticated && (token || typeof window === 'undefined' || localStorage.getItem('authToken'))) {
      fetchOrderHistory();
    }
  }, [currentPage, isAuthenticated, token]);

  useEffect(() => {
    // Fetch wallet transactions when wallet tab is active
    if (activeTab === 'wallet' && isAuthenticated && token) {
      fetchWalletTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated, token, walletPagination.page]);

  useEffect(() => {
    // Fetch payment transactions when payment tab is active
    if (activeTab === 'payment' && isAuthenticated && token) {
      fetchPaymentHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated, token, paymentPagination.currentPage]);

  // Update loading state when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(false);
    } else if (!isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch wallet balance from dashboard API or use user's walletBalance
  useEffect(() => {
    if (isAuthenticated && token) {
      // First, try to use user's walletBalance from auth state
      if (user?.walletBalance !== undefined) {
        setWalletBalance(user.walletBalance);
      }

      // Also fetch dashboard data to get the latest balance
      const fetchDashboardBalance = async () => {
        try {
          const response = await apiClient.get('/user/me');
          if (response.data.data?.walletBalance !== undefined) {
            setWalletBalance(response.data.data.walletBalance);
          }
        } catch (error) {
          console.error('Error fetching wallet balance:', error);
          // If fetch fails, keep using user's walletBalance if available
        }
      };

      fetchDashboardBalance();
    }
  }, [isAuthenticated, token, user]);

  // Prevent body scroll when popup is open
  useEffect(() => {
    if (showOrderDetails || showWalletDetails || showPaymentDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showOrderDetails, showWalletDetails, showPaymentDetails]);

  const fetchOrderHistory = async () => {
    try {
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      // Add optional parameters if they have values
      if (searchDate) {
        queryParams.append('dateFrom', searchDate);
      }
      if (searchOrderId) {
        queryParams.append('orderId', searchOrderId);
      }
      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }

      const response = await apiClient.get(`/order/history?${queryParams.toString()}`);
      const data = response.data;
      setOrderData(data);
    } catch (error) {
      console.error('Error fetching order history:', error);
      setError('Failed to load order history');
    }
    // Remove setIsLoading(false) from here - loading state is managed by auth state
  };

  const fetchWalletTransactions = async () => {
    try {
      setIsLoadingWallet(true);
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Build query parameters for wallet ledger API
      const queryParams = new URLSearchParams({
        page: walletPagination.page.toString(),
        limit: walletPagination.limit.toString()
      });

      // Add date range if needed (using current month as default)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      queryParams.append('startDate', startOfMonth.toISOString());
      queryParams.append('endDate', endOfMonth.toISOString());

      const response = await apiClient.get(`/wallet/ledger?${queryParams.toString()}`);
      const data: LedgerResponse = response.data;

      if (data.success && data.data) {
        // Transform ledger transactions to wallet transactions
        const transformed = data.data.transactions.map((tx: LedgerTransaction) => ({
          id: tx._id,
          type: tx.transactionType,
          amount: tx.amount,
          description: tx.description,
          date: tx.createdAt,
          status: tx.status,
          balanceBefore: tx.balanceBefore,
          balanceAfter: tx.balanceAfter,
          reference: tx.reference,
          referenceType: tx.referenceType
        })) as WalletTransaction[];

        setWalletTransactions(transformed);
        setWalletPagination(data.data.pagination);

        // Update wallet balance from the most recent transaction (first in the list)
        if (transformed.length > 0 && transformed[0].balanceAfter) {
          setWalletBalance(transformed[0].balanceAfter);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      setError('Failed to load wallet transactions');
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setIsLoadingPayment(true);
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Build query parameters for payment/transaction history API
      const queryParams = new URLSearchParams({
        page: paymentPagination.currentPage.toString(),
        limit: '10'
      });

      const response = await apiClient.get(`/transaction/history?${queryParams.toString()}`);
      const data: TransactionHistoryResponse = response.data;

      if (data.success && data.transactions) {
        // Transform transaction response to payment transactions
        const transformed = data.transactions.map((tx: TransactionResponse) => ({
          id: tx._id,
          method: tx.gatewayType.toUpperCase(),
          amount: tx.amount,
          description: tx.paymentNote,
          date: tx.createdAt,
          status: tx.status,
          transactionId: tx.txnId || tx.gatewayOrderId || tx._id,
          orderId: tx.orderId,
          payerUpi: tx.payerUpi
        })) as PaymentTransaction[];

        setPaymentTransactions(transformed);
        setPaymentPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching payment transactions:', error);
      setError('Failed to load payment transactions');
    } finally {
      setIsLoadingPayment(false);
    }
  };

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

  const parseDescription = (description: string): { playerId: string; server: string } => {
    try {
      const parsed = JSON.parse(description);
      return {
        playerId: parsed.playerId || 'N/A',
        server: parsed.server || 'N/A'
      };
    } catch {
      return {
        playerId: 'N/A',
        server: 'N/A'
      };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
      case 'cancelled':
        return 'text-red-400';
      default:
        return 'text-white';
    }
  };

  const handleSearch = () => {
    // Reset to first page when searching
    setCurrentPage(1);
    fetchOrderHistory();
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleWalletTransactionClick = (transaction: WalletTransaction) => {
    setSelectedWalletTransaction(transaction);
    setShowWalletDetails(true);
  };

  const handlePaymentClick = (payment: PaymentTransaction) => {
    setSelectedPayment(payment);
    setShowPaymentDetails(true);
  };

  // Only show loading screen if user is not authenticated yet but still loading
  if (isLoading && isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden p-0 m-0" style={{ backgroundColor: '#232426' }}>
        <div className="relative z-10">
          <TopSection showLogo={true} onNavigate={onNavigate} />
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading order history...</div>
        </div>
      </div>
    );
  }

  // If not authenticated and done loading, show login prompt
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden p-0 m-0 flex flex-col" style={{ backgroundColor: '#232426' }}>
        <div className="relative z-10">
          <TopSection showLogo={true} onNavigate={onNavigate} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
          <div className="w-24 h-24 bg-[#333844] rounded-full flex items-center justify-center mb-6 shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
            <svg className="w-12 h-12 text-[#7F8CAA]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-white text-2xl font-bold mb-3 text-center">Login Required</h2>
          <p className="text-gray-400 text-center mb-8 max-w-xs">
            Please login to view your complete order history and wallet transactions.
          </p>
          <button
            onClick={() => onNavigate ? onNavigate('login') : router.push('/login')}
            className="w-full max-w-[200px] py-3 rounded-xl font-bold text-white transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(90deg, #E7121B 0%, #C21011 100%)',
              boxShadow: '0px 4px 12px rgba(231, 18, 27, 0.3)'
            }}
          >
            Login Now
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden p-0 m-0" style={{ backgroundColor: '#232426' }}>
        <div className="relative z-10">
          <TopSection showLogo={true} />
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden p-0 m-0" style={{ backgroundColor: '#232426' }}>
      {/* Desktop Container */}
      <div className="w-full">
        <div className="relative z-10">
          <TopSection showLogo={true} onNavigate={onNavigate} />
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-6 lg:px-8 mb-4 relative z-10">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors text-sm cursor-pointer ${activeTab === 'orders'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
                }`}
              style={{
                backgroundColor: activeTab === 'orders' ? 'rgb(75, 85, 99)' : 'transparent',
                border: activeTab === 'orders' ? 'none' : '1px solid rgb(127, 140, 170)',
                zIndex: 10,
                position: 'relative'
              }}
            >
              Create Order
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wallet')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors text-sm cursor-pointer ${activeTab === 'wallet'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
                }`}
              style={{
                backgroundColor: activeTab === 'wallet' ? 'rgb(75, 85, 99)' : 'transparent',
                border: activeTab === 'wallet' ? 'none' : '1px solid rgb(127, 140, 170)',
                zIndex: 10,
                position: 'relative'
              }}
            >
              Wallet History
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payment')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors text-sm cursor-pointer ${activeTab === 'payment'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
                }`}
              style={{
                backgroundColor: activeTab === 'payment' ? 'rgb(75, 85, 99)' : 'transparent',
                border: activeTab === 'payment' ? 'none' : '1px solid rgb(127, 140, 170)',
                zIndex: 10,
                position: 'relative'
              }}
            >
              Payment History
            </button>
          </div>
        </div>

        {/* Page Title */}
        {activeTab === 'orders' && (
          <div className="px-4 md:px-6 lg:px-8 mb-4">
            <h1 className="text-white font-bold text-xl sm:text-2xl">History</h1>
            {orderData?.pagination && (
              <p className="text-gray-400 text-sm mt-2">
                Showing {orderData?.orders?.length || 0} of {orderData?.pagination?.totalOrders || 0} orders
              </p>
            )}
          </div>
        )}

        {/* Balance Card for Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="px-4 md:px-6 lg:px-8 mb-6">
            <div
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{
                background: 'linear-gradient(90deg, #7F8CAA 0%, #5C667C 100%)',
                boxShadow: '0px 4px 4px 0px #00000040'
              }}
            >
              <div className="flex items-center">
                <div className="mr-4">
                  <Image
                    src="/coin.png"
                    alt="Coins"
                    width={48}
                    height={48}
                    className="rounded-full"
                    style={{ color: 'transparent' }}
                  />
                </div>
                <div>
                  <p className="text-white text-sm">Creds</p>
                  <p className="text-white font-bold text-lg">Available Balance</p>
                </div>
              </div>
              <div
                className="px-3 py-1 rounded-lg text-white text-sm"
                style={{
                  backgroundColor: '#363B48',
                  border: '1px solid white',
                  fontSize: '16px',
                  fontWeight: 600
                }}
              >
                {walletBalance} coins
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Section - Styled like reference */}
        {activeTab === 'orders' && (
          <div className="px-4 md:px-6 lg:px-8 mb-6" role="search">
            {/* Row 1: Search by Order ID + icon button */}
            <div className="flex items-center">
              <input
                type="text"
                placeholder="search by order id"
                aria-label="search by order id"
                className="flex-1 px-4 py-3 rounded-2xl text-black placeholder-gray-500"
                style={{ backgroundColor: '#D9D9D9' }}
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
              />
              <button
                type="button"
                aria-label="search"
                onClick={handleSearch}
                className="ml-2 flex items-center justify-center rounded-2xl"
                style={{ width: '40px', height: '40px' }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Row 2: Calendar button + date input + search button */}
            <div className="mt-3 flex items-center">
              <button
                type="button"
                aria-label="open calendar"
                onClick={() => {
                  try {
                    // @ts-ignore - showPicker not in TS lib yet for all targets
                    if (dateInputRef.current && dateInputRef.current.showPicker) {
                      // @ts-ignore
                      dateInputRef.current.showPicker();
                    } else {
                      dateInputRef.current?.focus();
                    }
                  } catch {
                    dateInputRef.current?.focus();
                  }
                }}
                className="flex items-center justify-center"
                style={{ width: '36px', height: '36px', borderRadius: '8px' }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </button>
              <input
                ref={dateInputRef}
                type="date"
                placeholder="dd-mm-yyyy"
                aria-label="filter by date"
                className="flex-1 ml-2 px-4 py-3 rounded-2xl text-black placeholder-gray-500"
                style={{ backgroundColor: '#D9D9D9' }}
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
              <button
                type="button"
                className="ml-2 px-5 py-2 rounded-2xl text-white font-medium"
                style={{ backgroundColor: 'rgb(35, 36, 38)', border: '1px solid rgb(127, 140, 170)' }}
                onClick={handleSearch}
              >
                search
              </button>
            </div>
          </div>
        )}

        {/* Payment History Filters */}
        {activeTab === 'payment' && (
          <div className="px-4 md:px-6 lg:px-8 mb-6" role="search">
            {/* Row 1: Search by Transaction ID + icon button */}
            <div className="flex items-center">
              <input
                type="text"
                placeholder="search by transaction id"
                aria-label="search by transaction id"
                className="flex-1 px-4 py-3 rounded-2xl text-black placeholder-gray-500"
                style={{ backgroundColor: '#D9D9D9' }}
              />
              <button
                type="button"
                aria-label="search"
                className="ml-2 flex items-center justify-center rounded-2xl"
                style={{ width: '40px', height: '40px' }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Row 2: Calendar button + date input + search button */}
            <div className="mt-3 flex items-center">
              <button
                type="button"
                aria-label="open calendar"
                onClick={() => {
                  try {
                    if (paymentDateInputRef.current && paymentDateInputRef.current.showPicker) {
                      // @ts-ignore
                      paymentDateInputRef.current.showPicker();
                    } else {
                      paymentDateInputRef.current?.focus();
                    }
                  } catch {
                    paymentDateInputRef.current?.focus();
                  }
                }}
                className="flex items-center justify-center"
                style={{ width: '36px', height: '36px', borderRadius: '8px' }}
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </button>
              <input
                ref={paymentDateInputRef}
                type="date"
                placeholder="dd-mm-yyyy"
                aria-label="filter by date"
                className="flex-1 ml-2 px-4 py-3 rounded-2xl text-black placeholder-gray-500"
                style={{ backgroundColor: '#D9D9D9' }}
              />
              <button
                type="button"
                className="ml-2 px-5 py-2 rounded-2xl text-white font-medium"
                style={{ backgroundColor: 'rgb(35, 36, 38)', border: '1px solid rgb(127, 140, 170)' }}
              >
                search
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="px-4 md:px-6 lg:px-8 mb-8">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orderData?.orders?.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-white text-lg">No orders found</div>
                  <div className="text-gray-400 text-sm mt-2">You haven't placed any orders yet</div>
                </div>
              ) : (
                orderData?.orders?.map((order) => {
                  const descriptionData = parseDescription(order.description);
                  const orderItem = order.items[0]; // Get first item for display

                  return (
                    <div
                      key={order._id}
                      className="p-3 rounded-lg cursor-pointer transition-opacity hover:opacity-90"
                      style={{ background: 'linear-gradient(90deg, rgb(127, 140, 170) 0%, rgb(92, 102, 124) 100%)' }}
                      onClick={() => handleOrderClick(order)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Game Icon Placeholder */}
                        <div className="w-12 h-12 rounded-full bg-gray-300 shrink-0 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                          </svg>
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <div className={`font-bold text-base mb-1 ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </div>
                          <div className="text-white text-sm mb-1">
                            {orderItem?.itemName || 'N/A'}
                          </div>
                          <div className="text-gray-300 text-xs mb-1">
                            {formatDate(order.createdAt)}
                          </div>
                          <div className="text-white font-semibold text-sm">
                            ₹{order.amount} {order.currency}
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            Payment: {order.paymentMethod === 'upi' ? 'UPI' : order.paymentMethod === 'wallet' ? 'Wallet' : order.paymentMethod?.toUpperCase() || 'N/A'}
                          </div>
                        </div>

                        {/* View Button */}
                        <button className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium">
                          View
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-4">
              {isLoadingWallet ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <div className="text-white text-lg">Loading transactions...</div>
                </div>
              ) : walletTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-white text-lg">No transactions found</div>
                  <div className="text-gray-400 text-sm mt-2">You haven't made any transactions yet</div>
                </div>
              ) : (
                walletTransactions.map((transaction) => {
                  return (
                    <div
                      key={transaction.id}
                      className="p-3 rounded-lg cursor-pointer transition-opacity hover:opacity-90"
                      style={{
                        background: 'linear-gradient(90deg, rgb(127, 140, 170) 0%, rgb(92, 102, 124) 100%)',
                        boxShadow: '0px 4px 4px 0px #00000040'
                      }}
                      onClick={() => handleWalletTransactionClick(transaction)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-full bg-gray-300 shrink-0 flex items-center justify-center">
                          {transaction.type === 'credit' ? (
                            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <div className={`font-bold text-base mb-1 ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                            {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                          </div>
                          <div className="text-white text-sm mb-1">
                            {transaction.description}
                          </div>
                          <div className="text-gray-300 text-xs">
                            {formatDate(transaction.date)}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-white font-medium text-lg">
                          {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-4">
              {isLoadingPayment ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <div className="text-white text-lg">Loading transactions...</div>
                </div>
              ) : paymentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-white text-lg">No payments found</div>
                  <div className="text-gray-400 text-sm mt-2">You haven't made any payments yet</div>
                </div>
              ) : (
                paymentTransactions.map((payment) => {
                  return (
                    <div
                      key={payment.id}
                      className="p-3 rounded-lg cursor-pointer transition-opacity hover:opacity-90"
                      style={{ background: 'linear-gradient(90deg, rgb(127, 140, 170) 0%, rgb(92, 102, 124) 100%)' }}
                      onClick={() => handlePaymentClick(payment)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Payment Icon */}
                        <div className="w-12 h-12 rounded-full bg-gray-300 shrink-0 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                          </svg>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-base mb-1 ${payment.status === 'success' ? 'text-green-400' : payment.status === 'pending' ? 'text-pink-400' : 'text-red-400'}`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </div>
                          <div className="text-white text-sm mb-1 truncate">
                            {payment.description || payment.method}
                          </div>
                          <div className="text-gray-300 text-xs">
                            {formatDate(payment.date)}
                          </div>
                          <div className="text-blue-400 text-xs mt-1 truncate">
                            {payment.transactionId}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-white font-bold text-base shrink-0">
                          ₹{payment.amount}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Bottom Spacing for Fixed Navigation */}
        <div className="h-15"></div>

        {/* Bottom Navigation */}

        {/* Order Details Popup */}
        {showOrderDetails && selectedOrder && (() => {
          const descriptionData = parseDescription(selectedOrder.description);
          return (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 z-50"
                style={{ background: '#000000cc' }}
                onClick={() => setShowOrderDetails(false)}
              />

              {/* Popup from Bottom */}
              <div className="fixed bottom-0 left-0 right-0 rounded-t-3xl z-50 max-h-[70vh] overflow-y-auto" style={{ animation: 'slideUp 0.3s ease-out', backgroundColor: 'rgb(35, 36, 38)' }}>
                {/* Top Color Effect */}
                <div
                  className="sticky top-0 left-0 right-0 h-10 pointer-events-none z-10"
                  style={{
                    background: 'linear-gradient(180deg, rgba(127, 140, 170, 0.3) 0%, transparent 100%)'
                  }}
                />
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center mb-4">
                    <button
                      onClick={() => setShowOrderDetails(false)}
                      className="p-2 rounded-full"
                    >
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 className="flex-1 text-center font-bold text-xl text-white">Order Details</h2>
                    <div className="w-10"></div>
                  </div>

                  {/* Order Details Box */}
                  <div
                    className="p-4 rounded-lg mb-4"
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
                        <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>User ID</div>
                        <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Zone ID</div>
                        <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Status</div>
                      </div>

                      {/* Vertical Divider */}
                      <div className="w-px bg-white mx-4"></div>

                      {/* Right Column - Values */}
                      <div className="flex-1 space-y-3">
                        <div className="text-green-400 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                          {formatDate(selectedOrder.createdAt)}
                        </div>
                        <div className="text-blue-400 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                          {selectedOrder.orderId}
                        </div>
                        <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                          {selectedOrder.items[0]?.itemName || 'N/A'}
                        </div>
                        <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                          {selectedOrder.gameName || 'N/A'}
                        </div>
                        <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                          ₹{selectedOrder.amount} {selectedOrder.currency}
                        </div>
                        <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                          {selectedOrder.paymentMethod === 'upi' ? 'UPI' : selectedOrder.paymentMethod === 'wallet' ? 'Wallet' : selectedOrder.paymentMethod?.toUpperCase() || 'N/A'}
                        </div>
                        <div className="text-blue-400 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                          {descriptionData.playerId}
                        </div>
                        <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                          {descriptionData.server}
                        </div>
                        <div
                          className={`text-sm font-medium ${getStatusColor(selectedOrder.status)}`}
                          style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}
                        >
                          {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Wallet Transaction Details Popup */}
        {showWalletDetails && selectedWalletTransaction && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-50"
              style={{ background: '#000000cc' }}
              onClick={() => setShowWalletDetails(false)}
            />

            {/* Popup from Bottom */}
            <div className="fixed bottom-0 left-0 right-0 rounded-t-3xl z-50 max-h-[70vh] overflow-y-auto" style={{ animation: 'slideUp 0.3s ease-out', backgroundColor: 'rgb(35, 36, 38)' }}>
              {/* Top Color Effect */}
              <div
                className="sticky top-0 left-0 right-0 h-10 pointer-events-none z-10"
                style={{
                  background: 'linear-gradient(180deg, rgba(127, 140, 170, 0.3) 0%, transparent 100%)'
                }}
              />
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center mb-4">
                  <button
                    onClick={() => setShowWalletDetails(false)}
                    className="p-2 rounded-full"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="flex-1 text-center font-bold text-xl text-white">Transaction Details</h2>
                  <div className="w-10"></div>
                </div>

                {/* Transaction Details Box */}
                <div
                  className="p-4 rounded-lg mb-4"
                  style={{
                    background: 'linear-gradient(90deg, #7F8CAA 0%, #5C667C 100%)',
                    boxShadow: '0px 4px 4px 0px #00000040'
                  }}
                >
                  <div className="flex">
                    {/* Left Column - Labels */}
                    <div className="space-y-3" style={{ width: '120px' }}>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Transaction Date</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Transaction ID</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Type</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Description</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Amount</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Status</div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="w-px bg-white mx-4"></div>

                    {/* Right Column - Values */}
                    <div className="flex-1 space-y-3">
                      <div className="text-green-400 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                        {formatDate(selectedWalletTransaction.date)}
                      </div>
                      <div className="text-blue-400 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                        {selectedWalletTransaction.id}
                      </div>
                      <div
                        className={`text-sm font-medium ${selectedWalletTransaction.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}
                        style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}
                      >
                        {selectedWalletTransaction.type.charAt(0).toUpperCase() + selectedWalletTransaction.type.slice(1)}
                      </div>
                      <div className="text-white text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>
                        {selectedWalletTransaction.description}
                      </div>
                      <div
                        className={`text-sm font-medium ${selectedWalletTransaction.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}
                        style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}
                      >
                        {selectedWalletTransaction.type === 'credit' ? '+' : '-'}₹{selectedWalletTransaction.amount}
                      </div>
                      <div
                        className={`text-sm font-medium ${getStatusColor(selectedWalletTransaction.status)}`}
                        style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}
                      >
                        {selectedWalletTransaction.status.charAt(0).toUpperCase() + selectedWalletTransaction.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Payment Transaction Details Popup */}
        {showPaymentDetails && selectedPayment && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-50"
              style={{ background: '#000000cc' }}
              onClick={() => setShowPaymentDetails(false)}
            />

            {/* Popup from Bottom */}
            <div className="fixed bottom-0 left-0 right-0 rounded-t-3xl z-50 max-h-[70vh] overflow-y-auto" style={{ animation: 'slideUp 0.3s ease-out', backgroundColor: 'rgb(35, 36, 38)' }}>
              {/* Top Color Effect */}
              <div
                className="sticky top-0 left-0 right-0 h-10 pointer-events-none z-10"
                style={{
                  background: 'linear-gradient(180deg, rgba(127, 140, 170, 0.3) 0%, transparent 100%)'
                }}
              />
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center mb-4">
                  <button
                    onClick={() => setShowPaymentDetails(false)}
                    className="p-2 rounded-full"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="flex-1 text-center font-bold text-xl text-white">Payment Details</h2>
                  <div className="w-10"></div>
                </div>

                {/* Payment Details Box */}
                <div
                  className="p-4 rounded-lg mb-4"
                  style={{
                    background: 'linear-gradient(90deg, #7F8CAA 0%, #5C667C 100%)',
                    boxShadow: '0px 4px 4px 0px #00000040'
                  }}
                >
                  <div className="flex">
                    {/* Left Column - Labels */}
                    <div className="space-y-3" style={{ width: '120px' }}>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Payment Date</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Transaction ID</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Payment Method</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Description</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Amount</div>
                      <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Status</div>
                      {selectedPayment.orderId && (
                        <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Order ID</div>
                      )}
                      {selectedPayment.payerUpi && (
                        <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '100%', letterSpacing: '0%' }}>Payer UPI</div>
                      )}
                    </div>

                    {/* Vertical Divider */}
                    <div className="w-px bg-white mx-4"></div>

                    {/* Right Column - Values */}
                    <div className="flex-1 space-y-3">
                      <div className="text-green-400 text-sm break-words" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '120%', letterSpacing: '0%', wordBreak: 'break-word' }}>
                        {formatDate(selectedPayment.date)}
                      </div>
                      <div className="text-blue-400 text-sm break-words" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '120%', letterSpacing: '0%', wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                        {selectedPayment.transactionId}
                      </div>
                      <div className="text-white text-sm break-words" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '120%', letterSpacing: '0%', wordBreak: 'break-word' }}>
                        {selectedPayment.method}
                      </div>
                      <div className="text-white text-sm break-words" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '120%', letterSpacing: '0%', wordBreak: 'break-word' }}>
                        {selectedPayment.description}
                      </div>
                      <div className="text-white text-sm break-words" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '120%', letterSpacing: '0%', wordBreak: 'break-word' }}>
                        ₹{selectedPayment.amount} INR
                      </div>
                      <div
                        className={`text-sm font-medium break-words ${selectedPayment.status === 'success' ? 'text-green-400' : selectedPayment.status === 'pending' ? 'text-pink-400' : 'text-red-400'}`}
                        style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '120%', letterSpacing: '0%', wordBreak: 'break-word' }}
                      >
                        {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                      </div>
                      {selectedPayment.orderId && (
                        <div className="text-blue-400 text-sm break-words" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '120%', letterSpacing: '0%', wordBreak: 'break-word' }}>
                          {selectedPayment.orderId}
                        </div>
                      )}
                      {selectedPayment.payerUpi && (
                        <div className="text-white text-sm break-words" style={{ fontFamily: 'Poppins', fontWeight: 500, fontSize: '14px', lineHeight: '120%', letterSpacing: '0%', wordBreak: 'break-word' }}>
                          {selectedPayment.payerUpi}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <style jsx>{`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
