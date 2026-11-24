import React, { useState, useMemo, useEffect } from 'react';
import { 
  Award, 
  Play, 
  Square, 
  Zap,
  Info,
  UserCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  CornerUpLeft
} from 'lucide-react';
import { 
  GameReviewReport, 
  GameReviewStep, 
  MoveClassification, 
  GameMetadata, 
  PieceColor, 
  CURRENT_REVIEW_SCHEMA_VERSION 
} from '../types/chess';
import { ReviewProgress } from '../services/review/gameReviewService';
import { getPerformanceTier } from '../services/review/moveClassifier';
import { CLASSIFICATION_CONFIG } from './GameReviewDashboard';
import { DetailedMovePanel } from './DetailedMovePanel';
import { MoveHistory } from './MoveHistory';
import { EvaluationGraph } from './EvaluationGraph';
import { VariationTree, TreeNode } from '../services/tree/variationTree';
import { EvalCache } from '../services/engine/evalCache';

export interface UnifiedAnalysisWorkspaceProps {
  tree: VariationTree;
  currentNode: TreeNode;
  metadata: GameMetadata;
  reviewReport: GameReviewReport | null;
  reviewProgress: ReviewProgress | null;
  isReviewing: boolean;
  evalCache: EvalCache;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  onSelectNode: (nodeId: string) => void;
  onPrevMove: () => void;
  onNextMove: () => void;
  onFirstMove: () => void;
  onLastMove: () => void;
  onResetGame: () => void;
  onReturnToMainline?: () => void;
  isMainline?: boolean;
  onStartReview: (depth: number, forceFresh?: boolean) => void;
  onCancelReview: () => void;
  onSelectReviewMove: (ply: number) => void;
  isPreviewingBestMove?: boolean;
  onPreviewBestMove?: (step: GameReviewStep) => void;
  onExitPreview?: () => void;
}

