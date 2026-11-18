import React, { useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle
} from 'lucide-react';
import { GameReviewStep, PieceColor, GameMetadata } from '../types/chess';
import { CLASSIFICATION_CONFIG } from './GameReviewDashboard';
import { generateStructuredMoveExplanation } from '../services/review/moveExplanationService';
import { convertUciPvToSan } from '../services/engine/evalCache';

export interface DetailedMovePanelProps {
  step: GameReviewStep | null;
  totalPlies: number;
  userColor?: PieceColor;
  metadata?: GameMetadata;
  onSelectMove: (ply: number) => void;
  onPreviewBestMove?: (step: GameReviewStep) => void;
  onExitPreview?: () => void;
  isPreviewingBestMove?: boolean;
}

export const DetailedMovePanel: React.FC<DetailedMovePanelProps> = ({
  step,
  totalPlies,
  userColor,
  metadata,
  onSelectMove,
}) => {
  if (!step) {
    return (
      <div className="bg-[#192744] p-6 rounded-2xl border border-[#304263] text-center text-xs text-[#9AAAC9] space-y-2 flex flex-col items-center justify-center min-h-[150px] shadow-sm">
        <HelpCircle className="w-7 h-7 text-[#8EA6F0] mb-1 opacity-90" />
        <span className="text-[#EDF2FF] font-bold text-sm">No Move Selected</span>
        <p className="text-xs max-w-[280px] leading-relaxed">
          Select any move from the list below or use your arrow keys to review interactive move-by-move coaching.
        </p>
      </div>
    );
  }

  const effectiveUserColor = userColor || step.color || 'w';
  const conf = CLASSIFICATION_CONFIG[step.classification] || CLASSIFICATION_CONFIG.best;
  const structuredExplanation = useMemo(() => {
    return generateStructuredMoveExplanation(step, effectiveUserColor, metadata);
  }, [step, effectiveUserColor, metadata]);
  const explanation = structuredExplanation.summary;

  const isUserMove = step.color === effectiveUserColor;
  const playerName = step.color === 'w' 
    ? (metadata?.white || 'White') 
    : (metadata?.black || 'Black');

  // Determine if played move is the best move
  const isBestMove = 
    step.classification === 'best' || 
    step.classification === 'forced' ||
    step.classification === 'book' ||
    (step.bestMoveSan && step.bestMoveSan === step.san) ||
    (step.bestMoveEval && step.uci === step.bestMoveEval.bestMove);

  const bestMoveSan = step.bestMoveSan || (step.bestMoveEval ? step.bestMoveEval.bestMove : undefined);
  const showBestMoveComparison = !isBestMove && bestMoveSan && bestMoveSan !== step.san;

  // Convert best move PV from UCI to SAN if needed
  const bestPvSan = useMemo(() => {
    if (!step.bestMoveEval) return [];
    if (step.bestMoveEval.sanPv && step.bestMoveEval.sanPv.length > 0) {
      return step.bestMoveEval.sanPv.slice(0, 5);
    }
    if (step.bestMoveEval.pv && step.bestMoveEval.pv.length > 0 && step.fenBefore) {
      return convertUciPvToSan(step.fenBefore, step.bestMoveEval.pv).slice(0, 5);
    }
    return [];
  }, [step]);

  const canGoPrev = step.ply > 1;
  const canGoNext = step.ply < totalPlies;

  return (
    <div className="bg-[#192744] p-4 sm:p-5 rounded-2xl border border-[#304263] shadow-md flex flex-col space-y-3.5 text-sm text-[#EDF2FF]">
      {/* 1. Header with Perspective Badge, Move SAN, Classification, and Navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-[#304263] pb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          {/* User vs Opponent Pill */}
          <span 
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide border transition-all ${
              isUserMove 
                ? 'bg-[#202F50] text-[#C5D5FA] border-[#6685DB]/60' 
                : 'bg-[#131E36] text-[#9AAAC9] border-[#304263]'
            }`}
          >
            <span 
              className={`w-2 h-2 rounded-full shrink-0 ${
                step.color === 'w' ? 'bg-[#DFE7F5]' : 'bg-[#0D1428] border border-[#64748B]'
              }`}
            />
            <span>{isUserMove ? 'Your Move' : "Opponent's Move"}</span>
            <span className="opacity-70 font-normal">({playerName})</span>
          </span>

          {/* Move SAN */}
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[#9AAAC9] text-sm font-semibold">
              {step.color === 'w' ? `${step.moveNumber}.` : `${step.moveNumber}...`}
            </span>
            <span className="font-extrabold text-base text-[#EDF2FF] font-mono tracking-wide">
              {step.san}
            </span>
          </div>

          {/* Prominent Classification Badge */}
          <span 
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shrink-0 ${conf.badgeBg || conf.bgColor} ${conf.badgeText || conf.color} ${conf.badgeBorder || conf.borderColor}`}
            title={conf.description}
          >
            <span className="font-mono font-black">{conf.symbol}</span>
            <span>{conf.label}</span>
          </span>
        </div>

        {/* Previous / Next Move Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onSelectMove(step.ply - 1)}
            disabled={!canGoPrev}
            aria-label="Previous move"
            className="p-1.5 sm:p-2 rounded-xl bg-[#202F50] border border-[#304263] hover:bg-[#2A3E66] disabled:opacity-30 disabled:hover:bg-[#202F50] transition text-[#EDF2FF] active:scale-95"
            title="Previous Move (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#9AAAC9] font-mono px-1 font-semibold">
            {step.ply}/{totalPlies}
          </span>
          <button
            onClick={() => onSelectMove(step.ply + 1)}
            disabled={!canGoNext}
            aria-label="Next move"
            className="p-1.5 sm:p-2 rounded-xl bg-[#202F50] border border-[#304263] hover:bg-[#2A3E66] disabled:opacity-30 disabled:hover:bg-[#202F50] transition text-[#EDF2FF] active:scale-95"
            title="Next Move (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Intelligent Move Feedback (Coaching Guidance) */}
      <div className="bg-[#202F50] p-3.5 rounded-xl border border-[#304263] flex items-start gap-3 shadow-xs">
        <Sparkles className="w-5 h-5 text-[#8EA6F0] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs sm:text-sm">
          <p className="text-[#EDF2FF] font-medium leading-relaxed">
            {explanation}
          </p>
          {structuredExplanation.why && structuredExplanation.why !== explanation && (
            <p className="text-[#9AAAC9] text-xs leading-relaxed">
              {structuredExplanation.why}
            </p>
          )}
        </div>
      </div>

      {/* 3. Best Move Suggestion & Interactive Preview (when played move differs from engine recommendation) */}
      {showBestMoveComparison ? (
        <div className="bg-[#064E3B]/20 p-3.5 rounded-xl border border-[#059669]/40 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[#A7F3D0] font-medium text-xs">Best engine move:</span>
              <span className="font-extrabold text-sm text-[#4ADE80] font-mono">
                {bestMoveSan}
              </span>
            </div>
          </div>

          {/* Coach's explanation of what the recommended alternative accomplishes */}
          {structuredExplanation.bestMoveIdea && (
            <div className="text-xs text-[#D1FAE5] leading-relaxed pt-1.5 border-t border-[#059669]/30 flex items-start gap-1.5">
              <span className="font-semibold text-[#6EE7B7] shrink-0">Coach's Idea:</span>
              <span>{structuredExplanation.bestMoveIdea}</span>
            </div>
          )}

          {bestPvSan.length > 0 && (
            <div className="text-xs text-[#A7F3D0] flex items-center gap-1.5 pt-1.5 border-t border-[#059669]/30">
              <span className="font-semibold text-[#6EE7B7]">Continuation:</span>
              <span className="font-mono text-[#4ADE80] font-medium truncate">{bestPvSan.join(' ')}</span>
            </div>
          )}
        </div>
      ) : isBestMove ? (
        <div className="bg-[#064E3B]/20 border border-[#059669]/40 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs text-[#6EE7B7] font-medium">
          <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
          <span>{step.classification === 'forced' ? 'Forced move played.' : "Played move is the engine's top choice."}</span>
        </div>
      ) : null}
    </div>
  );
};
