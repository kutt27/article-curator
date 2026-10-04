'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Bookmark, 
  Check, 
  Clock, 
  Calendar, 
  User, 
  Copy, 
  CheckCheck,
  Type
} from 'lucide-react';
import { FeedItem } from './ArticleCard';

interface ReaderModalProps {
  article: FeedItem | null;
  onClose: () => void;
  onToggleLike: (articleId: string, current: boolean) => void;
  onToggleRead: (articleId: string, current: boolean) => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({
  article,
  onClose,
  onToggleLike,
  onToggleRead,
}) => {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('normal');
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  const copyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Convert markdown-like content to rendered blocks
  const renderCleanContent = (rawText: string) => {
    if (!rawText) return <p className="text-ocean-400 italic">No content body available.</p>;

    // Split by code blocks or headings
    const parts = rawText.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeLines = part.slice(3, -3).trim().split('\n');
        let lang = '';
        let code = '';
        if (codeLines[0] && !codeLines[0].includes(' ') && codeLines[0].length < 15) {
          lang = codeLines[0];
          code = codeLines.slice(1).join('\n');
        } else {
          code = codeLines.join('\n');
        }

        return (
          <div key={index} className="my-6 rounded-xl border border-ocean-800 bg-ocean-950 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-2 bg-ocean-900/80 border-b border-ocean-800 text-xs text-white/80">
              <span className="font-mono text-white font-semibold uppercase">{lang || 'CODE'}</span>
              <button
                onClick={() => copyCode(code, index)}
                className="flex items-center gap-1 text-white hover:text-white/80 transition-colors"
              >
                {copiedCodeIdx === index ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs sm:text-sm font-mono text-ocean-100 overflow-x-auto leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Regular text block: split by paragraphs
      const paragraphs = part.split(/\n\n+/);
      return (
        <div key={index} className="space-y-4">
          {paragraphs.map((para, pIdx) => {
            const trimmed = para.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('# ')) {
              return (
                <h1 key={pIdx} className="text-2xl sm:text-3xl font-bold font-surfer text-white pt-4 pb-2 border-b border-ocean-800">
                  {trimmed.replace(/^#\s+/, '')}
                </h1>
              );
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={pIdx} className="text-xl sm:text-2xl font-bold font-surfer text-surf-200 pt-3 pb-1">
                  {trimmed.replace(/^##\s+/, '')}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={pIdx} className="text-lg font-bold text-white pt-2">
                  {trimmed.replace(/^###\s+/, '')}
                </h3>
              );
            }
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
              const listItems = trimmed.split(/\n[*\-]\s+/).filter(Boolean);
              return (
                <ul key={pIdx} className="list-disc list-inside space-y-1.5 pl-2 text-ocean-200">
                  {listItems.map((li, lIdx) => (
                    <li key={lIdx}>{li.replace(/^[*\-]\s+/, '')}</li>
                  ))}
                </ul>
              );
            }

            return (
              <p key={pIdx} className="text-ocean-200 leading-relaxed">
                {trimmed}
              </p>
            );
          })}
        </div>
      );
    });
  };

  const getBodyTextSizeClass = () => {
    switch (fontSize) {
      case 'large': return 'text-base sm:text-lg';
      case 'xl': return 'text-lg sm:text-xl';
      default: return 'text-sm sm:text-base';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ocean-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-ocean-900 border border-ocean-700/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-ocean-950/90 border-b border-ocean-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-ocean-900 border border-ocean-700 text-white text-xs font-semibold">
              {article.source}
            </span>
            <span className="text-xs text-white/80 font-mono">
              Signal: <strong className="text-white">{Math.round(article.decayed_score * 100)}%</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Font size toggle */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-ocean-900 border border-ocean-800 text-xs text-white">
              <Type className="w-3.5 h-3.5 mr-1 text-white" />
              <button
                onClick={() => setFontSize('normal')}
                className={`px-1.5 py-0.5 rounded ${fontSize === 'normal' ? 'bg-ocean-800 border border-white text-white' : 'hover:text-white'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-1.5 py-0.5 rounded font-semibold ${fontSize === 'large' ? 'bg-ocean-800 border border-white text-white' : 'hover:text-white'}`}
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xl')}
                className={`px-1.5 py-0.5 rounded font-bold ${fontSize === 'xl' ? 'bg-ocean-800 border border-white text-white' : 'hover:text-white'}`}
              >
                A++
              </button>
            </div>

            {/* Like */}
            <button
              onClick={() => onToggleLike(article.id, article.is_liked)}
              className={`p-2 rounded-lg border transition-all text-white ${
                article.is_liked
                  ? 'bg-ocean-800 border-white text-white'
                  : 'bg-ocean-900 hover:bg-ocean-800 border-ocean-700 text-white/80'
              }`}
              title="Bookmark / Like"
            >
              <Bookmark className={`w-4 h-4 text-white ${article.is_liked ? 'fill-current' : ''}`} />
            </button>

            {/* Read */}
            <button
              onClick={() => onToggleRead(article.id, article.is_read)}
              className={`p-2 rounded-lg border transition-all text-white ${
                article.is_read
                  ? 'bg-ocean-800 border-white text-white'
                  : 'bg-ocean-900 hover:bg-ocean-800 border-ocean-700 text-white/80'
              }`}
              title="Toggle Read"
            >
              <Check className="w-4 h-4 text-white" />
            </button>

            {/* External link */}
            <a
              href={article.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-ocean-900 hover:bg-ocean-800 border border-ocean-700 text-white hover:text-white transition-all"
              title="Open Original Page"
            >
              <ExternalLink className="w-4 h-4 text-white" />
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-ocean-900 hover:bg-ocean-800 border border-ocean-700 text-white transition-all ml-1"
              title="Close Reader (Esc)"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Reader Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 space-y-6">
          {/* Article Header */}
          <div className="space-y-3 pb-6 border-b border-ocean-800">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-surfer text-white tracking-wide leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-white/80 font-sans">
              <span className="flex items-center gap-1.5 text-white font-medium">
                <User className="w-3.5 h-3.5 text-white" />
                {article.author || article.source}
              </span>
              <span className="flex items-center gap-1.5 text-white/80">
                <Calendar className="w-3.5 h-3.5 text-white/60" />
                {new Date(article.published_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5 text-white/80">
                <Clock className="w-3.5 h-3.5 text-white/60" />
                {article.reading_time_minutes} min read
              </span>
            </div>

            {/* AI Summary Highlight Box */}
            <div className="p-4 rounded-xl bg-ocean-950 border border-ocean-800 text-xs sm:text-sm text-white leading-relaxed">
              <div className="font-semibold text-white font-surfer text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                CuratePulse Executive Summary
              </div>
              {article.summary}
            </div>
          </div>

          {/* Clean Body Content */}
          <div className={`prose prose-invert max-w-none text-white ${getBodyTextSizeClass()}`}>
            {renderCleanContent(article.content_cleaned)}
          </div>

          {/* Footer inside reader */}
          <div className="pt-8 pb-4 border-t border-ocean-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/80">
            <p className="text-white/80">Distraction-free extraction provided by CuratePulse parser.</p>
            <a
              href={article.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-white hover:text-white/80 underline underline-offset-4"
            >
              <span>Visit original publication</span>
              <ExternalLink className="w-3 h-3 text-white" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