export const UnifiedAnalysisWorkspace: React.FC<UnifiedAnalysisWorkspaceProps> = ({
  tree,
  currentNode,
  metadata,
  reviewReport,
  reviewProgress,
  isReviewing,
  evalCache,
  isCheck,
  isCheckmate,
  isDraw,
  isStalemate,
  onSelectNode,
  onPrevMove,
  onNextMove,
  onFirstMove,
  onLastMove,
  onResetGame,
  onReturnToMainline,
  isMainline = true,
  onStartReview,
  onCancelReview,
  onSelectReviewMove,
  isPreviewingBestMove = false,
  onPreviewBestMove,
  onExitPreview,
}) => {
  const [selectedDepth, setSelectedDepth] = useState<number>(14);
  const [forceFresh, setForceFresh] = useState<boolean>(true);
  const [showEloDisclaimer, setShowEloDisclaimer] = useState<boolean>(false);

  // Total plies in mainline game
  const totalPlies = useMemo(() => {
    return tree.getMainlinePath().filter((n) => n.id !== 'root').length;
  }, [tree, currentNode]);

  // Dynamically determine default user perspective from metadata
  const detectedUserColor: PieceColor = useMemo(() => {
    if (metadata?.black && metadata.black.toLowerCase().includes('keifrost')) return 'b';
    if (metadata?.white && metadata.white.toLowerCase().includes('keifrost')) return 'w';
    return 'w';
  }, [metadata]);

  const [userPerspective, setUserPerspective] = useState<PieceColor>(detectedUserColor);

  useEffect(() => {
    setUserPerspective(detectedUserColor);
  }, [detectedUserColor]);

  // Selected review step based on current board ply
  const selectedStep = useMemo(() => {
    if (!reviewReport || reviewReport.moves.length === 0) return null;
    const found = reviewReport.moves.find((m) => m.ply === currentNode.ply);
    return found || reviewReport.moves[0];
  }, [reviewReport, currentNode.ply]);

  return (
    <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-2 gap-3 p-2.5 sm:p-3 overflow-hidden bg-[#201D35] text-[#F3EFFB] text-xs h-full">
      {/* ─────────────────────────────────────────────────────────────
          LEFT COLUMN: Game and Position Analysis
          1. Compact evaluation graph
          2. Game information & opening
          3. Move list with classification indicators
          4. Pinned move navigation controls
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col h-full min-h-0 bg-[#201D35] rounded-2xl border border-[#443B60] overflow-hidden shadow-xs">
        {/* 1. Compact Evaluation Graph */}
        <div className="p-2 sm:p-2.5 bg-[#171525] border-b border-[#443B60] shrink-0">
          <EvaluationGraph
            tree={tree}
            currentNodeId={currentNode.id}
            evalCache={evalCache}
            onSelectNode={onSelectNode}
            reviewReport={reviewReport}
            isReviewing={isReviewing}
          />
        </div>

        {/* 2 & 3. Game Info, Opening Banner & Move List */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#201D35]">
          <MoveHistory
            tree={tree}
            currentNodeId={currentNode.id}
            metadata={metadata}
            reviewReport={reviewReport}
            isCheck={isCheck}
            isCheckmate={isCheckmate}
            isDraw={isDraw}
            isStalemate={isStalemate}
            onSelectNode={onSelectNode}
          />
        </div>

        {/* 4. Pinned Move Navigation Controls */}
        <div className="p-2 bg-[#171525] border-t border-[#443B60] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button 
              onClick={onFirstMove}
              disabled={currentNode.id === 'root'}
              className="p-1.5 sm:p-2 min-h-[34px] min-w-[34px] flex items-center justify-center text-[#B8AFD1] hover:text-[#F3EFFB] bg-[#292440] border border-[#443B60] hover:border-[#5A4E7E] hover:bg-[#332D4D] disabled:opacity-25 disabled:hover:bg-[#292440] disabled:hover:border-[#443B60] rounded-xl transition"
              title="First Move (Up Arrow)"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={onPrevMove}
              disabled={currentNode.id === 'root'}
              className="p-1.5 sm:p-2 min-h-[34px] min-w-[34px] flex items-center justify-center text-[#B8AFD1] hover:text-[#F3EFFB] bg-[#292440] border border-[#443B60] hover:border-[#5A4E7E] hover:bg-[#332D4D] disabled:opacity-25 disabled:hover:bg-[#292440] disabled:hover:border-[#443B60] rounded-xl transition"
              title="Previous Move (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={onNextMove}
              disabled={currentNode.children.length === 0}
              className="p-1.5 sm:p-2 min-h-[34px] min-w-[34px] flex items-center justify-center text-[#B8AFD1] hover:text-[#F3EFFB] bg-[#292440] border border-[#443B60] hover:border-[#5A4E7E] hover:bg-[#332D4D] disabled:opacity-25 disabled:hover:bg-[#292440] disabled:hover:border-[#443B60] rounded-xl transition"
              title="Next Move (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onLastMove}
              disabled={currentNode.children.length === 0}
              className="p-1.5 sm:p-2 min-h-[34px] min-w-[34px] flex items-center justify-center text-[#B8AFD1] hover:text-[#F3EFFB] bg-[#292440] border border-[#443B60] hover:border-[#5A4E7E] hover:bg-[#332D4D] disabled:opacity-25 disabled:hover:bg-[#292440] disabled:hover:border-[#443B60] rounded-xl transition"
              title="Last Move (Down Arrow)"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {!isMainline && onReturnToMainline && (
              <button
                onClick={onReturnToMainline}
                className="px-2.5 py-1 min-h-[32px] text-[10px] bg-[#B7A5E8]/20 text-[#B7A5E8] border border-[#B7A5E8]/30 rounded-xl hover:bg-[#B7A5E8]/30 flex items-center gap-1 transition font-semibold tracking-wide"
                title="Return to Mainline"
              >
                <CornerUpLeft className="w-3 h-3" />
                <span>Mainline</span>
              </button>
            )}
            <button 
              onClick={onResetGame}
              className="px-2.5 py-1 min-h-[32px] text-[#B8AFD1] hover:text-[#d3503c] bg-[#292440] border border-[#443B60] hover:border-[#d3503c]/30 hover:bg-[#d3503c]/10 rounded-xl transition text-[11px] font-semibold tracking-wide flex items-center gap-1"
              title="Reset to Starting Position"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT COLUMN: Game Review and Coaching
          1. Game review controls and analysis depth
          2. Review perspective selector
          3. Accuracy summaries
          4. Move classification statistics
          5. Phase accuracy
          6. Selected move classification and coaching explanation
          7. Best engine move and continuation preview
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col h-full min-h-0 overflow-y-auto pr-1 space-y-3 overscroll-contain">
        {/* 1. Game Review Controls & Analysis Depth */}
        <div className="bg-[#292440] p-3.5 sm:p-4 rounded-2xl border border-[#443B60] space-y-2.5 shadow-xs shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#B7A5E8]" />
              <h3 className="font-bold text-[#F3EFFB] text-xs sm:text-sm tracking-wide">Game Review</h3>
            </div>
            <span className="text-[11px] text-[#B8AFD1] font-mono">
              {totalPlies} {totalPlies === 1 ? 'ply' : 'plies'} played
            </span>
          </div>

          {/* Depth Settings & Primary Action */}
          <div className="space-y-2.5 pt-0.5">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span className="text-[11px] text-[#B8AFD1] font-semibold tracking-wide">Depth:</span>
              <div className="flex gap-1">
                {[
                  { depth: 12, label: 'Fast (12)' },
                  { depth: 14, label: 'Standard (14)' },
                  { depth: 16, label: 'Deep (16)' },
                  { depth: 18, label: 'Master (18)' },
                ].map((d) => (
                  <button
                    key={d.depth}
                    disabled={isReviewing}
                    onClick={() => setSelectedDepth(d.depth)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition ${
                      selectedDepth === d.depth
                        ? 'bg-[#B7A5E8] text-[#171525] border-[#B7A5E8] shadow-xs'
                        : 'bg-[#201D35] text-[#B8AFD1] border-[#443B60] hover:bg-[#332D4D] hover:text-[#F3EFFB]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#B8AFD1]">
              <span>Fresh Analysis:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[#F3EFFB] hover:text-[#B7A5E8]">
                <input
                  type="checkbox"
                  disabled={isReviewing}
                  checked={forceFresh}
                  onChange={(e) => setForceFresh(e.target.checked)}
                  className="rounded border-[#443B60] text-[#B7A5E8] accent-[#B7A5E8] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-[11px]">Bypass cached evaluations</span>
              </label>
            </div>

            {/* Live Progress Bar while Reviewing */}
            {isReviewing && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#F3EFFB] font-semibold animate-pulse flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#B7A5E8] fill-[#B7A5E8]" />
                    Analyzing {reviewProgress?.currentMoveSan ? `"${reviewProgress.currentMoveSan}"` : 'position'}...
                  </span>
                  <span className="font-mono text-[#B7A5E8] font-bold">
                    {reviewProgress?.currentStep || 0} / {reviewProgress?.totalSteps || totalPlies} ({reviewProgress?.percentage || 0}%)
                  </span>
                </div>

                <div className="w-full bg-[#201D35] h-2 rounded-full overflow-hidden border border-[#443B60]">
                  <div 
                    className="bg-[#B7A5E8] h-full transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${reviewProgress?.percentage || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Single Primary Action Button & Cancel Option */}
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  if (!isReviewing && totalPlies > 0) {
                    onStartReview(selectedDepth, forceFresh);
                  }
                }}
                disabled={totalPlies === 0 || isReviewing}
                className="w-full py-2.5 px-3 bg-[#B7A5E8] hover:bg-[#C4B5FD] disabled:bg-[#201D35] disabled:text-[#8C81A8] disabled:border disabled:border-[#443B60] disabled:cursor-not-allowed text-[#171525] rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition shadow-xs border border-[#B7A5E8]/50 active:scale-[0.99]"
              >
                {isReviewing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#171525]" />
                    <span>Analyzing Game... ({reviewProgress?.percentage || 0}%)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{reviewReport ? 'Re-Analyze Game' : 'Start Game Review'}</span>
                  </>
                )}
              </button>

              {isReviewing && (
                <button
                  onClick={onCancelReview}
                  className="w-full py-1.5 px-3 bg-[#d3503c]/20 hover:bg-[#d3503c]/30 text-[#F3EFFB] border border-[#d3503c]/40 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Cancel Review</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Legacy Review Format Notice */}
        {reviewReport && reviewReport.schemaVersion !== CURRENT_REVIEW_SCHEMA_VERSION && (
          <div className="bg-amber-950/40 border border-amber-700/50 p-2.5 rounded-xl text-amber-300 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1 text-amber-200">
              <Info className="w-3.5 h-3.5" />
              Legacy Review Format Detected
            </div>
            <p className="text-[11px] text-amber-300/80 leading-tight">
              Click "Re-Analyze Game" to generate calibrated accuracy calculations for this game.
            </p>
          </div>
        )}

        {/* Review Data: When Report Exists */}
        {reviewReport && (
          <>
            {/* 2. Review Perspective Selector */}
            <div className="bg-[#292440] p-2.5 rounded-xl border border-[#443B60] flex items-center justify-between text-xs shadow-xs shrink-0">
              <div className="flex items-center gap-1.5 text-[#B8AFD1]">
                <UserCheck className="w-3.5 h-3.5 text-[#B7A5E8]" />
                <span className="font-semibold text-[#F3EFFB] text-[11px] tracking-wide">Perspective:</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setUserPerspective('w')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition flex items-center gap-1.5 border ${
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
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition flex items-center gap-1.5 border ${
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

            {/* 3. Accuracy & Performance Summaries: Dual Cards */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              {/* White Player Card */}
              <div className={`p-3 rounded-2xl border space-y-1.5 shadow-xs transition ${
                userPerspective === 'w' 
                  ? 'bg-[#332D4D] border-[#B7A5E8]/50 shadow-xs' 
                  : 'bg-[#292440] border-[#443B60]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F3EFFB] flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#F3EFFB] shrink-0 inline-block shadow-xs" />
                    <span className="truncate max-w-[85px] text-[11px]">{metadata.white || 'White'}</span>
                    {userPerspective === 'w' && <span className="text-[9px] text-[#B7A5E8] font-bold">(You)</span>}
                  </span>
                  <span className="text-[10px] text-[#B7A5E8] font-mono font-semibold">{reviewReport.whiteAcpl} ACPL</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-[#F3EFFB] tracking-tight">{reviewReport.whiteAccuracy}%</span>
                  <span className="text-[10px] text-[#B8AFD1] tracking-wide">accuracy</span>
                </div>
                <div className="text-[10px] text-[#B8AFD1] flex items-center justify-between border-t border-[#443B60] pt-1.5">
                  <span className="tracking-wide font-medium">Tier:</span>
                  <span className="font-semibold text-[#B7A5E8] truncate max-w-[95px]">
                    {getPerformanceTier(reviewReport.whiteAccuracy, reviewReport.moves.filter(m => m.color === 'w').length)}
                  </span>
                </div>
              </div>

              {/* Black Player Card */}
              <div className={`p-3 rounded-2xl border space-y-1.5 shadow-xs transition ${
                userPerspective === 'b' 
                  ? 'bg-[#332D4D] border-[#B7A5E8]/50 shadow-xs' 
                  : 'bg-[#292440] border-[#443B60]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F3EFFB] flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#12101D] border border-[#443B60] shrink-0 inline-block" />
                    <span className="truncate max-w-[85px] text-[11px]">{metadata.black || 'Black'}</span>
                    {userPerspective === 'b' && <span className="text-[9px] text-[#B7A5E8] font-bold">(You)</span>}
                  </span>
                  <span className="text-[10px] text-[#B7A5E8] font-mono font-semibold">{reviewReport.blackAcpl} ACPL</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-[#F3EFFB] tracking-tight">{reviewReport.blackAccuracy}%</span>
                  <span className="text-[10px] text-[#B8AFD1] tracking-wide">accuracy</span>
                </div>
                <div className="text-[10px] text-[#B8AFD1] flex items-center justify-between border-t border-[#443B60] pt-1.5">
                  <span className="tracking-wide font-medium">Tier:</span>
                  <span className="font-semibold text-[#B7A5E8] truncate max-w-[95px]">
                    {getPerformanceTier(reviewReport.blackAccuracy, reviewReport.moves.filter(m => m.color === 'b').length)}
                  </span>
                </div>
              </div>
            </div>

            {/* Definitions Toggle */}
            <div className="text-[11px] text-[#B8AFD1] flex items-center justify-between px-1">
              <span className="flex items-center gap-1 font-medium">
                <Info className="w-3 h-3 text-[#B7A5E8]" />
                Accuracy &amp; ACPL definitions
              </span>
              <button
                onClick={() => setShowEloDisclaimer(!showEloDisclaimer)}
                className="text-[#B7A5E8] hover:underline font-semibold tracking-wide text-[10px]"
              >
                {showEloDisclaimer ? 'Hide' : 'Explain'}
              </button>
            </div>
            {showEloDisclaimer && (
              <div className="bg-[#292440] p-3 rounded-xl border border-[#443B60] text-[11px] text-[#B8AFD1] leading-relaxed space-y-1 shadow-xs">
                <p><strong className="text-[#F3EFFB]">Accuracy:</strong> Measures how well moves preserved winning expectancy relative to optimal engine play.</p>
                <p><strong className="text-[#F3EFFB]">ACPL:</strong> Average Centipawn Loss (100 cp = 1 pawn). Lower is better.</p>
              </div>
            )}

            {/* 4. Move Classification Statistics Table */}
            <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] space-y-1.5 shadow-xs shrink-0">
              <div className="flex justify-between items-center text-xs font-semibold tracking-wide text-[#B7A5E8]">
                <span>Move Classifications</span>
                <div className="flex gap-5 text-xs text-[#B8AFD1] font-mono">
                  <span>White</span>
                  <span>Black</span>
                </div>
              </div>

              <div className="space-y-0.5">
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
                  const wCount = reviewReport.classificationCounts.white[cat] || 0;
                  const bCount = reviewReport.classificationCounts.black[cat] || 0;

                  return (
                    <div
                      key={cat}
                      className="w-full flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-white/[0.03] transition text-left"
                      title={conf.description}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-4 text-center font-bold font-mono text-xs ${conf.color}`}>
                          {conf.symbol}
                        </span>
                        <span className="text-[#F3EFFB] font-medium text-[11px]">{conf.label}</span>
                      </div>
                      <div className="flex gap-6 font-mono text-[11px]">
                        <span className={`w-3 text-right font-semibold ${wCount > 0 ? conf.color : 'text-[#8C81A8]'}`}>
                          {wCount}
                        </span>
                        <span className={`w-3 text-right font-semibold ${bCount > 0 ? conf.color : 'text-[#8C81A8]'}`}>
                          {bCount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Phase Accuracy Breakdown */}
            <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] space-y-1.5 shadow-xs shrink-0">
              <span className="text-xs font-semibold tracking-wide text-[#B7A5E8] block">Phase Accuracy</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#201D35] p-2.5 rounded-xl border border-[#443B60]">
                  <div className="text-[#8C81A8] font-semibold text-[9px] mb-0.5 tracking-wider uppercase">Opening</div>
                  <div className="font-mono text-[#F3EFFB] font-bold text-[11px]">
                    {reviewReport.whitePhaseAccuracy.opening}% / {reviewReport.blackPhaseAccuracy.opening}%
                  </div>
                </div>
                <div className="bg-[#201D35] p-2.5 rounded-xl border border-[#443B60]">
                  <div className="text-[#8C81A8] font-semibold text-[9px] mb-0.5 tracking-wider uppercase">Middlegame</div>
                  <div className="font-mono text-[#F3EFFB] font-bold text-[11px]">
                    {reviewReport.whitePhaseAccuracy.middlegame}% / {reviewReport.blackPhaseAccuracy.middlegame}%
                  </div>
                </div>
                <div className="bg-[#201D35] p-2.5 rounded-xl border border-[#443B60]">
                  <div className="text-[#8C81A8] font-semibold text-[9px] mb-0.5 tracking-wider uppercase">Endgame</div>
                  <div className="font-mono text-[#F3EFFB] font-bold text-[11px]">
                    {reviewReport.whitePhaseAccuracy.endgame}% / {reviewReport.blackPhaseAccuracy.endgame}%
                  </div>
                </div>
              </div>
            </div>

            {/* 6 & 7. Selected Move Coaching Feedback & Best Engine Move */}
            <div className="shrink-0">
              <DetailedMovePanel
                step={selectedStep}
                totalPlies={totalPlies}
                userColor={userPerspective}
                metadata={metadata}
                onSelectMove={onSelectReviewMove}
                onPreviewBestMove={onPreviewBestMove}
                onExitPreview={onExitPreview}
                isPreviewingBestMove={isPreviewingBestMove}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
