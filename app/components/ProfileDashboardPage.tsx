'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiEdit2 } from 'react-icons/fi';
import { useAppSelector } from '@/lib/hooks/redux';
import apiClient from '@/lib/api/axios';
import TopSection from './TopSection';

interface ProfileDashboardPageProps {
  onNavigate?: (screen: string) => void;
}

export default function ProfileDashboardPage({ onNavigate }: ProfileDashboardPageProps = {}) {
  const router = useRouter();
  const { isAuthenticated, token } = useAppSelector((state: any) => state.auth);
  const [userData, setUserData] = useState<{
    _id: string;
    name: string;
    email: string;
    phone: string;
    verified: boolean;
    walletBalance: number;
    role: string;
    profilePicture: string | null;
  } | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',

  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch data once authenticated; don't self-redirect (ProtectedRoute handles it)
    if (isAuthenticated && (token || typeof window === 'undefined' || localStorage.getItem('authToken'))) {
      fetchUserData();
    } else if (!isAuthenticated) {
      // Reset loading if not authenticated (ProtectedRoute will handle redirect)
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  const fetchUserData = async () => {
    try {
      if (!token) {
        if (onNavigate) {
          onNavigate('login');
        } else {
          router.push('/login');
        }
        return;
      }

      const response = await apiClient.get('/user/me');
      const userData = response.data;
      setUserData(userData);
      setFormData({
        fullName: userData.name,
        email: userData.email,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (onNavigate) {
        onNavigate('login');
      } else {
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) {
      // toast.error('Please select an image first');
      return;
    }

    setIsUploadingPicture(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        if (onNavigate) {
          onNavigate('login');
        } else {
          router.push('/login');
        }
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await apiClient.post('/user/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseData = response.data;
      // toast.success(responseData.message || 'Profile picture updated successfully!');

      // Reset image selection
      setSelectedImage(null);
      setImagePreview(null);

      // Refresh user data to show new picture
      fetchUserData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Network error. Please check your connection and try again.';
      // toast.error(errorMessage);
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleUpdate = async () => {
    // Validation - name is required
    if (!formData.fullName.trim()) {
      // toast.error('Please enter your name');
      return;
    }

    // No password updates on profile page

    setIsUpdating(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        if (onNavigate) {
          onNavigate('login');
        } else {
          router.push('/login');
        }
        return;
      }

      // Build request body
      const requestBody: any = {
        name: formData.fullName,
        email: formData.email,
      };

      const response = await apiClient.put('/user/profile', requestBody);
      const responseData = response.data;

      // toast.success(responseData.message || 'Profile updated successfully!');

      // Refresh user data
      fetchUserData();
    } catch (error) {
      // toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // If not authenticated, show login prompt
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden p-0 m-0 flex flex-col" style={{ backgroundColor: '#232426' }}>
        <div className="relative z-10">
          <TopSection showLogo={true} onNavigate={onNavigate} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
          <div className="w-24 h-24 bg-[#333844] rounded-full flex items-center justify-center mb-6 shadow-[0_8px_16px_rgba(0,0,0,0.2)]">
            <FiEdit2 className="w-10 h-10 text-[#7F8CAA]" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-3 text-center">Login Required</h2>
          <p className="text-gray-400 text-center mb-8 max-w-xs">
            Please login to view and manage your profile details, wallet balance, and settings.
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

  // Only show loading screen while fetching user data
  if (isLoading && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#232426' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden p-0 m-0 w-full" style={{ backgroundColor: '#232426' }}>
      {/* Top Section with Logo */}
      <div className="relative z-10">
        <TopSection showLogo={true} onNavigate={onNavigate} />
      </div>

      {/* Welcome Section */}
      <div className="px-4 md:px-6 lg:px-8 mb-6">
        <h1
          className="text-white font-bold text-xl sm:text-2xl"
          style={{ fontSize: '24px' }}
        >
          Welcome <span style={{ color: '#7F8CAA' }}>{userData?.name || 'User'}</span>
        </h1>
      </div>

      {/* User Profile Card */}
      <div className="px-4 md:px-6 lg:px-8 mb-6">
        <div
          className="p-6 rounded-2xl"
          style={{
            background: 'linear-gradient(180deg, #232426 0%, #454B57 100%)',
            boxShadow: '0px 4px 4px 0px #00000040'
          }}
        >
          {/* User Avatar and Info */}
          <div className="flex items-center mb-6">
            <div className="relative mr-4">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 overflow-hidden"
                style={{
                  backgroundColor: '#232426',
                  borderColor: 'white',
                  boxShadow: '0px 2px 7px 0px white'
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : userData?.profilePicture ? (
                  <>
                    <img
                      src={userData.profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Show initial on error
                        const container = e.currentTarget.parentElement;
                        if (container) {
                          const initialSpan = container.querySelector('.profile-initial');
                          if (initialSpan) {
                            (initialSpan as HTMLElement).style.display = 'block';
                          }
                        }
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span
                      className="text-white font-bold profile-initial"
                      style={{ fontSize: '20px', display: 'none' }}
                    >
                      {userData?.name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </>
                ) : (
                  <span
                    className="text-white font-bold"
                    style={{ fontSize: '20px' }}
                  >
                    {userData?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
                <label className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center cursor-pointer" style={{ backgroundColor: 'white' }}>
                  <FiEdit2 className="w-2.5 h-2.5" style={{ color: '#232426' }} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div>
              <h3
                className="text-white font-bold"
                style={{ fontSize: '16px' }}
              >
                {userData?.name || 'User'}
              </h3>
              <p className="text-gray-400 text-sm">+91 {userData?.phone || '123456789'}</p>
            </div>
          </div>

          {/* Show upload button when image is selected */}
          {selectedImage && (
            <div className="mb-4 flex flex-col items-center space-y-2">
              <img
                src={imagePreview!}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-white"
              />
              <button
                onClick={handleImageUpload}
                disabled={isUploadingPicture}
                className="text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#7F8CAA',
                  fontSize: '14px'
                }}
              >
                {isUploadingPicture ? 'UPLOADING...' : 'Upload Picture'}
              </button>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                className="text-gray-400 text-sm hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Input Fields (no password fields) */}
          <div className="space-y-4">
            <div>
              <label htmlFor="profile-fullname" className="text-white text-sm mb-2 block">Full name</label>
              <input
                type="text"
                id="profile-fullname"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-2 py-2 rounded-lg text-gray-400"
                style={{ backgroundColor: '#D9D9D9' }}
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="text-white text-sm mb-2 block">Email</label>
              <input
                type="email"
                id="profile-email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-2 py-2 rounded-lg text-gray-400"
                style={{ backgroundColor: '#D9D9D9' }}
              />
            </div>
          </div>

          {/* Update Button */}
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#232426',
                boxShadow: '0px 4px 4px 0px #00000040',
                padding: '10px 30px',
                borderRadius: '20px',
                fontSize: '16px',
                border: '1px solid #7F8CAA'
              }}
            >
              {isUpdating ? 'UPDATING...' : 'Update Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Combined Balance and Actions Card */}
      <div className="px-4 mb-8">
        <div
          className="p-2 rounded-2xl"
          style={{
            backgroundColor: 'rgb(54, 59, 72)',
            boxShadow: 'rgba(0, 0, 0, 0.25) 0px 4px 4px 0px'
          }}
        >
          {/* CRED Coins Balance Section */}
          <div
            className="flex items-center justify-between p-4 rounded-2xl mb-6"
            style={{
              background: 'linear-gradient(90deg, rgb(38, 39, 42) 0%, rgb(67, 72, 84) 100%)',
              boxShadow: 'rgba(0, 0, 0, 0.25) 0px 4px 4px 0px',
              border: '1px solid white'
            }}
          >
            <div className="flex items-center">
              <div className="mr-4">
                <Image
                  src="/coin.png"
                  alt="CRED Coins"
                  width={48}
                  height={48}
                  className="rounded-full"
                  style={{ color: 'transparent' }}
                />
              </div>
              <div>
                <p className="text-white text-sm">CRED Coins</p>
                <p
                  className="text-white font-bold"
                  style={{ fontSize: '16px' }}
                >
                  Available Balance
                </p>
              </div>
            </div>
            <div
              className="px-3 py-1 rounded-lg text-white text-sm"
              style={{
                backgroundColor: 'rgb(54, 59, 72)',
                border: '1px solid white',
                fontSize: '16px',
                fontWeight: 600
              }}
            >
              {userData?.walletBalance || 0} coins
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="grid grid-cols-3 gap-4">
            {/* Orders Button */}
            <div
              className="flex flex-col items-center cursor-pointer"
              onClick={() => onNavigate ? onNavigate('orders') : router.push('/orders')}
            >
              <div
                className="rounded-2xl flex items-center justify-center mb-2"
                style={{
                  background: 'linear-gradient(90deg, #7F8CAA 0%, #333844 100%)',
                  boxShadow: 'rgba(0, 0, 0, 0.2) 0px 4px 8px',
                  width: '90px',
                  height: '90px'
                }}
              >
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ height: '50px' }}
                >
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div
                className="rounded-full"
                style={{
                  backgroundColor: 'rgb(44, 44, 44)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 2px 4px',
                  marginTop: '-20px',
                  border: '1px solid white',
                  height: '25px',
                  width: '70px',
                  textAlign: 'center'
                }}
              >
                <span className="text-white text-sm">Orders</span>
              </div>
            </div>

            {/* Cart Button */}
            <div
              className="flex flex-col items-center cursor-pointer"
              onClick={() => onNavigate ? onNavigate('topup') : router.push('/')}
            >
              <div
                className="rounded-2xl flex items-center justify-center mb-2"
                style={{
                  background: 'linear-gradient(90deg, #7F8CAA 0%, #333844 100%)',
                  boxShadow: 'rgba(0, 0, 0, 0.2) 0px 4px 8px',
                  width: '90px',
                  height: '90px'
                }}
              >
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ height: '50px' }}
                >
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
              </div>
              <div
                className="rounded-full"
                style={{
                  backgroundColor: 'rgb(44, 44, 44)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 2px 4px',
                  marginTop: '-20px',
                  border: '1px solid white',
                  height: '25px',
                  width: '70px',
                  textAlign: 'center'
                }}
              >
                <span className="text-white text-sm">Cart</span>
              </div>
            </div>

            {/* Queries Button */}
            <div
              className="flex flex-col items-center cursor-pointer"
              onClick={() => onNavigate ? onNavigate('contact') : router.push('/contact')}
            >
              <div
                className="rounded-2xl flex items-center justify-center mb-2"
                style={{
                  background: 'linear-gradient(90deg, #7F8CAA 0%, #333844 100%)',
                  boxShadow: 'rgba(0, 0, 0, 0.2) 0px 4px 8px',
                  width: '90px',
                  height: '90px'
                }}
              >
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ height: '50px' }}
                >
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div
                className="rounded-full"
                style={{
                  backgroundColor: 'rgb(44, 44, 44)',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 2px 4px',
                  marginTop: '-20px',
                  border: '1px solid white',
                  height: '25px',
                  width: '70px',
                  textAlign: 'center'
                }}
              >
                <span className="text-white text-sm">Queries</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Spacing for Fixed Navigation */}
      <div className="h-15"></div>

      {/* Bottom Navigation */}
    </div>
  );
}
