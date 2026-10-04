'use client';

import React, { useState } from 'react';
import { 
  Bookmark, 
  Check, 
  Eye, 
  X, 
  Clock, 
  ExternalLink, 
  Info,
  Calendar,
  Sparkles,
  User
} from 'lucide-react';

export interface FeedItem {
  id: string;
  title: string;
  source: string;
  source_id: string;
  canonical_url: string;
  author: string;
  published_at: string;
  relevance_score: number;
  decay_multiplier: number;
  decayed_score: number;
  age_in_hours: number;
  summary: string;
  reading_time_minutes: number;
  tags: string[];
  content_cleaned: string;
  is_read: boolean;
  is_liked: boolean;
  is_dismissed: boolean;
}

interface ArticleCardProps {
  article: FeedItem;
  isSelected: boolean;
  onOpenReader: (article: FeedItem) => void;
  onToggleLike: (articleId: string, current: boolean) => void;
  onToggleRead: (articleId: string, current: boolean) => void;
  onDismiss: (articleId: string) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  isSelected,
  onOpenReader,
  onToggleLike,
  onToggleRead,
  onDismiss,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Score percentage display (0 to 100)
  const scorePercent = Math.min(100, Math.round(article.decayed_score * 100));
  const rawPercent = Math.min(100, Math.round(article.relevance_score * 100));

  // Determine badge color gradient based on score
  let scoreBadgeBg = 'bg-slate-800 text-white border-slate-700';
  let badgeRingColor = 'border-slate-600';
  if (scorePercent >= 75) {
    scoreBadgeBg = 'bg-surf-950/90 text-white border-surf-500 shadow-surf-500/20 shadow-md';
    badgeRingColor = 'border-surf-400';
  } else if (scorePercent >= 50) {
    scoreBadgeBg = 'bg-sky-950/90 text-white border-sky-600';
    badgeRingColor = 'border-sky-500';
  } else if (scorePercent >= 30) {
    scoreBadgeBg = 'bg-amber-950/90 text-white border-amber-700';
    badgeRingColor = 'border-amber-600';
  }

