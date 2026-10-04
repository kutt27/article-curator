'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, Clock } from 'lucide-react';

interface DynamicInterestBarProps {
  currentPrompt: string;
  currentLambda: number;
  onUpdateInterest: (prompt: string, lambda: number) => Promise<void>;
  isUpdating: boolean;
}

const PRESETS = [
  {
    name: 'Distributed Systems & Raft',
    prompt: 'Distributed systems, Raft and Paxos consensus, partition tolerance, replicated state machines, and high write throughput',
  },
  {
    name: 'Go & Low-Latency Concurrency',
    prompt: 'Low-latency backend engineering, Go concurrency, channels, lock-free ring buffers, cache line false sharing, and zero-allocation parsing',
  },
  {
    name: 'Storage Engines & LSM Trees',
    prompt: 'Database internals, Log-Structured Merge LSM trees, SSTables, Bloom filters, compaction algorithms, and NVMe write amplification',
  },
  {
    name: 'eBPF & Kernel Networking',
    prompt: 'Linux kernel internals, eBPF tracing, XDP packet filtering, TCP/UDP sockets, zero-copy networking, and DDoS mitigation',
  },
  {
    name: 'ML Infra & LLM Serving',
    prompt: 'ML systems, GPU memory bandwidth, CUDA kernels, vLLM inference serving, vector embeddings, and distributed training clusters',
  },
];

export const DynamicInterestBar: React.FC<DynamicInterestBarProps> = ({
  currentPrompt,
  currentLambda,
  onUpdateInterest,
  isUpdating,
}) => {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [lambda, setLambda] = useState(currentLambda);
  const [isSaved, setIsSaved] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  useEffect(() => {
    setPrompt(currentPrompt);
  }, [currentPrompt]);

  useEffect(() => {
    setLambda(currentLambda);
  }, [currentLambda]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    await onUpdateInterest(prompt.trim(), lambda);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePresetClick = (presetPrompt: string) => {
    setPrompt(presetPrompt);
    onUpdateInterest(presetPrompt, lambda);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleLambdaChange = (newVal: number) => {
    setLambda(newVal);
    onUpdateInterest(prompt, newVal);
  };

  return (
    <div className="bg-ocean-900/90 border border-ocean-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        {/* Title and Top Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-surfer text-white tracking-wide flex items-center gap-2">
                Dynamic Interest Lens
                <span className="text-xs font-normal text-white bg-ocean-800/80 border border-ocean-700 px-2 py-0.5 rounded-full font-sans">
                  Real-time Vector Reranking
                </span>
              </h2>
              <p className="text-xs text-white/80">
                Define what you want to learn right now in natural language. Articles rerank instantly.
              </p>
            </div>
          </div>

          {/* Formula Toggle */}
          <button
            type="button"
            onClick={() => setShowFormula(!showFormula)}
            className="text-xs text-white hover:text-white/80 flex items-center font-mono transition-colors"
          >
            <span>{showFormula ? 'Hide Scoring Math' : 'View Scoring Formula'}</span>
          </button>
        </div>

        {/* Formula Explainer (collapsible) */}
        {showFormula && (
          <div className="p-3.5 rounded-xl bg-ocean-950/80 border border-ocean-800 text-xs text-white font-mono space-y-1">
            <div className="text-white font-semibold flex items-center gap-2">
              <span>Formula:</span>
              <code className="text-white bg-ocean-900 px-2 py-0.5 rounded border border-ocean-700">
                Score = CosineSim(V_user, V_post) × (1 / (Age_hours + 2))^λ
              </code>
            </div>
            <p className="text-white/80 font-sans text-xs">
              V_user is vector embedded from your prompt below. V_post is embedded from article title + summary. Freshness decay parameter λ={lambda.toFixed(2)} controls the balance between timeless relevance and breaking news.
            </p>
          </div>
        )}

        {/* Prompt Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <textarea
              id="interest-prompt-input"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Low-latency backend engineering, Go concurrency, cache coherence, database internals, and eBPF..."
              className="w-full px-4 py-2.5 rounded-xl bg-ocean-950 border border-ocean-700/80 focus:border-surf-500 focus:ring-1 focus:ring-surf-500 text-white placeholder-ocean-500 text-sm resize-none transition-all outline-none font-sans"
            />
          </div>

          <div className="flex sm:flex-col justify-end gap-2 shrink-0">
            <button
              type="submit"
              disabled={isUpdating}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-md ${
                isSaved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-surf-600 to-teal-500 hover:from-surf-500 hover:to-teal-400 text-white shadow-surf-600/20 hover:scale-[1.02] active:scale-[0.98]'
              } disabled:opacity-60`}
            >
              {isSaved ? (
                <span>Reranked!</span>
              ) : (
                <span>{isUpdating ? 'Embedding...' : 'Apply Lens'}</span>
              )}
            </button>
          </div>
        </form>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-white/80 font-medium mr-1">Presets:</span>
          {PRESETS.map((p) => {
            const isActive = prompt.trim() === p.prompt.trim();
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => handlePresetClick(p.prompt)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isActive
                    ? 'bg-ocean-800 border-white text-white font-semibold shadow-sm'
                    : 'bg-ocean-950 hover:bg-ocean-800 border-ocean-800 text-white/80 hover:text-white'
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        {/* Lambda Decay Slider */}
        <div className="pt-2 border-t border-ocean-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white">
            <Sliders className="w-4 h-4 text-white" />
            <span className="font-semibold text-white">Freshness Decay (λ):</span>
            <span className="px-2 py-0.5 rounded bg-ocean-950 font-mono text-white border border-ocean-700">
              {lambda.toFixed(2)}
            </span>
            <span className="text-white/70 text-[11px]">
              {lambda <= 0.15
                ? '(Relevance focused)'
                : lambda <= 0.45
                ? '(Balanced default)'
                : '(Freshness priority)'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-64">
            <span className="text-[10px] text-white/80 uppercase tracking-wider font-semibold">Semantic</span>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={lambda}
              onChange={(e) => handleLambdaChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-ocean-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <span className="text-[10px] text-white/80 uppercase tracking-wider font-semibold flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> Recent
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
