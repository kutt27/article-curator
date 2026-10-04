'use client';

import React, { useState } from 'react';
import { 
  X, 
  Rss, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  ExternalLink,
  Loader2
} from 'lucide-react';

export interface SourceItem {
  id: string;
  site_name: string;
  feed_url: string;
  site_url: string;
  is_active: number;
  last_polled_at: string | null;
  post_count: number;
}

interface SourceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: SourceItem[];
  onAddSource: (url: string) => Promise<{ success: boolean; message?: string }>;
  onDeleteSource: (sourceId: string) => Promise<void>;
  onClearAllSources: () => Promise<void>;
  onPollSources: (sourceId?: string) => Promise<void>;
  isPolling: boolean;
}

export const SourceManagerModal: React.FC<SourceManagerModalProps> = ({
  isOpen,
  onClose,
  sources,
  onAddSource,
  onDeleteSource,
  onClearAllSources,
  onPollSources,
  isPolling,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    const result = await onAddSource(newUrl.trim());
    setIsSubmitting(false);

    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message || 'Source added successfully!' });
      setNewUrl('');
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({ type: 'error', text: result.message || 'Failed to auto-discover feed. Please verify the URL.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ocean-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-ocean-900 border border-ocean-700/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-ocean-950 border-b border-ocean-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ocean-800 border border-ocean-700 flex items-center justify-center text-white">
              <Rss className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-surfer text-white tracking-wide">
                Feed Source Management
              </h2>
              <p className="text-xs text-white/80">
                CuratePulse auto-discovers feeds from blog homepages or direct RSS/Atom links.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sources.length > 0 && (
              <button
                onClick={() => onClearAllSources()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ocean-800 hover:bg-red-950/70 border border-ocean-700 hover:border-red-600 text-xs font-medium text-white transition-all"
                title="Delete all sources and posts"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Clear All</span>
              </button>
            )}

            <button
              onClick={() => onPollSources()}
              disabled={isPolling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ocean-800 hover:bg-ocean-700 border border-ocean-700 text-xs font-medium text-white transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${isPolling ? 'animate-spin' : ''}`} />
              <span>Sync All</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-ocean-800 hover:bg-ocean-700 text-white transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add Source Input Form */}
          <div className="p-4 rounded-xl bg-ocean-950 border border-ocean-800 space-y-3">
            <div className="text-xs font-semibold text-white font-surfer tracking-wide uppercase">
              Add New Technical Blog or RSS Feed
            </div>
            <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-3 w-4 h-4 text-ocean-500" />
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="e.g. https://danluu.com or https://blog.cloudflare.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-ocean-900 border border-ocean-700 focus:border-surf-500 focus:ring-1 focus:ring-surf-500 text-white placeholder-ocean-500 text-sm outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !newUrl.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surf-600 hover:bg-surf-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-surf-600/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Discovering...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Source</span>
                  </>
                )}
              </button>
            </form>

            {statusMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/60 border border-red-800 text-red-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>

          {/* Sources List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span className="font-semibold text-white">Registered Sources ({sources.length})</span>
              <span>Sorted by publication name</span>
            </div>

            {sources.length === 0 ? (
              <p className="text-xs text-white/70 italic p-4 text-center">No sources configured yet.</p>
            ) : (
              <div className="grid gap-2.5">
                {sources.map((src) => (
                  <div
                    key={src.id}
                    className="p-3.5 rounded-xl bg-ocean-950/60 border border-ocean-800/80 hover:border-ocean-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white truncate font-surfer tracking-wide">
                          {src.site_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-ocean-900 border border-ocean-700 text-white text-[10px] font-mono">
                          {src.post_count} articles
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-white/80 mt-1 truncate">
                        <a
                          href={src.site_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white flex items-center gap-1 truncate text-white/90"
                        >
                          <span className="truncate">{src.site_url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-white" />
                        </a>
                        <span className="text-white/40">&bull;</span>
                        <span className="truncate text-white/60 font-mono text-[11px]">
                          {src.feed_url}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => onPollSources(src.id)}
                        disabled={isPolling}
                        title="Sync this feed now"
                        className="p-1.5 rounded-lg bg-ocean-900 hover:bg-ocean-800 border border-ocean-700 text-white transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-white ${isPolling ? 'animate-spin' : ''}`} />
                      </button>

                      <button
                        onClick={() => onDeleteSource(src.id)}
                        title="Delete source and remove articles"
                        className="p-1.5 rounded-lg bg-ocean-900 hover:bg-red-950/60 border border-ocean-700 hover:border-red-700 text-white hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
