'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MdClose } from 'react-icons/md';
import apiClient from '@/lib/api/axios';
import { useAppSelector } from '@/lib/hooks/redux';

interface AddBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance?: number;
}

export default function AddBalanceModal({ isOpen, onClose, currentBalance = 0 }: AddBalanceModalProps) {
    const router = useRouter();
    const { token, isAuthenticated } = useAppSelector((state) => state.auth);
    const [selectedAmount, setSelectedAmount] = useState<string>('');
    const [customAmount, setCustomAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number>(currentBalance);
    const [isVisible, setIsVisible] = useState(false);

    // Sync internal balance with prop
    useEffect(() => {
        setWalletBalance(currentBalance);
    }, [currentBalance]);

    // Handle animation states
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Match transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Fetch latest balance when modal opens
    useEffect(() => {
        if (isOpen && isAuthenticated) {
            const fetchBalance = async () => {
                try {
                    const authToken = token || localStorage.getItem('authToken');
                    if (!authToken) return;
                    const response = await apiClient.get('/user/me');
                    const data = response.data;
                    if (typeof data.walletBalance === 'number') {
                        setWalletBalance(data.walletBalance);
                    }
                } catch {
                    // silent error
                }
            };
            fetchBalance();
        }
    }, [isOpen, isAuthenticated, token]);

    const coinPacks = [
        { amount: '250' },
        { amount: '500' },
        { amount: '1000' },
        { amount: '1500' },
        { amount: '2000' },
        { amount: '2500' }
    ];

    const handleCoinPackSelect = (amount: string) => {
        setSelectedAmount(amount);
        setCustomAmount(amount);
    };

    const handleCustomAmountChange = (value: string) => {
        setCustomAmount(value);
        setSelectedAmount('');
    };

    const handlePayment = async () => {
        const amount = selectedAmount || customAmount;

        if (!amount.trim()) return;

        const amountNumber = parseInt(amount);
        if (isNaN(amountNumber) || amountNumber < 1) return;

        setIsProcessing(true);

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken || !isAuthenticated) {
                onClose();
                router.push('/login');
                return;
            }

            const response = await apiClient.post('/wallet/add', {
                amount: amountNumber,
                redirectUrl: typeof window !== 'undefined'
                    ? `${window.location.origin}/payment-status`
                    : 'https://credszone.com/payment-status'
            });

            const responseData = response.data;
            if (responseData.success && responseData.transaction?.paymentUrl) {
                window.location.href = responseData.transaction.paymentUrl;
            }
        } catch (error) {
            console.error('Payment error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Don't render anything if not visible (for animation exit)
    if (!isVisible && !isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full max-w-lg bg-[#232426] rounded-t-3xl sm:rounded-2xl shadow-2xl transform transition-transform duration-300 ease-out flex flex-col max-h-[90vh] overflow-hidden ${isOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[#3a3c3f]">
                    <h3 className="text-white font-bold text-lg">Add Balance</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-[#3a3c3f] flex items-center justify-center text-white hover:bg-[#4a4c4f] transition-colors"
                    >
                        <MdClose size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-5 overflow-y-auto custom-scrollbar">
                    {/* Current Balance Card */}
                    <div
                        className="flex items-center justify-between p-4 rounded-xl mb-6 relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(90deg, #7F8CAA 0%, #5C667C 100%)',
                            boxShadow: '0px 4px 4px 0px #00000040'
                        }}
                    >
                        {/* Background decoration */}
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/5 skew-x-12 transform translate-x-8" />

                        <div className="flex items-center relative z-10">
                            <div className="mr-3 bg-black/20 p-2 rounded-full">
                                <Image
                                    src="/coin.png"
                                    alt="Coins"
                                    width={32}
                                    height={32}
                                    className="rounded-full"
                                />
                            </div>
                            <div>
                                <p className="text-white/80 text-xs font-medium">Available Balance</p>
                                <p className="text-white font-bold text-xl">{walletBalance}</p>
                            </div>
                        </div>

                        <div className="text-white text-xs font-medium bg-black/20 px-2 py-1 rounded relative z-10">
                            CREDS
                        </div>
                    </div>

                    {/* Coin Packs */}
                    <div className="mb-6">
                        <h4 className="text-white font-semibold mb-3 text-sm">Select Amount</h4>
                        <div className="grid grid-cols-3 gap-3">
                            {coinPacks.map((pack, index) => (
                                <button
                                    key={index}
                                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all border ${selectedAmount === pack.amount
                                        ? 'bg-[#7F8CAA]/20 border-[#7F8CAA]'
                                        : 'bg-[#2a2c2f] border-[#3a3c3f] hover:border-[#5C667C]'
                                        }`}
                                    onClick={() => handleCoinPackSelect(pack.amount)}
                                >
                                    <span className="text-white font-bold text-lg">{pack.amount}</span>
                                    <span className="text-xs text-gray-400 mt-1">Coins</span>
                                    {selectedAmount === pack.amount && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#7F8CAA]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Amount */}
                    <div className="mb-6">
                        <h4 className="text-white font-semibold mb-3 text-sm">Or Enter Custom Amount</h4>
                        <div className="relative">
                            <input
                                type="number"
                                value={customAmount}
                                onChange={(e) => handleCustomAmountChange(e.target.value)}
                                placeholder="Ex: 5000"
                                className="w-full pl-4 pr-12 py-3 bg-[#2a2c2f] border border-[#3a3c3f] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#7F8CAA] transition-colors"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 bg-[#3a3c3f] px-2 py-1 rounded">
                                COINS
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 ml-1">
                            Minimum amount is 1 coin
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-[#3a3c3f] bg-[#2a2c2f]/50">
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing || !customAmount || parseInt(customAmount) < 1}
                        className="w-full py-3.5 rounded-xl bg-[#7F8CAA] text-white font-bold text-base shadow-lg hover:bg-[#6c7891] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            'Pay Online'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
