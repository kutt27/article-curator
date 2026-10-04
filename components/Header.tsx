'use client';

import React from 'react';
import { Rss, RefreshCw, Keyboard } from 'lucide-react';

interface HeaderProps {
  onOpenSources: () => void;
  onOpenShortcuts: () => void;
  onPollFeeds: () => void;
  isPolling: boolean;
  totalArticles: number;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSources,
  onOpenShortcuts,
  onPollFeeds,
  isPolling,
  totalArticles,
  unreadCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-ocean-800/80 bg-ocean-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-surfer tracking-wide text-white">
                CuratePulse
              </h1>
            </div>
            <p className="text-xs text-white/80 hidden sm:block">
              Ride the high-signal wave &bull; Strip noise &bull; Curate engineering feeds
            </p>
          </div>
        </div>

        {/* Quick Stats & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ocean-900/80 border border-ocean-800 text-xs text-white">
            <span>Articles: <strong className="text-white font-semibold">{totalArticles}</strong></span>
            <span className="text-white/40">&bull;</span>
            <span>Unread: <strong className="text-white font-semibold">{unreadCount}</strong></span>
          </div>

          <button
            onClick={onPollFeeds}
            disabled={isPolling}
            title="Poll registered RSS/Atom feeds now"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ocean-900 hover:bg-ocean-800 border border-ocean-700 text-ocean-200 hover:text-white transition-all text-xs sm:text-sm font-medium disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 text-white ${isPolling ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isPolling ? 'Polling...' : 'Sync Feeds'}</span>
          </button>

          <button
            onClick={onOpenSources}
            title="Manage RSS / Atom Blog Sources"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surf-600 hover:bg-surf-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-surf-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Rss className="w-4 h-4" />
            <span>Sources</span>
          </button>

          <button
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (?)"
            className="p-2 rounded-lg bg-ocean-900 hover:bg-ocean-800 border border-ocean-700 text-ocean-400 hover:text-ocean-200 transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
