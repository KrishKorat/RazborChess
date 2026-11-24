import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  Play, 
  Square, 
  Zap,
  Filter,
  Info,
  UserCheck
} from 'lucide-react';
import { GameReviewReport, GameReviewStep, MoveClassification, GameMetadata, PieceColor, CURRENT_REVIEW_SCHEMA_VERSION } from '../types/chess';
import { ReviewProgress } from '../services/review/gameReviewService';
import { getPerformanceTier } from '../services/review/moveClassifier';
import { DetailedMovePanel } from './DetailedMovePanel';

export interface GameReviewDashboardProps {
  report: GameReviewReport | null;
  progress: ReviewProgress | null;
  isReviewing: boolean;
  metadata: GameMetadata;
  currentPly: number;
  totalPlies: number;
  onStartReview: (depth: number, forceFresh?: boolean) => void;
  onCancelReview: () => void;
  onSelectMove: (ply: number) => void;
  isPreviewingBestMove?: boolean;
  onPreviewBestMove?: (step: GameReviewStep) => void;
  onExitPreview?: () => void;
}

export const CLASSIFICATION_CONFIG: Record<
  MoveClassification, 
  { label: string; symbol: string; color: string; bgColor: string; borderColor: string; description: string; badgeBg?: string; badgeText?: string; badgeBorder?: string }
> = {
  brilliant: {
    label: 'Brilliant',
    symbol: '!!',
    color: 'text-[#2DD4BF]',
    bgColor: 'bg-[#0F766E]/25',
    borderColor: 'border-[#2DD4BF]/50',
    badgeBg: 'bg-[#0F766E]/25',
    badgeText: 'text-[#2DD4BF]',
    badgeBorder: 'border-[#2DD4BF]/50',
    description: 'A winning move involving a sound piece sacrifice.',
  },
  great: {
    label: 'Great',
    symbol: '!',
    color: 'text-[#60A5FA]',
    bgColor: 'bg-[#1D4ED8]/25',
    borderColor: 'border-[#60A5FA]/50',
    badgeBg: 'bg-[#1D4ED8]/25',
    badgeText: 'text-[#60A5FA]',
    badgeBorder: 'border-[#60A5FA]/50',
    description: 'The optimal move found in a critical or contested position.',
  },
  best: {
    label: 'Best',
    symbol: '★',
    color: 'text-[#4ADE80]',
    bgColor: 'bg-[#15803D]/25',
    borderColor: 'border-[#4ADE80]/50',
    badgeBg: 'bg-[#15803D]/25',
    badgeText: 'text-[#4ADE80]',
    badgeBorder: 'border-[#4ADE80]/50',
    description: 'The engine top choice continuation.',
  },
  forced: {
    label: 'Forced',
    symbol: '⚡',
    color: 'text-[#93C5FD]',
    bgColor: 'bg-[#1E3A8A]/35',
    borderColor: 'border-[#60A5FA]/50',
    badgeBg: 'bg-[#1E3A8A]/35',
    badgeText: 'text-[#93C5FD]',
    badgeBorder: 'border-[#60A5FA]/50',
    description: 'The only legal move available in this position.',
  },
  excellent: {
    label: 'Excellent',
    symbol: '✓',
    color: 'text-[#A3E635]',
    bgColor: 'bg-[#3F6212]/25',
    borderColor: 'border-[#A3E635]/50',
    badgeBg: 'bg-[#3F6212]/25',
    badgeText: 'text-[#A3E635]',
    badgeBorder: 'border-[#A3E635]/50',
    description: 'Very strong move nearly matching engine top choice.',
  },
  good: {
    label: 'Good',
    symbol: '•',
    color: 'text-[#CBD5E1]',
    bgColor: 'bg-[#334155]/50',
    borderColor: 'border-[#64748B]/50',
    badgeBg: 'bg-[#334155]/50',
    badgeText: 'text-[#CBD5E1]',
    badgeBorder: 'border-[#64748B]/50',
    description: 'Decent practical move keeping position solid.',
  },
  inaccuracy: {
    label: 'Inaccuracy',
    symbol: '?!',
    color: 'text-[#FBBF24]',
    bgColor: 'bg-[#78350F]/30',
    borderColor: 'border-[#FBBF24]/50',
    badgeBg: 'bg-[#78350F]/30',
    badgeText: 'text-[#FBBF24]',
    badgeBorder: 'border-[#FBBF24]/50',
    description: 'A slight mistake weakening your advantage (50-120 cp).',
  },
  mistake: {
    label: 'Mistake',
    symbol: '?',
    color: 'text-[#FB923C]',
    bgColor: 'bg-[#7C2D12]/30',
    borderColor: 'border-[#FB923C]/50',
    badgeBg: 'bg-[#7C2D12]/30',
    badgeText: 'text-[#FB923C]',
    badgeBorder: 'border-[#FB923C]/50',
    description: 'A bad move yielding substantial advantage (120-250 cp).',
  },
  blunder: {
    label: 'Blunder',
    symbol: '??',
    color: 'text-[#F87171]',
    bgColor: 'bg-[#7F1D1D]/30',
    borderColor: 'border-[#F87171]/50',
    badgeBg: 'bg-[#7F1D1D]/30',
    badgeText: 'text-[#F87171]',
    badgeBorder: 'border-[#F87171]/50',
    description: 'A critical blunder throwing away material or win (>250 cp).',
  },
  missed_win: {
    label: 'Missed Win',
    symbol: '✕',
    color: 'text-[#F472B6]',
    bgColor: 'bg-[#831843]/30',
    borderColor: 'border-[#F472B6]/50',
    badgeBg: 'bg-[#831843]/30',
    badgeText: 'text-[#F472B6]',
    badgeBorder: 'border-[#F472B6]/50',
    description: 'A move that squandered a completely winning position.',
  },
  book: {
    label: 'Book',
    symbol: '📖',
    color: 'text-[#D4A373]',
    bgColor: 'bg-[#785434]/30',
    borderColor: 'border-[#D4A373]/50',
    badgeBg: 'bg-[#785434]/30',
    badgeText: 'text-[#D4A373]',
    badgeBorder: 'border-[#D4A373]/50',
    description: 'Standard opening book theory move.',
  },
};

