'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppSelector } from '@/lib/hooks/redux';
import apiClient from '@/lib/api/axios';
import TopSection from './TopSection';

interface LeaderboardPlayer {
  _id: string;
  totalPurchaseAmount: number;
  purchaseCount: number;
  name: string;
  email: string;
  avatar?: string | null;
}

interface WalletAdder {
  _id: string;
  totalWalletAdded: number;
  walletAddCount: number;
  name: string;
  email: string;
  avatar?: string | null;
}

interface PeriodData {
  period: string;
  leaderboard: LeaderboardPlayer[];
  walletAdders: WalletAdder[];
}

interface LeaderboardData {
  currentPeriod: PeriodData;
  lastPeriod: PeriodData;
  filters: {
    eventDate: null;
    startDate: null;
    endDate: null;
  };
}

interface LeaderboardPageProps {
  onNavigate?: (screen: string) => void;
}

export default function LeaderboardPage({ onNavigate }: LeaderboardPageProps = {}) {
  const router = useRouter();
  const { isAuthenticated, token } = useAppSelector((state) => state.auth);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(!isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'last'>('current');

  useEffect(() => {
    // Only fetch data once authenticated; don't self-redirect (ProtectedRoute handles it)
    if (isAuthenticated && (token || typeof window === 'undefined' || localStorage.getItem('authToken'))) {
      fetchLeaderboardData();
    }
  }, [isAuthenticated, token]);

  // Update loading state when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(false);
    } else if (!isAuthenticated) {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchLeaderboardData = async () => {
    try {
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const response = await apiClient.get('/user/leaderboard');
      const data = response.data;
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPeriod = leaderboardData?.currentPeriod;
  const lastPeriod = leaderboardData?.lastPeriod;
  const activePeriod = activeTab === 'current' ? currentPeriod : lastPeriod;

  // Get top 3 players from leaderboard
  const topThreePlayers = activePeriod?.leaderboard?.slice(0, 3) || [];

  // Get remaining players (ranks 4-10) from leaderboard
  const rankedPlayers = activePeriod?.leaderboard?.slice(3, 10) || [];

  // Only show loading screen if user is authenticated and data is loading
  if (isLoading && isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden p-0 m-0" style={{ backgroundColor: '#232426' }}>
        <div className="relative z-10">
          <TopSection showLogo={true} onNavigate={onNavigate} />
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, show login prompt
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden p-0 m-0 flex flex-col" style={{ backgroundColor: '#232426' }}>
        <div className="relative z-10">
          <TopSection showLogo={true} onNavigate={onNavigate} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
          <div className="w-24 h-24 bg-[#333844] rounded-full flex items-center justify-center mb-6 shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
            <svg className="w-12 h-12 text-[#7F8CAA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-white text-2xl font-bold mb-3 text-center">Login Required</h2>
          <p className="text-gray-400 text-center mb-8 max-w-xs">
            Please login to see global rankings, top buyers, and where you stand on the leaderboard.
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

  const getAvatarOrPlaceholder = (avatar: string | null | undefined, name: string, medalColor?: string) => {
    const borderColor = medalColor || '#7F8CAA';

    if (avatar) {
      return (
        <Image
          src={avatar}
          alt={name}
          width={80}
          height={80}
          className="rounded-full w-20 h-20 object-cover"
          style={{
            border: `3px solid ${borderColor}`,
            boxShadow: `0 0 15px ${medalColor ? medalColor + '40' : 'rgba(127, 140, 170, 0.25)'}`
          }}
        />
      );
    }
    return (
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          border: `3px solid ${borderColor}`,
          background: `linear-gradient(135deg, ${borderColor} 0%, ${borderColor}80 100%)`,
          boxShadow: `0 0 15px ${medalColor ? medalColor + '40' : 'rgba(127, 140, 170, 0.25)'}`
        }}
      >
        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden p-0 m-0" style={{ backgroundColor: '#232426' }}>
      {/* Desktop Container */}
      <div className="w-full">
        {/* Top Section with Logo */}
        <div className="relative z-10">
          <TopSection showLogo={true} onNavigate={onNavigate} />
        </div>

        {/* Page Title and Period Tabs */}
        <div className="px-4 md:px-6 lg:px-8 mb-8">
          <h1 className="text-white font-bold text-2xl sm:text-3xl mb-4">Leaderboards</h1>

          {/* Period Tabs */}
          <div className="flex gap-3 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('current')}
              className={`pb-3 px-4 font-semibold transition-all ${activeTab === 'current'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              {currentPeriod?.period || 'Current Period'}
            </button>
            <button
              onClick={() => setActiveTab('last')}
              className={`pb-3 px-4 font-semibold transition-all ${activeTab === 'last'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              {lastPeriod?.period || 'Last Period'}
            </button>
          </div>
        </div>

        {/* Top 3 Players */}
        <div className="px-4 md:px-6 lg:px-8 mb-12">
          <div className="flex justify-center items-end space-x-4 sm:space-x-6">
            {/* Rank #2 - Silver */}
            <div className="flex flex-col items-center">
              <div className="text-gray-300 font-bold mb-3 text-lg sm:text-xl tracking-wide">🥈 #2</div>
              <div className="relative">
                {getAvatarOrPlaceholder(topThreePlayers[1]?.avatar, topThreePlayers[1]?.name || 'Player', '#E8E8E8')}
                <div className="text-white mt-4 text-center font-semibold text-sm sm:text-base truncate max-w-24">
                  {topThreePlayers[1]?.name || '—'}
                </div>
                <div
                  className="mt-3 px-4 py-1.5 rounded-full text-white text-xs sm:text-sm font-bold"
                  style={{
                    backgroundColor: 'rgba(232, 232, 232, 0.1)',
                    border: '1.5px solid #E8E8E8',
                    boxShadow: '0 0 8px rgba(232, 232, 232, 0.2)',
                    textAlign: 'center'
                  }}
                >
                  ₹{topThreePlayers[1]?.totalPurchaseAmount?.toLocaleString() || '0'}
                </div>
                <div
                  className="mx-auto mt-3"
                  style={{
                    height: '70px',
                    width: '3px',
                    background: 'linear-gradient(to bottom, #E8E8E8, #E8E8E820)',
                    borderRadius: '2px'
                  }}
                ></div>
              </div>
            </div>

            {/* Rank #1 - Gold (Winner) */}
            <div className="flex flex-col items-center transform scale-105">
              <div className="text-yellow-300 font-bold mb-3 text-2xl sm:text-3xl animate-pulse">🥇 #1</div>
              <div className="relative">
                <div
                  className="absolute -inset-3 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)',
                    zIndex: -1,
                  }}
                ></div>
                {getAvatarOrPlaceholder(topThreePlayers[0]?.avatar, topThreePlayers[0]?.name || 'Player', '#FFD700')}
                <div className="text-white mt-4 text-center font-bold text-sm sm:text-base truncate max-w-24">
                  {topThreePlayers[0]?.name || '—'}
                </div>
                <div
                  className="mt-3 px-4 py-1.5 rounded-full text-white text-xs sm:text-sm font-bold"
                  style={{
                    backgroundColor: 'rgba(255, 215, 0, 0.15)',
                    border: '1.5px solid #FFD700',
                    boxShadow: '0 0 12px rgba(255, 215, 0, 0.4)',
                    textAlign: 'center'
                  }}
                >
                  ₹{topThreePlayers[0]?.totalPurchaseAmount?.toLocaleString() || '0'}
                </div>
                <div
                  className="mx-auto mt-3"
                  style={{
                    height: '90px',
                    width: '3px',
                    background: 'linear-gradient(to bottom, #FFD700, #FFD70020)',
                    borderRadius: '2px'
                  }}
                ></div>
              </div>
            </div>

            {/* Rank #3 - Bronze */}
            <div className="flex flex-col items-center">
              <div className="text-amber-600 font-bold mb-3 text-lg sm:text-xl tracking-wide">🥉 #3</div>
              <div className="relative">
                {getAvatarOrPlaceholder(topThreePlayers[2]?.avatar, topThreePlayers[2]?.name || 'Player', '#CD7F32')}
                <div className="text-white mt-4 text-center font-semibold text-sm sm:text-base truncate max-w-24">
                  {topThreePlayers[2]?.name || '—'}
                </div>
                <div
                  className="mt-3 px-4 py-1.5 rounded-full text-white text-xs sm:text-sm font-bold"
                  style={{
                    backgroundColor: 'rgba(205, 127, 50, 0.1)',
                    border: '1.5px solid #CD7F32',
                    boxShadow: '0 0 8px rgba(205, 127, 50, 0.2)',
                    textAlign: 'center'
                  }}
                >
                  ₹{topThreePlayers[2]?.totalPurchaseAmount?.toLocaleString() || '0'}
                </div>
                <div
                  className="mx-auto mt-3"
                  style={{
                    height: '50px',
                    width: '3px',
                    background: 'linear-gradient(to bottom, #CD7F32, #CD7F3220)',
                    borderRadius: '2px'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Ranked List */}
        <div className="px-4 md:px-6 lg:px-8 mb-32">
          <h2 className="text-white font-bold text-xl mb-6">Top Rankings</h2>
          <div className="space-y-2.5">
            {rankedPlayers.map((player, index) => (
              <div
                key={player._id}
                className="flex items-center justify-between p-3.5 rounded-xl cursor-pointer hover:shadow-md transition-all duration-200 hover:translate-x-1"
                style={{
                  background: 'linear-gradient(135deg, rgba(127, 140, 170, 0.15) 0%, rgba(90, 108, 143, 0.08) 100%)',
                  border: '1px solid rgba(127, 140, 170, 0.25)',
                  backdropFilter: 'blur(10px)'
                }}
                onClick={() => onNavigate ? onNavigate('profile') : router.push('/profile')}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="text-white font-bold text-base min-w-8 text-center"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: '#A0AEC0'
                    }}
                  >
                    #{index + 4}
                  </span>

                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #7F8CAA 0%, #5A6C8F 100%)',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    {player.avatar ? (
                      <Image
                        src={player.avatar}
                        alt={player.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover"
                      />
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  <span
                    className="text-white text-sm font-semibold truncate"
                    style={{
                      fontFamily: 'Poppins',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    {player.name}
                  </span>
                </div>

                <div className="flex-shrink-0 ml-2">
                  <div
                    className="px-3 py-1 rounded-lg text-white text-xs font-bold whitespace-nowrap"
                    style={{
                      backgroundColor: 'rgba(127, 140, 170, 0.2)',
                      border: '1px solid rgba(127, 140, 170, 0.35)',
                      fontFamily: 'Poppins',
                      fontWeight: 600,
                    }}
                  >
                    ₹{player.totalPurchaseAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation */}
      </div>
    </div>
  );
}
