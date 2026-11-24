import React, { useEffect, useMemo, useRef } from 'react';
import { TreeNode, VariationTree } from '../services/tree/variationTree';
import { GameMetadata, GameReviewReport } from '../types/chess';
import { GitBranch } from 'lucide-react';
import { getClassificationStyle } from '../services/review/classificationDisplay';
import { identifyOpeningFromPath } from '../services/openings/openingService';
import { OpeningBanner } from './OpeningBanner';

interface MoveHistoryProps {
  tree: VariationTree;
  currentNodeId: string;
  metadata?: GameMetadata;
  reviewReport?: GameReviewReport | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  onSelectNode: (nodeId: string) => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  tree,
  currentNodeId,
  metadata,
  reviewReport,
  isCheckmate,
  isDraw,
  isStalemate,
  onSelectNode,
}) => {
  const activeMoveRef = useRef<HTMLButtonElement>(null);

  // Build the active line from root following the currently selected path
  const pathToCurrent = tree.getPathToNode(currentNodeId);

  // Identify opening progressively along the path from root to current node
  const currentOpening = useMemo(() => {
    return identifyOpeningFromPath(pathToCurrent);
  }, [pathToCurrent]);

  // Continue following primary continuation down to leaf for a complete view
  const fullActiveLine: TreeNode[] = [...pathToCurrent];
  let tail = pathToCurrent[pathToCurrent.length - 1];
  while (tail && tail.children.length > 0) {
    const nextNode = tree.getNode(tail.children[0]);
    if (!nextNode) break;
    fullActiveLine.push(nextNode);
    tail = nextNode;
  }

  // Remove root (ply 0)
  const movesInLine = fullActiveLine.filter((n) => n.id !== 'root');

  // Group into turns (white move + optional black move)
  interface TurnGroup {
    moveNumber: number;
    white?: TreeNode;
    black?: TreeNode;
  }

  const turns: TurnGroup[] = [];
  for (let i = 0; i < movesInLine.length; i++) {
    const node = movesInLine[i];
    if (node.color === 'w') {
      turns.push({ moveNumber: node.moveNumber, white: node });
    } else {
      if (turns.length > 0 && !turns[turns.length - 1].black && turns[turns.length - 1].moveNumber === node.moveNumber) {
        turns[turns.length - 1].black = node;
      } else {
        turns.push({ moveNumber: node.moveNumber, black: node });
      }
    }
  }

  // Auto-scroll to active move
  useEffect(() => {
    if (activeMoveRef.current) {
      activeMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentNodeId]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden text-xs text-[#F3EFFB]">
      {/* Game Header Metadata */}
      {metadata && (metadata.white || metadata.black) && (
        <div className="p-2.5 sm:p-3 bg-[#171525] border-b border-[#443B60] flex items-center justify-between text-xs shrink-0">
          <div className="font-semibold text-[#F3EFFB] truncate max-w-[240px] flex items-center gap-1.5">
            <span className="truncate">{metadata.white || 'White'}</span>
            {metadata.whiteElo && <span className="text-[#B8AFD1] text-[10px] font-mono">({metadata.whiteElo})</span>}
            <span className="text-[#8C81A8] font-normal text-[10px]">vs</span>
            <span className="truncate">{metadata.black || 'Black'}</span>
            {metadata.blackElo && <span className="text-[#B8AFD1] text-[10px] font-mono">({metadata.blackElo})</span>}
          </div>
          {metadata.result && (
            <span className="font-mono font-bold text-[#B7A5E8] bg-[#B7A5E8]/15 px-2 py-0.5 rounded-md border border-[#B7A5E8]/25 text-xs">
              {metadata.result}
            </span>
          )}
        </div>
      )}

      {/* Opening Recognition Banner */}
      <OpeningBanner opening={currentOpening} />

      {/* Move List Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 space-y-0.5 overscroll-contain">
        {turns.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#B8AFD1] italic text-[11px]">
            <span>Start position</span>
            <span className="text-[10px] mt-1 text-[#8C81A8]">Play a move on the board to begin analysis.</span>
          </div>
        ) : (
          turns.map((turn) => {
            const isWhiteActive = turn.white?.id === currentNodeId;
            const isBlackActive = turn.black?.id === currentNodeId;

            // Check if either node has alternative variations
            const whiteParent = turn.white?.parentId ? tree.getNode(turn.white.parentId) : null;
            const hasWhiteVariations = whiteParent && whiteParent.children.length > 1;

            const blackParent = turn.black?.parentId ? tree.getNode(turn.black.parentId) : null;
            const hasBlackVariations = blackParent && blackParent.children.length > 1;

            const getMoveClassification = (node?: TreeNode) => {
              if (!node || node.id === 'root') return undefined;
              if (node.classification) return node.classification;
              if (node.review?.classification) return node.review.classification;
              if (reviewReport?.moves && tree.isMainlineNode(node.id)) {
                const step = reviewReport.moves.find(
                  (m) => m.ply === node.ply && (m.uci === node.uci || m.san === node.san)
                );
                if (step?.classification) return step.classification;
              }
              return undefined;
            };

            const whiteStyle = getClassificationStyle(getMoveClassification(turn.white));
            const blackStyle = getClassificationStyle(getMoveClassification(turn.black));

            return (
              <div 
                key={`${turn.moveNumber}-${turn.white?.id || ''}`} 
                className="grid grid-cols-[36px_1fr_1fr] sm:grid-cols-[42px_1fr_1fr] items-center py-0.5 px-1 rounded-xl hover:bg-white/[0.03] font-mono text-xs transition"
              >
                {/* Move Number */}
                <span className="text-[#8C81A8] font-semibold text-xs text-center">{turn.moveNumber}.</span>

                {/* White Move */}
                {turn.white ? (
                  <button
                    ref={isWhiteActive ? activeMoveRef : null}
                    onClick={() => onSelectNode(turn.white!.id)}
                    className={`py-1.5 px-2 rounded-xl text-left transition font-semibold flex items-center justify-between gap-1 overflow-hidden min-h-[34px] ${
                      isWhiteActive
                        ? 'bg-[#B7A5E8]/20 text-[#F3EFFB] font-bold border border-[#B7A5E8]/40 shadow-xs'
                        : 'text-[#F3EFFB] hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="truncate text-xs">
                        {turn.white.san}
                        {turn.white.nag && <span className="text-[#B7A5E8] ml-0.5">{turn.white.nag}</span>}
                      </span>
                      {whiteStyle && (
                        <span 
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono border shrink-0 ${whiteStyle.badgeBg} ${whiteStyle.badgeText} ${whiteStyle.badgeBorder}`}
                          title={`${whiteStyle.label} (${whiteStyle.symbol}): ${whiteStyle.description}`}
                        >
                          <span className="font-bold">{whiteStyle.symbol}</span>
                          <span className="font-sans font-medium text-[9px] hidden md:inline">{whiteStyle.label}</span>
                        </span>
                      )}
                    </div>
                    {hasWhiteVariations && (
                      <span className="text-[10px] text-[#B7A5E8] ml-1 shrink-0" title="Has alternative branches">
                        <GitBranch className="w-3 h-3 inline" />
                      </span>
                    )}
                  </button>
                ) : (
                  <span />
                )}

                {/* Black Move */}
                {turn.black ? (
                  <button
                    ref={isBlackActive ? activeMoveRef : null}
                    onClick={() => onSelectNode(turn.black!.id)}
                    className={`py-1.5 px-2 rounded-xl text-left transition font-semibold flex items-center justify-between gap-1 overflow-hidden min-h-[34px] ${
                      isBlackActive
                        ? 'bg-[#B7A5E8]/20 text-[#F3EFFB] font-bold border border-[#B7A5E8]/40 shadow-xs'
                        : 'text-[#F3EFFB] hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      <span className="truncate">
                        {turn.black.san}
                        {turn.black.nag && <span className="text-[#B7A5E8] ml-0.5">{turn.black.nag}</span>}
                      </span>
                      {blackStyle && (
                        <span 
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-mono border shrink-0 ${blackStyle.badgeBg} ${blackStyle.badgeText} ${blackStyle.badgeBorder}`}
                          title={`${blackStyle.label} (${blackStyle.symbol}): ${blackStyle.description}`}
                        >
                          <span className="font-bold">{blackStyle.symbol}</span>
                          <span className="font-sans font-medium text-[8px] hidden md:inline">{blackStyle.label}</span>
                        </span>
                      )}
                    </div>
                    {hasBlackVariations && (
                      <span className="text-[9px] text-[#B7A5E8] ml-1 shrink-0" title="Has alternative branches">
                        <GitBranch className="w-2.5 h-2.5 inline" />
                      </span>
                    )}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Game State Banner */}
      {(isCheckmate || isStalemate || isDraw) && (
        <div className="p-2.5 bg-[#171525] border-t border-[#443B60] text-center font-bold text-[11px]">
          {isCheckmate && (
            <span className="text-[#F3EFFB] bg-[#d3503c]/20 px-3 py-1 rounded-xl border border-[#d3503c]/40 flex items-center justify-center gap-1.5">
              <span>♚ Checkmate!</span>
            </span>
          )}
          {isStalemate && <span className="text-[#B7A5E8] font-bold">Draw by Stalemate</span>}
          {isDraw && !isStalemate && <span className="text-[#B7A5E8] font-bold">Draw</span>}
        </div>
      )}
    </div>
  );
};
