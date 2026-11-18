import React, { useState, useMemo, useEffect } from 'react';
import { 
  Award, 
  Play, 
  Square, 
  Zap,
  Info,
  UserCheck,
  Sparkles,
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
    <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-2 gap-3 p-2.5 sm:p-3 overflow-hidden bg-[#131E36] text-[#EDF2FF] text-xs h-full">
      {/* ─────────────────────────────────────────────────────────────
          LEFT COLUMN: Game and Position Analysis
          1. Compact evaluation graph
          2. Game information & opening
          3. Move list with classification indicators
          4. Pinned move navigation controls
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col h-full min-h-0 bg-[#192744] rounded-2xl border border-[#304263] overflow-hidden shadow-sm">
        {/* 1. Compact Evaluation Graph */}
        <div className="p-2 sm:p-2.5 bg-[#131E36] border-b border-[#304263] shrink-0">
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
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
        <div className="p-2 bg-[#131E36] border-t border-[#304263] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button 
              onClick={onFirstMove}
              disabled={currentNode.id === 'root'}
              className="p-1.5 sm:p-2 min-h-[34px] min-w-[34px] flex items-center justify-center text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50] disabled:opacity-25 disabled:hover:bg-transparent rounded-xl transition"
              title="First Move (Up Arrow)"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={onPrevMove}
              disabled={currentNode.id === 'root'}
              className="p-1.5 sm:p-2 min-h-[34px] min-w-[34px] flex items-center justify-center text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50] disabled:opacity-25 disabled:hover:bg-transparent rounded-xl transition"
              title="Previous Move (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={onNextMove}
              disabled={currentNode.children.length === 0}
              className="p-1.5 sm:p-2 min-h-[34px] min-w-[34px] flex items-center justify-center text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50] disabled:opacity-25 disabled:hover:bg-transparent rounded-xl transition"
              title="Next Move (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onLastMove}
              disabled={currentNode.children.length === 0}
              className="p-1.5 sm:p-2 min-h-[34px] min-w-[34px] flex items-center justify-center text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50] disabled:opacity-25 disabled:hover:bg-transparent rounded-xl transition"
              title="Last Move (Down Arrow)"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {!isMainline && onReturnToMainline && (
              <button
                onClick={onReturnToMainline}
                className="px-2.5 py-1 min-h-[32px] text-[10px] bg-[#202F50] text-[#8EA6F0] border border-[#304263] rounded-xl hover:bg-[#202F50]/80 flex items-center gap-1 transition font-semibold shadow-xs"
                title="Return to Mainline"
              >
                <CornerUpLeft className="w-3 h-3" />
                <span>Mainline</span>
              </button>
            )}
            <button 
              onClick={onResetGame}
              className="px-2 py-1 min-h-[32px] text-[#9AAAC9] hover:text-[#F87171] hover:bg-red-950/30 rounded-xl transition text-[11px] flex items-center gap-1"
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
        <div className="bg-[#192744] p-3.5 sm:p-4 rounded-2xl border border-[#304263] space-y-2.5 shadow-sm shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#8EA6F0]" />
              <h3 className="font-bold text-[#EDF2FF] text-xs sm:text-sm tracking-tight">Game Review</h3>
            </div>
            <span className="text-[11px] text-[#9AAAC9] font-mono">
              {totalPlies} {totalPlies === 1 ? 'ply' : 'plies'} played
            </span>
          </div>

          {/* Progress or Review Configuration */}
          {isReviewing ? (
            <div className="space-y-2 pt-0.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#EDF2FF] font-semibold animate-pulse flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Analyzing {reviewProgress?.currentMoveSan ? `"${reviewProgress.currentMoveSan}"` : 'position'}...
                </span>
                <span className="font-mono text-[#8EA6F0] font-bold">
                  {reviewProgress?.currentStep || 0} / {reviewProgress?.totalSteps || totalPlies} ({reviewProgress?.percentage || 0}%)
                </span>
              </div>

              <div className="w-full bg-[#131E36] h-2 rounded-full overflow-hidden border border-[#304263]">
                <div 
                  className="bg-gradient-to-r from-[#6685DB] to-[#8EA6F0] h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${reviewProgress?.percentage || 0}%` }}
                />
              </div>

              <button
                onClick={onCancelReview}
                className="w-full py-1.5 px-3 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-700/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Cancel Review</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 pt-0.5">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#9AAAC9] font-medium">Depth:</span>
                <div className="flex gap-1">
                  {[
                    { depth: 12, label: 'Fast (12)' },
                    { depth: 14, label: 'Standard (14)' },
                    { depth: 16, label: 'Deep (16)' },
                    { depth: 18, label: 'Master (18)' },
                  ].map((d) => (
                    <button
                      key={d.depth}
                      onClick={() => setSelectedDepth(d.depth)}
                      className={`px-2 py-0.5 rounded-xl text-[11px] font-semibold border transition ${
                        selectedDepth === d.depth
                          ? 'bg-[#6685DB] text-white font-bold border-[#6685DB] shadow-xs'
                          : 'bg-[#202F50] text-[#9AAAC9] border-[#304263] hover:bg-[#2A3E66] hover:text-[#EDF2FF]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#9AAAC9]">
                <span>Fresh Analysis:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[#EDF2FF] hover:text-[#8EA6F0]">
                  <input
                    type="checkbox"
                    checked={forceFresh}
                    onChange={(e) => setForceFresh(e.target.checked)}
                    className="rounded border-[#304263] text-[#6685DB] accent-[#6685DB] cursor-pointer"
                  />
                  <span className="text-[11px]">Bypass cached evaluations</span>
                </label>
              </div>

              <button
                onClick={() => onStartReview(selectedDepth, forceFresh)}
                disabled={totalPlies === 0}
                className="w-full py-2 px-3 bg-[#6685DB] hover:bg-[#5774C9] disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm active:scale-[0.99]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{reviewReport ? 'Re-Analyze Game' : 'Start Game Review'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Legacy Review Format Notice */}
        {reviewReport && reviewReport.schemaVersion !== CURRENT_REVIEW_SCHEMA_VERSION && (
          <div className="bg-amber-950/40 border border-amber-700/50 p-2.5 rounded-2xl text-amber-300 text-xs space-y-1">
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
        {reviewReport ? (
          <>
            {/* 2. Review Perspective Selector */}
            <div className="bg-[#192744] p-2.5 rounded-2xl border border-[#304263] flex items-center justify-between text-xs shadow-sm shrink-0">
              <div className="flex items-center gap-1.5 text-[#9AAAC9]">
                <UserCheck className="w-3.5 h-3.5 text-[#8EA6F0]" />
                <span className="font-semibold text-[#EDF2FF] text-[11px]">Perspective:</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setUserPerspective('w')}
                  className={`px-2.5 py-0.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 border ${
                    userPerspective === 'w'
                      ? 'bg-[#6685DB] text-white border-[#6685DB] shadow-xs'
                      : 'bg-[#202F50] text-[#9AAAC9] border-[#304263] hover:text-[#EDF2FF] hover:bg-[#2A3E66]'
                  }`}
                  title="Review moves from White's perspective"
                >
                  <span className="w-2 h-2 rounded-full bg-[#DFE7F5] shrink-0 shadow-xs" />
                  <span>{metadata.white || 'White'} (You)</span>
                </button>
                <button
                  onClick={() => setUserPerspective('b')}
                  className={`px-2.5 py-0.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 border ${
                    userPerspective === 'b'
                      ? 'bg-[#6685DB] text-white border-[#6685DB] shadow-xs'
                      : 'bg-[#202F50] text-[#9AAAC9] border-[#304263] hover:text-[#EDF2FF] hover:bg-[#2A3E66]'
                  }`}
                  title="Review moves from Black's perspective"
                >
                  <span className="w-2 h-2 rounded-full bg-[#0D1428] border border-[#64748B] shrink-0" />
                  <span>{metadata.black || 'Black'} (You)</span>
                </button>
              </div>
            </div>

            {/* 3. Accuracy & Performance Summaries */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              {/* White Player Card */}
              <div className={`p-3 rounded-2xl border space-y-1.5 shadow-sm transition ${
                userPerspective === 'w' 
                  ? 'bg-[#202F50] border-[#6685DB] ring-1 ring-[#6685DB]/40' 
                  : 'bg-[#192744] border-[#304263]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#EDF2FF] flex items-center gap-1 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#DFE7F5] shrink-0 inline-block shadow-xs" />
                    <span className="truncate max-w-[85px] text-[11px]">{metadata.white || 'White'}</span>
                    {userPerspective === 'w' && <span className="text-[9px] text-[#8EA6F0] font-bold">(You)</span>}
                  </span>
                  <span className="text-[10px] text-[#9AAAC9] font-mono">{reviewReport.whiteAcpl} ACPL</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[#EDF2FF] tracking-tight">{reviewReport.whiteAccuracy}%</span>
                  <span className="text-[10px] text-[#9AAAC9]">accuracy</span>
                </div>
                <div className="text-[10px] text-[#9AAAC9] flex items-center justify-between border-t border-[#304263] pt-1.5">
                  <span>Tier:</span>
                  <span className="font-semibold text-[#8EA6F0] truncate max-w-[95px]">
                    {getPerformanceTier(reviewReport.whiteAccuracy, reviewReport.moves.filter(m => m.color === 'w').length)}
                  </span>
                </div>
              </div>

              {/* Black Player Card */}
              <div className={`p-3 rounded-2xl border space-y-1.5 shadow-sm transition ${
                userPerspective === 'b' 
                  ? 'bg-[#202F50] border-[#6685DB] ring-1 ring-[#6685DB]/40' 
                  : 'bg-[#192744] border-[#304263]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#EDF2FF] flex items-center gap-1 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#0D1428] border border-[#64748B] shrink-0 inline-block" />
                    <span className="truncate max-w-[85px] text-[11px]">{metadata.black || 'Black'}</span>
                    {userPerspective === 'b' && <span className="text-[9px] text-[#8EA6F0] font-bold">(You)</span>}
                  </span>
                  <span className="text-[10px] text-[#9AAAC9] font-mono">{reviewReport.blackAcpl} ACPL</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-[#EDF2FF] tracking-tight">{reviewReport.blackAccuracy}%</span>
                  <span className="text-[10px] text-[#9AAAC9]">accuracy</span>
                </div>
                <div className="text-[10px] text-[#9AAAC9] flex items-center justify-between border-t border-[#304263] pt-1.5">
                  <span>Tier:</span>
                  <span className="font-semibold text-[#8EA6F0] truncate max-w-[95px]">
                    {getPerformanceTier(reviewReport.blackAccuracy, reviewReport.moves.filter(m => m.color === 'b').length)}
                  </span>
                </div>
              </div>
            </div>

            {/* Definitions Toggle */}
            <div className="text-[11px] text-[#9AAAC9] flex items-center justify-between px-1">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-[#9AAAC9]" />
                Accuracy & ACPL definitions
              </span>
              <button
                onClick={() => setShowEloDisclaimer(!showEloDisclaimer)}
                className="text-[#8EA6F0] hover:underline font-semibold"
              >
                {showEloDisclaimer ? 'Hide' : 'Explain'}
              </button>
            </div>
            {showEloDisclaimer && (
              <div className="bg-[#192744] p-3 rounded-2xl border border-[#304263] text-[11px] text-[#9AAAC9] leading-relaxed space-y-1 shadow-xs">
                <p><strong className="text-[#EDF2FF]">Accuracy:</strong> Measures how well moves preserved winning expectancy relative to optimal engine play.</p>
                <p><strong className="text-[#EDF2FF]">ACPL:</strong> Average Centipawn Loss (100 cp = 1 pawn). Lower is better.</p>
              </div>
            )}

            {/* 4. Move Classification Statistics Table */}
            <div className="bg-[#192744] p-3 rounded-2xl border border-[#304263] space-y-1.5 shadow-sm shrink-0">
              <div className="flex justify-between items-center text-xs font-bold text-[#EDF2FF]">
                <span>Move Classifications</span>
                <div className="flex gap-5 text-xs text-[#9AAAC9] font-mono">
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
                      className="w-full flex items-center justify-between text-xs py-1 px-2 rounded-xl hover:bg-[#202F50]/60 transition text-left"
                      title={conf.description}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-4 text-center font-bold font-mono text-xs ${conf.color}`}>
                          {conf.symbol}
                        </span>
                        <span className="text-[#EDF2FF] font-medium text-[11px]">{conf.label}</span>
                      </div>
                      <div className="flex gap-6 font-mono text-[11px]">
                        <span className={`w-3 text-right font-bold ${wCount > 0 ? conf.color : 'text-[#9AAAC9]'}`}>
                          {wCount}
                        </span>
                        <span className={`w-3 text-right font-bold ${bCount > 0 ? conf.color : 'text-[#9AAAC9]'}`}>
                          {bCount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Phase Accuracy Breakdown */}
            <div className="bg-[#192744] p-3 rounded-2xl border border-[#304263] space-y-1.5 shadow-sm shrink-0">
              <span className="text-xs font-bold text-[#EDF2FF] block">Phase Accuracy</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#131E36] p-2 rounded-xl border border-[#304263]">
                  <div className="text-[#9AAAC9] uppercase font-bold text-[9px] mb-0.5">Opening</div>
                  <div className="font-mono text-[#EDF2FF] font-bold text-[11px]">
                    {reviewReport.whitePhaseAccuracy.opening}% / {reviewReport.blackPhaseAccuracy.opening}%
                  </div>
                </div>
                <div className="bg-[#131E36] p-2 rounded-xl border border-[#304263]">
                  <div className="text-[#9AAAC9] uppercase font-bold text-[9px] mb-0.5">Middlegame</div>
                  <div className="font-mono text-[#EDF2FF] font-bold text-[11px]">
                    {reviewReport.whitePhaseAccuracy.middlegame}% / {reviewReport.blackPhaseAccuracy.middlegame}%
                  </div>
                </div>
                <div className="bg-[#131E36] p-2 rounded-xl border border-[#304263]">
                  <div className="text-[#9AAAC9] uppercase font-bold text-[9px] mb-0.5">Endgame</div>
                  <div className="font-mono text-[#EDF2FF] font-bold text-[11px]">
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
        ) : (
          /* Placeholder Card when Game Review has not been run yet */
          <div className="bg-[#192744] p-6 rounded-3xl border border-[#304263] text-center space-y-3 shadow-md flex-1 flex flex-col justify-center items-center">
            <div className="w-12 h-12 rounded-2xl bg-[#202F50] border border-[#6685DB]/40 flex items-center justify-center text-[#8EA6F0] shadow-sm">
              <Sparkles className="w-6 h-6 text-[#8EA6F0]" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="font-bold text-sm text-[#EDF2FF]">Game Review Ready</h4>
              <p className="text-[11px] text-[#9AAAC9] leading-relaxed">
                Run Game Review to analyze every position with Stockfish 19 Lite WASM. You'll receive:
              </p>
            </div>
            <div className="text-left bg-[#131E36] p-3.5 rounded-2xl border border-[#304263] text-[11px] text-[#9AAAC9] space-y-1.5 w-full max-w-xs">
              <div className="flex items-center gap-2 text-[#EDF2FF]">
                <span className="text-emerald-400 font-bold">✓</span> Player accuracy percentages & ACPL
              </div>
              <div className="flex items-center gap-2 text-[#EDF2FF]">
                <span className="text-teal-400 font-bold">✓</span> Move classifications (Brilliant to Blunder)
              </div>
              <div className="flex items-center gap-2 text-[#EDF2FF]">
                <span className="text-[#8EA6F0] font-bold">✓</span> Position-aware tactics (forks, pins, skewers)
              </div>
              <div className="flex items-center gap-2 text-[#EDF2FF]">
                <span className="text-amber-400 font-bold">✓</span> Engine alternatives with Coach's Ideas
              </div>
            </div>
            <button
              onClick={() => onStartReview(selectedDepth, forceFresh)}
              disabled={totalPlies === 0}
              className="mt-1 py-2 px-5 bg-[#6685DB] hover:bg-[#5774C9] text-white font-bold text-xs rounded-xl transition shadow-sm active:scale-[0.99] flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Game Review Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
