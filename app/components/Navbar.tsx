'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { MdPerson, MdLogout } from 'react-icons/md';
import { useAppSelector, useAppDispatch } from '@/lib/hooks/redux';
import { logout } from '@/lib/store/authSlice';
import AddBalanceModal from './AddBalanceModal';

interface NavbarProps {
    onMenuToggle: () => void;
    onNavigate?: (screen: string) => void;
    walletBalance?: number;
}

const NAV_THEME = {
    primary: '#E7121B',
    primaryDark: '#C21011',
    surface: '#FFFFFF',
    surfaceSoft: '#EFEBF0',
    text: '#010102',
};

export default function Navbar({ onMenuToggle, onNavigate, walletBalance }: NavbarProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const menuRef = useRef<HTMLDivElement>(null);

    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isAddBalanceModalOpen, setIsAddBalanceModalOpen] = useState(false);
    const [imgError, setImgError] = useState(false);

    // Get wallet balance from Redux user state, fallback to prop, then to 0
    const displayWalletBalance = user?.walletBalance ?? walletBalance ?? 0;

    // Click-outside listener to close profile menu
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleProfileClick = () => {
        setIsProfileMenuOpen(false);
        if (onNavigate) {
            onNavigate('profile');
        } else {
            router.push('/profile');
        }
    };

    return (
        <>
            <nav
                className="mx-4 md:mx-6 lg:mx-8 relative z-50 mt-4 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
                style={
                    {
                        '--nav-primary': NAV_THEME.primary,
                        '--nav-primary-dark': NAV_THEME.primaryDark,
                        '--nav-surface': NAV_THEME.surface,
                        '--nav-surface-soft': NAV_THEME.surfaceSoft,
                        '--nav-text': NAV_THEME.text,
                    } as Record<string, string>
                }
            >
                <div className="flex items-center justify-between">
                    {/* Left: Menu and Logo */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onMenuToggle}
                            className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex flex-col justify-center px-1.5 gap-1 hover:bg-white/30 transition-colors shadow-sm"
                            aria-label="Open menu"
                        >
                            <div className="w-full h-0.5 bg-white rounded"></div>
                            <div className="w-full h-0.5 bg-white rounded"></div>
                            <div className="w-full h-0.5 bg-white rounded"></div>
                        </button>

                        <div className="flex-shrink-0 ml-1 bg-white/20 p-1 rounded-xl border border-white/30 backdrop-blur-sm shadow-inner">
                            <Image
                                src="/logo.png"
                                alt="Logo"
                                width={40}
                                height={40}
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    {/* Right: Wallet & Profile */}
                    <div className="flex items-center gap-5">
                        {/* Wallet Balance - Only for authenticated users */}
                        {isAuthenticated && (
                            <button
                                onClick={() => setIsAddBalanceModalOpen(true)}
                                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 bg-white/20 border border-white/30 hover:bg-white/30 transition-colors shadow-sm backdrop-blur-sm"
                            >
                                <Image src="/coin.png" alt="Coin" width={18} height={18} />
                                <span className="font-bold text-white text-xs tracking-wide">{displayWalletBalance} +</span>
                            </button>
                        )}

                        {/* Profile Menu */}
                        {isAuthenticated ? (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    className={`w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center cursor-pointer overflow-hidden shadow-sm transition-all hover:bg-white/30 hover:shadow-md active:scale-95 border border-white/30 ${isProfileMenuOpen ? 'ring-2 ring-white/50' : ''
                                        }`}
                                    aria-label="Profile menu"
                                >
                                    {user?.profilePicture && !imgError ? (
                                        <Image
                                            src={user.profilePicture}
                                            alt="Profile"
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                            onError={() => setImgError(true)}
                                        />
                                    ) : (
                                        <FaUserCircle className="text-white text-2xl" />
                                    )}
                                </button>

                                {/* Profile Dropdown */}
                                {isProfileMenuOpen && (
                                    <div className="absolute top-[46px] right-0 w-52 bg-[var(--nav-surface)] border border-[var(--nav-primary)]/20 rounded-lg shadow-2xl z-[9999] overflow-hidden">
                                        {/* User Info Header */}
                                        <div className="px-3 py-2.5 border-b border-[var(--nav-primary)]/15 bg-[var(--nav-surface-soft)]">
                                            <p className="text-[var(--nav-text)] text-sm font-semibold truncate">{user?.name || 'User'}</p>
                                            <p className="text-[var(--nav-text)]/60 text-xs truncate mt-0.5">{user?.email || 'Guest User'}</p>
                                        </div>

                                        {/* Profile Link */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleProfileClick();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[var(--nav-text)] hover:bg-[var(--nav-surface-soft)] transition-colors text-sm"
                                        >
                                            <MdPerson className="text-lg text-[var(--nav-primary)]" />
                                            <span>My Profile</span>
                                        </button>

                                        {/* Logout */}
                                        <button
                                            onClick={() => {
                                                dispatch(logout());
                                                localStorage.removeItem('authToken');
                                                window.location.reload();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[var(--nav-primary-dark)] hover:bg-[var(--nav-surface-soft)] transition-colors border-t border-[var(--nav-primary)]/15 text-sm font-medium"
                                        >
                                            <MdLogout className="text-lg" />
                                            <span>Log Out</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => router.push('/login')}
                                className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors shadow-sm border border-white/30 backdrop-blur-sm"
                                aria-label="Login"
                            >
                                <MdPerson className="text-xl text-white" />
                            </button>
                        )}
                    </div>
                </div>
            </nav>
            <AddBalanceModal
                isOpen={isAddBalanceModalOpen}
                onClose={() => setIsAddBalanceModalOpen(false)}
                currentBalance={displayWalletBalance}
            />
        </>
    );
}