  // Format relative publish time
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        isSelected
          ? 'bg-ocean-900 border-white ring-2 ring-white/30 shadow-xl shadow-surf-950/50'
          : article.is_read
          ? 'bg-ocean-950/60 border-ocean-800/60 opacity-80 hover:opacity-100 hover:border-ocean-700 hover:bg-ocean-900/40'
          : 'bg-ocean-900/70 border-ocean-800 hover:border-ocean-700 hover:bg-ocean-900/90 shadow-md hover:shadow-lg'
      }`}
    >
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
        {/* Left Score Meter */}
        <div className="sm:self-start shrink-0 flex sm:flex-col items-center justify-between sm:justify-center gap-2">
          <div
            className="relative cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div
              className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition-transform group-hover:scale-105 ${scoreBadgeBg} ${badgeRingColor}`}
            >
              <span className="font-surfer text-xl font-bold leading-none tracking-tight text-white">
                {scorePercent}%
              </span>
              <span className="text-[9px] uppercase tracking-wider font-semibold opacity-90 mt-0.5 text-white">
                Signal
              </span>
            </div>

            {/* Hover Tooltip Breakdown */}
            {showTooltip && (
              <div className="absolute left-0 sm:left-16 top-16 sm:top-0 z-40 w-64 p-3 bg-ocean-950 border border-ocean-700 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md text-white">
                <div className="font-semibold text-white font-surfer flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  Score Calculation Breakdown
                </div>
                <div className="flex justify-between text-white">
                  <span>Cosine Semantic Match:</span>
                  <strong className="text-white font-mono">{rawPercent}%</strong>
                </div>
                <div className="flex justify-between text-white">
                  <span>Recency Decay Factor:</span>
                  <strong className="text-white font-mono">{(article.decay_multiplier * 100).toFixed(0)}%</strong>
                </div>
                <div className="flex justify-between text-white">
                  <span>Publication Age:</span>
                  <strong className="text-white font-mono">{article.age_in_hours} hours</strong>
                </div>
                <div className="pt-1.5 border-t border-ocean-800 flex justify-between font-semibold">
                  <span className="text-white">Final Decayed Score:</span>
                  <span className="text-white font-mono">{article.decayed_score}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex sm:flex-col items-center gap-1 text-[11px] text-white/80 font-mono">
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3 text-white/70" />
              {article.reading_time_minutes}m read
            </span>
          </div>
        </div>

        {/* Center / Body Section */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Meta Row: Source, Author, Date */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs text-white/80">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-ocean-800/90 text-white font-semibold border border-ocean-700">
                {article.source}
              </span>

              {article.author && article.author !== article.source && (
                <span className="flex items-center gap-1 text-white">
                  <User className="w-3 h-3 text-white/60" />
                  {article.author}
                </span>
              )}

              <span className="text-white/40">&bull;</span>

              <span className="flex items-center gap-1 text-white/80">
                <Calendar className="w-3 h-3 text-white/60" />
                {formatTime(article.published_at)}
              </span>

              {article.is_read && (
                <span className="px-1.5 py-0.2 rounded bg-ocean-800 text-white text-[10px] font-mono">
                  READ
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              onClick={() => onOpenReader(article)}
              className="text-base sm:text-lg font-bold text-white hover:text-white cursor-pointer transition-colors leading-snug tracking-tight"
            >
              {article.title}
            </h3>

            {/* Semantic Summary */}
            <p className="mt-2 text-xs sm:text-sm text-white leading-relaxed line-clamp-3">
              {article.summary}
            </p>
          </div>

          {/* Tags and Action Bar */}
          <div className="mt-3.5 pt-3 border-t border-ocean-800/50 flex flex-wrap items-center justify-between gap-2">
            {/* Topic Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-ocean-950/80 text-white hover:text-white border border-ocean-800/80 text-[11px] font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 text-white">
              {/* Bookmark / Like Button */}
              <button
                onClick={() => onToggleLike(article.id, article.is_liked)}
                title={article.is_liked ? 'Bookmarked / Liked' : 'Bookmark / Upvote'}
                className={`p-1.5 rounded-lg border transition-all ${
                  article.is_liked
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-ocean-950 hover:bg-ocean-800 border-ocean-800 text-ocean-400 hover:text-ocean-200'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${article.is_liked ? 'fill-current' : ''}`} />
              </button>

              {/* Mark Read Toggle */}
              <button
                onClick={() => onToggleRead(article.id, article.is_read)}
                title={article.is_read ? 'Mark as Unread' : 'Mark as Read'}
                className={`p-1.5 rounded-lg border transition-all ${
                  article.is_read
                    ? 'bg-surf-500/20 border-surf-500/40 text-surf-400'
                    : 'bg-ocean-950 hover:bg-ocean-800 border-ocean-800 text-ocean-400 hover:text-ocean-200'
                }`}
              >
                <Check className="w-4 h-4" />
              </button>

              {/* Dismiss / Hide */}
              <button
                onClick={() => onDismiss(article.id)}
                title="Dismiss / Hide from stream"
                className="p-1.5 rounded-lg bg-ocean-950 hover:bg-red-950/40 border border-ocean-800 hover:border-red-800 text-ocean-400 hover:text-red-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Open in Distraction-Free Reader */}
              <button
                onClick={() => onOpenReader(article)}
                title="Open in Distraction-Free Reader"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surf-600 hover:bg-surf-500 text-white font-medium text-xs shadow-sm transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Read</span>
              </button>

              {/* External Canonical Link */}
              <a
                href={article.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open original website"
                className="p-1.5 rounded-lg bg-ocean-950 hover:bg-ocean-800 border border-ocean-800 text-ocean-400 hover:text-ocean-200 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
