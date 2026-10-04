'use client';

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'j', desc: 'Navigate to next article down' },
    { key: 'k', desc: 'Navigate to previous article up' },
    { key: 'o / Enter', desc: 'Open selected article in distraction-free reader' },
    { key: 'b', desc: 'Toggle bookmark / like for selected article' },
    { key: 'm', desc: 'Toggle read / unread for selected article' },
    { key: 'x', desc: 'Dismiss / hide selected article from stream' },
    { key: '/', desc: 'Focus dynamic interest lens search prompt' },
    { key: '?', desc: 'Open this keyboard shortcuts cheat sheet' },
    { key: 'Esc', desc: 'Close any open modal or reader view' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ocean-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-ocean-900 border border-ocean-700 rounded-2xl shadow-2xl overflow-hidden p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-ocean-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-white" />
            <h3 className="font-bold text-lg font-surfer text-white">Keyboard Navigation</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-ocean-800 text-white transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1">
              <span className="text-white">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-ocean-950 border border-ocean-700 font-mono text-white font-semibold shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-ocean-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-ocean-800 hover:bg-ocean-700 text-xs font-semibold text-white transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
