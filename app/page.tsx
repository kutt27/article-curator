'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Inbox, 
  Bookmark, 
  CheckCircle, 
  Trash, 
  SlidersHorizontal,
  Flame,
  ArrowUpDown,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Header } from '@/components/Header';
import { DynamicInterestBar } from '@/components/DynamicInterestBar';
import { ArticleCard, FeedItem } from '@/components/ArticleCard';
import { ReaderModal } from '@/components/ReaderModal';
import { SourceManagerModal, SourceItem } from '@/components/SourceManagerModal';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';

export default function Home() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Filters & Parameters
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'liked' | 'dismissed'>('all');
  const [timeframe, setTimeframe] = useState<string>('30d');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('Low-latency backend engineering, Go concurrency, cache coherence, distributed systems, and database internals');
  const [currentLambda, setCurrentLambda] = useState<number>(0.35);

  // Keyboard navigation & selected card
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // Modals & Reader state
  const [activeReaderArticle, setActiveReaderArticle] = useState<FeedItem | null>(null);
  const [isSourcesOpen, setIsSourcesOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isUpdatingLens, setIsUpdatingLens] = useState<boolean>(false);

  // Fetch feed items
  const fetchFeed = useCallback(async (customPrompt?: string, customLambda?: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        timeframe,
        filter: activeFilter,
        limit: '50',
      });

      if (selectedSourceId) params.append('source_id', selectedSourceId);
      if (searchQuery) params.append('query', searchQuery);
      if (customLambda !== undefined) {
        params.append('lambda', customLambda.toString());
      } else {
        params.append('lambda', currentLambda.toString());
      }

      const res = await fetch(`/api/v1/feed?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalItems(data.total_items || 0);
        setUnreadCount(data.unread_count || 0);
        if (data.user_profile) {
          if (data.user_profile.interest_prompt && !customPrompt) {
            setCurrentPrompt(data.user_profile.interest_prompt);
          }
          if (data.user_profile.decay_weight !== undefined && customLambda === undefined) {
            setCurrentLambda(data.user_profile.decay_weight);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, activeFilter, selectedSourceId, searchQuery, currentLambda]);

  // Fetch sources list
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFeed();
    fetchSources();
  }, [fetchFeed, fetchSources]);

  // Handle Interest Lens Update
  const handleUpdateInterest = async (prompt: string, lambda: number) => {
    setIsUpdatingLens(true);
    setCurrentPrompt(prompt);
    setCurrentLambda(lambda);

    try {
      await fetch('/api/v1/profile/interests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest_prompt: prompt }),
      });

      await fetch('/api/v1/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decay_weight: lambda }),
      });

      // Refetch feed with the updated prompt & lambda
      await fetchFeed(prompt, lambda);
    } catch (err) {
      console.error('Failed to update interest prompt:', err);
    } finally {
      setIsUpdatingLens(false);
    }
  };

  // Poll Feeds
  const handlePollFeeds = async (sourceId?: string) => {
    setIsPolling(true);
    try {
      await fetch('/api/v1/sources/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, fetchFullPages: true }),
      });
      await fetchFeed();
      await fetchSources();
    } catch (err) {
      console.error('Failed to poll feeds:', err);
    } finally {
      setIsPolling(false);
    }
  };

  // Add Source
  const handleAddSource = async (url: string) => {
    try {
      const res = await fetch('/api/v1/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchSources();
        await fetchFeed();
        return { success: true, message: `Added "${data.site_name}" (${data.discovered_type.toUpperCase()} feed)` };
      } else {
        const err = await res.json();
        return { success: false, message: err.error || 'Failed to add source' };
      }
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  // Delete Source
  const handleDeleteSource = async (sourceId: string) => {
    try {
      const res = await fetch(`/api/v1/sources?id=${sourceId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchSources();
        await fetchFeed();
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  // Interactions (Like, Read, Dismiss)
  const handleToggleLike = async (postId: string, current: boolean) => {
    const action = current ? 'unlike' : 'like';
    setItems((prev) =>
      prev.map((item) => (item.id === postId ? { ...item, is_liked: !current } : item))
    );
    try {
      await fetch('/api/v1/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action }),
      });
    } catch (err) {
      console.error('Failed to update like status:', err);
    }
  };

  const handleToggleRead = async (postId: string, current: boolean) => {
    const action = current ? 'unread' : 'read';
    setItems((prev) =>
      prev.map((item) => (item.id === postId ? { ...item, is_read: !current } : item))
    );
    setUnreadCount((c) => (current ? c + 1 : Math.max(0, c - 1)));
    try {
      await fetch('/api/v1/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action }),
      });
    } catch (err) {
      console.error('Failed to update read status:', err);
    }
  };

  const handleDismiss = async (postId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== postId));
    try {
      await fetch('/api/v1/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'dismiss' }),
      });
    } catch (err) {
      console.error('Failed to dismiss article:', err);
    }
  };

  // Keyboard Navigation Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (e.key === 'j') {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(items.length - 1, prev + 1));
      } else if (e.key === 'k') {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'o' || e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIdx]) {
          setActiveReaderArticle(items[selectedIdx]);
        }
      } else if (e.key === 'b') {
        e.preventDefault();
        if (items[selectedIdx]) {
          handleToggleLike(items[selectedIdx].id, items[selectedIdx].is_liked);
        }
      } else if (e.key === 'm') {
        e.preventDefault();
        if (items[selectedIdx]) {
          handleToggleRead(items[selectedIdx].id, items[selectedIdx].is_read);
        }
      } else if (e.key === 'x') {
        e.preventDefault();
        if (items[selectedIdx]) {
          handleDismiss(items[selectedIdx].id);
        }
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('interest-prompt-input')?.focus();
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIdx]);

  return (
    <div className="min-h-screen flex flex-col bg-ocean-950 text-ocean-100 selection:bg-surf-500 selection:text-white">
      {/* App Header */}
      <Header
        onOpenSources={() => setIsSourcesOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onPollFeeds={() => handlePollFeeds()}
        isPolling={isPolling}
        totalArticles={totalItems}
        unreadCount={unreadCount}
      />

      {/* Hero Accent Bar */}
      <div className="relative border-b border-ocean-900 bg-gradient-to-r from-ocean-950 via-surf-950/30 to-ocean-950 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="font-surfer text-white font-semibold">Continuous Semantic Ingestion Active</span>
            <span className="text-white/40">&bull;</span>
            <span className="text-white/80">pgvector cosine + recency decay engine</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-white/80">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-ocean-900 border border-ocean-700 text-white">j</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-ocean-900 border border-ocean-700 text-white">k</kbd> to navigate</span>
            <span>&bull;</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-ocean-900 border border-ocean-700 text-white">o</kbd> to read</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Dynamic Interest Lens Bar */}
        <DynamicInterestBar
          currentPrompt={currentPrompt}
          currentLambda={currentLambda}
          onUpdateInterest={handleUpdateInterest}
          isUpdating={isUpdatingLens}
        />

        {/* Stream Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-ocean-900/60 border border-ocean-800">
          {/* Stream Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'all'
                  ? 'bg-ocean-800 text-white border border-white/40 shadow-sm'
                  : 'bg-ocean-950 text-white/80 hover:text-white hover:bg-ocean-850'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Ranked Stream</span>
            </button>

            <button
              onClick={() => setActiveFilter('unread')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'unread'
                  ? 'bg-ocean-800 text-white border border-white/40 shadow-sm'
                  : 'bg-ocean-950 text-white/80 hover:text-white hover:bg-ocean-850'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-ocean-800 text-white text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveFilter('liked')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'liked'
                  ? 'bg-ocean-800 text-white border border-white/40 shadow-sm'
                  : 'bg-ocean-950 text-white/80 hover:text-white hover:bg-ocean-850'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Bookmarked</span>
            </button>

            <button
              onClick={() => setActiveFilter('dismissed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeFilter === 'dismissed'
                  ? 'bg-ocean-800 text-white border border-white/40 shadow-sm'
                  : 'bg-ocean-950 text-white/80 hover:text-white hover:bg-ocean-850'
              }`}
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Dismissed</span>
            </button>
          </div>

          {/* Right Filters: Timeframe & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Source dropdown */}
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-ocean-950 border border-ocean-700 text-xs text-ocean-200 outline-none focus:border-surf-500 cursor-pointer"
            >
              <option value="">All Sources ({sources.length})</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.site_name}
                </option>
              ))}
            </select>

            {/* Timeframe */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-ocean-950 border border-ocean-700 text-xs text-ocean-200 outline-none focus:border-surf-500 cursor-pointer"
            >
              <option value="24h">Past 24 Hours</option>
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
              <option value="90d">Past 90 Days</option>
            </select>

            {/* Text Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-ocean-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stream..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-ocean-950 border border-ocean-700 text-xs text-white placeholder-ocean-500 outline-none focus:border-surf-500 w-36 sm:w-44 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Stream List Header */}
        <div className="flex items-center justify-between text-xs text-white/80 px-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white font-surfer text-sm tracking-wide">
              {activeFilter === 'unread' ? 'Unread Stream' : activeFilter === 'liked' ? 'Saved Highlights' : 'Personalized Feed'}
            </span>
            <span className="text-white/40">&bull;</span>
            <span className="text-white">{items.length} articles scored</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px] text-white">
            <ArrowUpDown className="w-3 h-3 text-white" />
            <span>Sorted by Blended Score (Cosine × Freshness)</span>
          </div>
        </div>

        {/* Articles Stream */}
        {isLoading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 rounded-2xl bg-ocean-900/40 border border-ocean-800 animate-pulse p-5">
                <div className="h-4 bg-ocean-800 rounded w-1/3 mb-4" />
                <div className="h-5 bg-ocean-800 rounded w-2/3 mb-3" />
                <div className="h-3 bg-ocean-800 rounded w-full mb-2" />
                <div className="h-3 bg-ocean-800 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-ocean-800 bg-ocean-950/40 p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-ocean-900 flex items-center justify-center text-white">
              <Inbox className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-base font-bold font-surfer text-white">No articles match your current lens or filter</h3>
            <p className="text-xs text-white/80 max-w-md mx-auto">
              Try broadening your Dynamic Interest prompt, changing the timeframe, or clicking &quot;Sync Feeds&quot; to fetch the latest technical posts.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setActiveFilter('all');
                  setSearchQuery('');
                  setSelectedSourceId('');
                }}
                className="px-4 py-2 rounded-xl bg-ocean-900 hover:bg-ocean-800 border border-ocean-700 text-xs text-white font-semibold transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {items.map((item, idx) => (
              <ArticleCard
                key={item.id}
                article={item}
                isSelected={idx === selectedIdx}
                onOpenReader={(art) => setActiveReaderArticle(art)}
                onToggleLike={handleToggleLike}
                onToggleRead={handleToggleRead}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-ocean-900 py-6 text-center text-xs text-white/80">
        <p className="font-surfer tracking-wider text-white">
          CuratePulse &bull; Intelligent Content Ingestion &amp; Semantic Reranker
        </p>
      </footer>

      {/* Distraction-Free Reader Modal */}
      <ReaderModal
        article={activeReaderArticle}
        onClose={() => setActiveReaderArticle(null)}
        onToggleLike={handleToggleLike}
        onToggleRead={handleToggleRead}
      />

      {/* Sources Manager Modal */}
      <SourceManagerModal
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
        sources={sources}
        onAddSource={handleAddSource}
        onDeleteSource={handleDeleteSource}
        onPollSources={handlePollFeeds}
        isPolling={isPolling}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