export const GameReviewDashboard: React.FC<GameReviewDashboardProps> = ({
  report,
  progress,
  isReviewing,
  metadata,
  currentPly,
  totalPlies,
  onStartReview,
  onCancelReview,
  onSelectMove,
  isPreviewingBestMove = false,
  onPreviewBestMove,
  onExitPreview,
}) => {
  const [selectedDepth, setSelectedDepth] = useState<number>(14);
  const [forceFresh, setForceFresh] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'key' | 'white' | 'black'>('all');
  const [categoryFilter, setCategoryFilter] = useState<MoveClassification | null>(null);
  const [showEloDisclaimer, setShowEloDisclaimer] = useState<boolean>(false);
  const selectedMoveRef = useRef<HTMLButtonElement>(null);
  const moveListContainerRef = useRef<HTMLDivElement>(null);

  // Dynamically determine default user perspective from metadata:
  // e.g. KeiFrost playing Black => 'b', White => 'w'
  const detectedUserColor: PieceColor = React.useMemo(() => {
    if (metadata?.black && metadata.black.toLowerCase().includes('keifrost')) return 'b';
    if (metadata?.white && metadata.white.toLowerCase().includes('keifrost')) return 'w';
    return 'w';
  }, [metadata]);

  const [userPerspective, setUserPerspective] = useState<PieceColor>(detectedUserColor);

  useEffect(() => {
    setUserPerspective(detectedUserColor);
  }, [detectedUserColor]);

  // Selected step based on current board ply
  const selectedStep = React.useMemo(() => {
    if (!report || report.moves.length === 0) return null;
    const found = report.moves.find((m) => m.ply === currentPly);
    return found || report.moves[0];
  }, [report, currentPly]);

  // Stable inner scroll to selected move without scrolling the window or outer dashboard
  useEffect(() => {
    if (moveListContainerRef.current && selectedMoveRef.current) {
      const container = moveListContainerRef.current;
      const el = selectedMoveRef.current;
      const top = el.offsetTop - container.offsetTop;
      const targetTop = Math.max(0, top - 36);
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          top: targetTop,
          behavior: 'smooth',
        });
      } else {
        container.scrollTop = targetTop;
      }
    }
  }, [currentPly]);

  // Filtered review moves
  const filteredMoves = React.useMemo(() => {
    if (!report) return [];
    return report.moves.filter((step) => {
      if (categoryFilter && step.classification !== categoryFilter) {
        return false;
      }
      if (activeFilter === 'white') return step.color === 'w';
      if (activeFilter === 'black') return step.color === 'b';
      if (activeFilter === 'key') {
        return (
          step.classification === 'blunder' ||
          step.classification === 'mistake' ||
          step.classification === 'inaccuracy' ||
          step.classification === 'missed_win' ||
          step.classification === 'brilliant' ||
          step.classification === 'great' ||
          step.classification === 'forced'
        );
      }
      return true;
    });
  }, [report, activeFilter, categoryFilter]);

  return (
    <div className="flex flex-col h-full space-y-4 text-xs text-[#F3EFFB] overflow-y-auto pr-1">
      {/* 1. Header & Controls */}
      <div className="bg-[#292440] p-4 sm:p-5 rounded-2xl border border-[#443B60] space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#B7A5E8]" />
            <h3 className="font-bold text-[#F3EFFB] text-sm sm:text-base tracking-wide">Game Review</h3>
          </div>
          <span className="text-xs text-[#B8AFD1] font-mono">
            {totalPlies} {totalPlies === 1 ? 'ply' : 'plies'} played
          </span>
        </div>

        {/* Progress or Start Button */}
        {isReviewing ? (
          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#F3EFFB] font-semibold animate-pulse flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#B7A5E8] fill-[#B7A5E8]" />
                Analyzing {progress?.currentMoveSan ? `"${progress.currentMoveSan}"` : 'position'}...
              </span>
              <span className="font-mono text-[#B7A5E8] font-bold">
                {progress?.currentStep || 0} / {progress?.totalSteps || totalPlies} ({progress?.percentage || 0}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#201D35] h-2.5 rounded-full overflow-hidden border border-[#443B60]">
              <div 
                className="bg-[#B7A5E8] h-full transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress?.percentage || 0}%` }}
              />
            </div>

            <button
              onClick={onCancelReview}
              className="w-full py-2 px-3 bg-[#d3503c]/20 hover:bg-[#d3503c]/30 text-[#F3EFFB] border border-[#d3503c]/40 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Cancel Review</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-[#B8AFD1] font-semibold tracking-wide">Analysis Depth:</span>
              <div className="flex gap-1.5">
                {[
                  { depth: 12, label: 'Fast (12)' },
                  { depth: 14, label: 'Standard (14)' },
                  { depth: 16, label: 'Deep (16)' },
                  { depth: 18, label: 'Master (18)' },
                ].map((d) => (
                  <button
                    key={d.depth}
                    onClick={() => setSelectedDepth(d.depth)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold tracking-wide border transition ${
                      selectedDepth === d.depth
                        ? 'bg-[#B7A5E8] text-[#171525] border-[#B7A5E8] shadow-xs'
                        : 'bg-[#201D35] text-[#B8AFD1] border-[#443B60] hover:bg-[#332D4D] hover:text-[#F3EFFB]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fresh Analysis Option */}
            <div className="flex items-center justify-between text-xs text-[#B8AFD1] pt-0.5">
              <span>Fresh Analysis:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[#F3EFFB] hover:text-[#B7A5E8]">
                <input
                  type="checkbox"
                  checked={forceFresh}
                  onChange={(e) => setForceFresh(e.target.checked)}
                  className="rounded border-[#443B60] text-[#B7A5E8] accent-[#B7A5E8] cursor-pointer"
                />
                <span className="text-xs">Bypass cached evaluations</span>
              </label>
            </div>

            <button
              onClick={() => onStartReview(selectedDepth, forceFresh)}
              disabled={totalPlies === 0}
              className="w-full py-2.5 px-4 bg-[#B7A5E8] hover:bg-[#C4B5FD] disabled:bg-[#201D35] disabled:text-[#8C81A8] text-[#171525] rounded-xl text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition shadow-xs border border-[#B7A5E8]/50 active:scale-[0.99]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{report ? 'Re-Analyze Game' : 'Start Game Review'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Legacy Review Warning */}
      {report && report.schemaVersion !== CURRENT_REVIEW_SCHEMA_VERSION && (
        <div className="bg-amber-950/40 border border-amber-700/50 p-3 rounded-xl text-amber-300 text-xs space-y-1">
          <div className="font-semibold flex items-center gap-1 text-amber-200">
            <Info className="w-4 h-4" />
            Legacy Review Format Detected
          </div>
          <p className="text-xs text-amber-300/80 leading-tight">
            This game review was generated using a previous calculation version. Please click "Re-Analyze Game" to generate fresh, calibrated accuracy calculations.
          </p>
        </div>
      )}

      {/* 2. Review Report Overview Cards & Player Perspective Selector */}
      {report && (
        <>
          {/* Perspective Selector Pill */}
          <div className="bg-[#292440] p-3 rounded-2xl border border-[#443B60] flex items-center justify-between text-xs shadow-xs">
            <div className="flex items-center gap-1.5 text-[#B8AFD1]">
              <UserCheck className="w-4 h-4 text-[#B7A5E8]" />
              <span className="font-semibold text-[#F3EFFB] tracking-wide">Review Perspective:</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setUserPerspective('w')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-1.5 border ${
                  userPerspective === 'w'
                    ? 'bg-[#B7A5E8] text-[#171525] border-[#B7A5E8] shadow-xs'
                    : 'bg-[#201D35] text-[#B8AFD1] border-[#443B60] hover:text-[#F3EFFB] hover:bg-[#332D4D]'
                }`}
                title="Review moves from White's perspective"
              >
                <span className="w-2 h-2 rounded-full bg-[#F3EFFB] shrink-0 shadow-xs" />
                <span>{metadata.white || 'White'} (You)</span>
              </button>
              <button
                onClick={() => setUserPerspective('b')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-1.5 border ${
                  userPerspective === 'b'
                    ? 'bg-[#B7A5E8] text-[#171525] border-[#B7A5E8] shadow-xs'
                    : 'bg-[#201D35] text-[#B8AFD1] border-[#443B60] hover:text-[#F3EFFB] hover:bg-[#332D4D]'
                }`}
                title="Review moves from Black's perspective"
              >
                <span className="w-2 h-2 rounded-full bg-[#12101D] border border-[#443B60] shrink-0" />
                <span>{metadata.black || 'Black'} (You)</span>
              </button>
            </div>
          </div>

          {/* Accuracy & Estimated Elo Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* White Player Card */}
            <div className={`p-4 rounded-2xl border space-y-2 shadow-xs transition ${
              userPerspective === 'w' 
                ? 'bg-[#332D4D] border-[#B7A5E8]/50' 
                : 'bg-[#292440] border-[#443B60]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F3EFFB] flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F3EFFB] shrink-0 inline-block shadow-xs" />
                  <span className="truncate max-w-[100px]">{metadata.white || 'White'}</span>
                  {userPerspective === 'w' && <span className="text-[10px] text-[#B7A5E8] font-bold">(You)</span>}
                </span>
                <span className="text-[11px] text-[#B7A5E8] shrink-0 font-mono" title="Average Centipawn Loss">{report.whiteAcpl} ACPL</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#F3EFFB] tracking-tight">{report.whiteAccuracy}%</span>
                <span className="text-xs text-[#B8AFD1]">accuracy</span>
              </div>
              <div className="text-xs text-[#B8AFD1] flex items-center justify-between border-t border-[#443B60] pt-2">
                <span>Tier:</span>
                <span className="font-semibold text-[#B7A5E8] truncate max-w-[120px]" title={getPerformanceTier(report.whiteAccuracy, report.moves.filter(m => m.color === 'w').length)}>
                  {getPerformanceTier(report.whiteAccuracy, report.moves.filter(m => m.color === 'w').length)}
                </span>
              </div>
            </div>

            {/* Black Player Card */}
            <div className={`p-4 rounded-2xl border space-y-2 shadow-xs transition ${
              userPerspective === 'b' 
                ? 'bg-[#332D4D] border-[#B7A5E8]/50' 
                : 'bg-[#292440] border-[#443B60]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F3EFFB] flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#12101D] border border-[#443B60] shrink-0 inline-block" />
                  <span className="truncate max-w-[100px]">{metadata.black || 'Black'}</span>
                  {userPerspective === 'b' && <span className="text-[10px] text-[#B7A5E8] font-bold">(You)</span>}
                </span>
                <span className="text-[11px] text-[#B7A5E8] shrink-0 font-mono" title="Average Centipawn Loss">{report.blackAcpl} ACPL</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#F3EFFB] tracking-tight">{report.blackAccuracy}%</span>
                <span className="text-xs text-[#B8AFD1]">accuracy</span>
              </div>
              <div className="text-xs text-[#B8AFD1] flex items-center justify-between border-t border-[#443B60] pt-2">
                <span>Tier:</span>
                <span className="font-semibold text-[#B7A5E8] truncate max-w-[120px]" title={getPerformanceTier(report.blackAccuracy, report.moves.filter(m => m.color === 'b').length)}>
                  {getPerformanceTier(report.blackAccuracy, report.moves.filter(m => m.color === 'b').length)}
                </span>
              </div>
            </div>
          </div>

          {/* Performance assessment info toggle */}
          <div className="text-xs text-[#B8AFD1] flex items-center justify-between px-1">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#B7A5E8]" />
              Accuracy &amp; ACPL definitions
            </span>
            <button
              onClick={() => setShowEloDisclaimer(!showEloDisclaimer)}
              className="text-[#B7A5E8] hover:underline font-semibold"
            >
              {showEloDisclaimer ? 'Hide' : 'Explain'}
            </button>
          </div>
          {showEloDisclaimer && (
            <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] text-xs text-[#B8AFD1] leading-relaxed space-y-1.5 shadow-xs">
              <p><strong className="text-[#F3EFFB]">Accuracy (0–100%):</strong> Measures how well moves preserved winning expectancy relative to optimal engine play.</p>
              <p><strong className="text-[#F3EFFB]">ACPL (Average Centipawn Loss):</strong> The average score drop per move in hundredths of a pawn (100 cp = 1 pawn). Lower is better.</p>
            </div>
          )}

          {/* 3. Classification Breakdown Table */}
          <div className="bg-[#292440] p-4 rounded-2xl border border-[#443B60] space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs font-bold text-[#F3EFFB]">
              <span>Move Classifications</span>
              <div className="flex gap-5 text-xs text-[#B8AFD1] font-mono">
                <span>White</span>
                <span>Black</span>
              </div>
            </div>

            <div className="space-y-1">
              {(
                [
                  'brilliant',
                  'great',
                  'best',
                  'forced',
                  'excellent',
                  'good',
                  'book',
                  'inaccuracy',
                  'mistake',
                  'blunder',
                  'missed_win',
                ] as MoveClassification[]
              ).map((cat) => {
                const conf = CLASSIFICATION_CONFIG[cat];
                const wCount = report.classificationCounts.white[cat] || 0;
                const bCount = report.classificationCounts.black[cat] || 0;
                const isSelected = categoryFilter === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(isSelected ? null : cat)}
                    className={`w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#332D4D] ring-1 ring-[#B7A5E8]'
                        : 'hover:bg-white/[0.04]'
                    }`}
                    title={`${conf.description} (click to filter move list)`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 text-center font-bold font-mono text-xs ${conf.color}`}>
                        {conf.symbol}
                      </span>
                      <span className="text-[#F3EFFB] font-medium">{conf.label}</span>
                    </div>
                    <div className="flex gap-7 font-mono text-xs">
                      <span className={`w-3 text-right font-bold ${wCount > 0 ? conf.color : 'text-[#8C81A8]'}`}>
                        {wCount}
                      </span>
                      <span className={`w-3 text-right font-bold ${bCount > 0 ? conf.color : 'text-[#8C81A8]'}`}>
                        {bCount}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Phase Breakdown Table */}
          <div className="bg-[#292440] p-4 rounded-2xl border border-[#443B60] space-y-2 shadow-xs">
            <span className="text-xs font-bold text-[#F3EFFB] block">Phase Accuracy</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#201D35] p-2.5 rounded-xl border border-[#443B60]">
                <div className="text-[#8C81A8] uppercase font-bold text-[10px] mb-1">Opening</div>
                <div className="font-mono text-[#F3EFFB] font-bold">
                  {report.whitePhaseAccuracy.opening}% / {report.blackPhaseAccuracy.opening}%
                </div>
              </div>
              <div className="bg-[#201D35] p-2.5 rounded-xl border border-[#443B60]">
                <div className="text-[#8C81A8] uppercase font-bold text-[10px] mb-1">Middlegame</div>
                <div className="font-mono text-[#F3EFFB] font-bold">
                  {report.whitePhaseAccuracy.middlegame}% / {report.blackPhaseAccuracy.middlegame}%
                </div>
              </div>
              <div className="bg-[#201D35] p-2.5 rounded-xl border border-[#443B60]">
                <div className="text-[#8C81A8] uppercase font-bold text-[10px] mb-1">Endgame</div>
                <div className="font-mono text-[#F3EFFB] font-bold">
                  {report.whitePhaseAccuracy.endgame}% / {report.blackPhaseAccuracy.endgame}%
                </div>
              </div>
            </div>
          </div>

          {/* 5. Detailed Move Analysis Panel */}
          <DetailedMovePanel
            step={selectedStep}
            totalPlies={totalPlies}
            userColor={userPerspective}
            metadata={metadata}
            onSelectMove={onSelectMove}
            onPreviewBestMove={onPreviewBestMove}
            onExitPreview={onExitPreview}
            isPreviewingBestMove={isPreviewingBestMove}
          />

          {/* 6. Move-by-Move Review List */}
          <div className="bg-[#292440] p-4 rounded-2xl border border-[#443B60] space-y-3 flex-1 flex flex-col min-h-[240px] shadow-xs">
            {/* Filter pills */}
            <div className="flex items-center justify-between pb-2 border-b border-[#443B60]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#F3EFFB]">
                <Filter className="w-3.5 h-3.5 text-[#B7A5E8]" />
                <span>Move List ({filteredMoves.length})</span>
              </div>
              <div className="flex gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'key', label: 'Key' },
                    { id: 'white', label: 'White' },
                    { id: 'black', label: 'Black' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setActiveFilter(f.id);
                      setCategoryFilter(null);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs transition font-semibold ${
                      activeFilter === f.id && !categoryFilter
                        ? 'bg-[#B7A5E8] text-[#171525] shadow-xs'
                        : 'bg-[#201D35] text-[#B8AFD1] hover:text-[#F3EFFB] hover:bg-[#332D4D]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {categoryFilter && (
              <div className="flex items-center justify-between bg-[#201D35] px-3 py-1.5 rounded-xl text-xs text-[#F3EFFB] border border-[#443B60]">
                <span>
                  Filtered by:{' '}
                  <strong className={CLASSIFICATION_CONFIG[categoryFilter].color}>
                    {CLASSIFICATION_CONFIG[categoryFilter].label} ({CLASSIFICATION_CONFIG[categoryFilter].symbol})
                  </strong>
                </span>
                <button
                  onClick={() => setCategoryFilter(null)}
                  className="text-[#B7A5E8] hover:underline font-semibold"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Move review steps scrollable container with inner ref for stable scrolling */}
            <div 
              ref={moveListContainerRef}
              className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1"
            >
              {filteredMoves.length === 0 ? (
                <div className="text-center py-8 text-[#B8AFD1] text-xs">
                  No moves match filter
                </div>
              ) : (
                filteredMoves.map((step) => {
                  const conf = CLASSIFICATION_CONFIG[step.classification] || CLASSIFICATION_CONFIG.best;
                  const isSelected = currentPly === step.ply;

                  return (
                    <button
                      key={step.ply}
                      ref={isSelected ? selectedMoveRef : null}
                      onClick={() => onSelectMove(step.ply)}
                      className={`w-full text-left p-2 rounded-xl border text-xs transition flex items-center justify-between ${
                        isSelected 
                          ? 'bg-[#332D4D] border-[#B7A5E8] shadow-xs ring-1 ring-[#B7A5E8]/50' 
                          : 'bg-[#201D35] border-[#443B60]/80 hover:bg-[#332D4D] hover:border-[#5A4E7E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Classification badge */}
                        <span 
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold font-mono text-xs shrink-0 ${conf.badgeBg || conf.bgColor} ${conf.badgeText || conf.color} border ${conf.badgeBorder || conf.borderColor}`}
                          title={conf.label}
                        >
                          {conf.symbol}
                        </span>

                        {/* Move SAN */}
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="text-[#B8AFD1] font-mono text-xs">
                            {step.color === 'w' ? `${step.moveNumber}.` : `${step.moveNumber}...`}
                          </span>
                          <span className="font-extrabold text-[#F3EFFB] font-mono">{step.san}</span>
                        </div>

                        {/* Played vs Best Move comparison */}
                        {step.classification !== 'best' && step.classification !== 'brilliant' && step.classification !== 'forced' && step.classification !== 'book' && step.bestMoveSan && (
                          <span className="text-xs text-[#B8AFD1] truncate max-w-[100px]">
                            (Best: <span className="text-[#4ADE80] font-semibold">{step.bestMoveSan}</span>)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Centipawn loss display */}
                        {step.centipawnLoss > 0 ? (
                          <span className="text-xs font-mono text-[#d3503c] font-semibold">
                            -{step.centipawnLoss} cp
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-[#4ADE80] font-semibold">
                            0 cp
                          </span>
                        )}

                        <span className={`text-xs font-bold ${conf.color}`}>
                          {conf.label}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
