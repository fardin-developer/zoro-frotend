'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/lib/hooks/redux';
import apiClient from '@/lib/api/axios';
import TopSection from './TopSection';
import {
  FaNewspaper,
  FaFilter,
  FaTimes,
  FaCalendarAlt,
  FaUser,
  FaTag,
  FaFire,
  FaBullhorn,
  FaInfoCircle,
  FaWrench,
  FaStar
} from 'react-icons/fa';

// --- Interfaces ---

interface Author {
  _id: string;
  name: string;
  email: string;
}

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  summary: string;
  image?: string;
  category: 'general' | 'announcement' | 'update' | 'maintenance' | 'promotion';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  tags: string[];
  author: Author;
  expiresAt: string;
  isPinned: boolean;
  viewCount: number;
  contentType: 'html' | 'text';
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

interface NewsResponse {
  success: boolean;
  message: string;
  data: {
    news: NewsItem[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalNews: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
    filters?: {
      search: string;
    };
    stats?: {
      totalNews: number;
      publishedNews: number;
      draftNews: number;
      archivedNews: number;
      pinnedNews: number;
      urgentNews: number;
    }
  };
}

interface NewsPageProps {
  onNavigate?: (screen: string) => void;
}

// --- Icons & Helpers ---

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'announcement': return <FaBullhorn className="text-blue-400" />;
    case 'update': return <FaInfoCircle className="text-green-400" />;
    case 'maintenance': return <FaWrench className="text-orange-400" />;
    case 'promotion': return <FaStar className="text-purple-400" />;
    default: return <FaNewspaper className="text-gray-400" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'announcement': return 'bg-blue-500/20 text-gray-800 border-blue-500/30';
    case 'update': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'maintenance': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'promotion': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

// --- Components ---

export default function NewsPage({ onNavigate }: NewsPageProps = {}) {
  const router = useRouter();
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/news/list?page=1&limit=50');
      const data: NewsResponse = response.data;
      if (data.success && data.data && data.data.news) {
        setNewsData(data.data.news);
      }
    } catch (error: any) {
      console.error('Error fetching news:', error);
      setError('Failed to load news');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNews = useMemo(() => {
    return newsData.filter(item => {
      const categoryMatch = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
      const priorityMatch = selectedPriority === 'all' || item.priority.toLowerCase() === selectedPriority.toLowerCase();
      return categoryMatch && priorityMatch;
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [newsData, selectedCategory, selectedPriority]);

  const categories = ['All', 'General', 'Announcement', 'Update', 'Maintenance', 'Promotion'];
  const priorities = ['All', 'Low', 'Medium', 'High', 'Urgent'];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div className="min-h-screen bg-[#141517] font-sans selection:bg-indigo-500/30">
      {/* Top Section */}
      <div className="sticky top-0 z-40 bg-[#141517]/80 backdrop-blur-md border-b border-white/5">
        <TopSection showLogo={true} onNavigate={onNavigate} />

        {/* Header & Filter Bar */}
        <div className="px-4 md:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <FaNewspaper />
                </span>
                Newsroom
              </h1>
              <p className="text-gray-400 text-sm mt-1 max-w-lg">
                Stay updated with the latest announcements, maintenance schedules, and exclusive promotions.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {/* Category Filter */}
            <div className="flex bg-[#1E2023] p-1 rounded-xl border border-white/5 w-max">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat.toLowerCase())}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${selectedCategory === cat.toLowerCase()
                    ? 'bg-[#2A2D31] text-white shadow-sm ring-1 ring-white/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Priority Filter (Optional/Secondary) */}
            <div className="flex items-center gap-2 px-3 py-1 bg-[#1E2023] rounded-xl border border-white/5 w-max">
              <FaFilter className="text-gray-500 text-xs" />
              <span className="text-xs text-gray-400 font-medium mr-1">Priority:</span>
              {priorities.map((prio) => (
                <button
                  key={prio}
                  onClick={() => setSelectedPriority(prio.toLowerCase())}
                  className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-colors ${selectedPriority === prio.toLowerCase()
                    ? 'text-indigo-400 bg-indigo-500/10'
                    : 'text-gray-600 hover:text-gray-400'
                    }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 md:px-8 py-6 pb-32 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-[#1E2023] rounded-2xl h-80 animate-pulse border border-white/5">
                <div className="h-40 bg-white/5 rounded-t-2xl mb-4"></div>
                <div className="px-5 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-4 bg-white/10 rounded w-1/2"></div>
                  <div className="h-16 bg-white/5 rounded w-full mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[#1E2023] rounded-full flex items-center justify-center mb-4">
              <FaNewspaper className="text-gray-600 text-3xl" />
            </div>
            <h3 className="text-white text-lg font-medium">No news found</h3>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters used above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {filteredNews.map((item) => (
              <div
                key={item._id}
                onClick={() => setSelectedNews(item)}
                className="bg-[#1E2023]/80 backdrop-blur-sm group border border-white/5 hover:border-indigo-500/30 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 flex flex-col"
              >
                {/* Image Header */}
                <div className="relative h-48 w-full bg-[#2A2D31] overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.currentTarget.parentElement as HTMLElement).classList.add('flex', 'items-center', 'justify-center');
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#23252a] to-[#1a1c20]">
                      <FaNewspaper className="text-white/5 text-6xl transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                    </div>
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider backdrop-blur-md border ${getCategoryColor(item.category)} shadow-lg`}>
                      {item.category}
                    </span>
                    {item.priority !== 'low' && (
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider backdrop-blur-md border ${getPriorityColor(item.priority)} shadow-lg`}>
                        {item.priority}
                      </span>
                    )}
                  </div>

                  {item.isPinned && (
                    <div className="absolute top-3 right-3 bg-yellow-500 text-black p-1.5 rounded-full shadow-lg shadow-yellow-500/20 z-10">
                      <div className="bg-yellow-400 p-1 rounded-full">
                        <span className="sr-only">Pinned</span>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2L3 9v9a1 1 0 001 1h12a1 1 0 001-1V9l-7-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1.5">
                      <FaCalendarAlt className="text-gray-600" />
                      {formatDate(item.createdAt)}
                    </span>
                    {item.author && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                        <span className="flex items-center gap-1.5 truncate max-w-[100px]">
                          <FaUser className="text-gray-600" />
                          {item.author.name}
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="text-gray-400 text-sm line-clamp-3 mb-4 leading-relaxed flex-1">
                    {item.summary || "No summary available."}
                  </p>

                  <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between">
                    <div className="flex gap-2">
                      {item.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-indigo-400 text-xs font-semibold group-hover:underline">Read More →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Details */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedNews(null)}>
          <div
            className="bg-[#1E2023] w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Image */}
            <div className="relative h-48 sm:h-64 bg-[#2A2D31] shrink-0">
              {selectedNews.image ? (
                <img src={selectedNews.image} alt={selectedNews.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#23252a] to-[#141517]">
                  <FaNewspaper className="text-white/10 text-6xl" />
                </div>
              )}
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-colors border border-white/10"
              >
                <FaTimes />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1E2023] to-transparent h-24"></div>
              <div className="absolute bottom-4 left-6 right-6">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${getCategoryColor(selectedNews.category)}`}>
                    {selectedNews.category}
                  </span>
                  {selectedNews.priority !== 'low' && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${getPriorityColor(selectedNews.priority)}`}>
                      {selectedNews.priority}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white leading-tight shadow-black drop-shadow-lg pr-4">
                  {selectedNews.title}
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-6 pb-4 border-b border-white/5">
                <span className="flex items-center gap-2">
                  <FaCalendarAlt className="text-indigo-400" />
                  {formatDate(selectedNews.createdAt)}
                </span>
                {selectedNews.author && (
                  <span className="flex items-center gap-2">
                    <FaUser className="text-indigo-400" />
                    {selectedNews.author.name}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <FaTag className="text-indigo-400" />
                  {selectedNews.tags.join(', ') || 'News'}
                </span>
              </div>

              {/* Content Render */}
              <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-gray-300">
                {selectedNews.contentType === 'html' ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: selectedNews.content }}
                    className="news-content-html space-y-4 leading-relaxed"
                  />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{selectedNews.content}</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#141517] border-t border-white/5 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedNews(null)}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-medium text-sm border border-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

