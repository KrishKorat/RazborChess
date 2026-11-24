import React from 'react';
import { TreeNode } from '../services/tree/variationTree';
import { GameReviewReport } from '../types/chess';
import { getClassificationStyle } from '../services/review/classificationDisplay';

interface CurrentMovePanelProps {
  currentNode: TreeNode;
  isFlipped?: boolean;
  reviewReport?: GameReviewReport | null;
}

export const CurrentMovePanel: React.FC<CurrentMovePanelProps> = ({
  currentNode,
  reviewReport,
}) => {
  const isRoot = currentNode.id === 'root';
  const review = currentNode.review || (
    reviewReport?.moves.find((m) => m.ply === currentNode.ply && (m.uci.toLowerCase() === currentNode.uci.toLowerCase() || m.san === currentNode.san))
  );
  const style = getClassificationStyle(review?.classification || (currentNode as any)?.classification);

  if (isRoot) {
    return (
      <div className="w-full bg-[#292440] border border-[#443B60] rounded-xl px-3 py-2 flex items-center justify-between text-xs text-[#F3EFFB] shadow-xs">
        <span className="font-semibold text-[#F3EFFB] flex items-center gap-1.5 tracking-wide">
          <span>Starting Position</span>
        </span>
        <span className="text-[11px] text-[#B8AFD1] font-mono">White to move</span>
      </div>
    );
  }

  const isWhite = currentNode.color === 'w';
  const playerLabel = isWhite ? 'White' : 'Black';
  const moveLabel = `${currentNode.moveNumber}${isWhite ? '.' : '...'} ${currentNode.san}`;

  return (
    <div className="w-full bg-[#292440] border border-[#443B60] rounded-xl p-2 sm:p-2.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs text-[#F3EFFB]">
      {/* Left Side: Played Move & Classification */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[#B8AFD1] font-mono text-[11px]">Move:</span>
          <span className="font-bold text-[#F3EFFB] font-mono text-sm">{moveLabel}</span>
          <span className="text-[#B8AFD1] text-[10px]">({playerLabel})</span>
        </div>

        {style && review ? (
          <div 
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}
            title={style.description}
          >
            <span className="font-bold text-sm leading-none">{style.symbol}</span>
            <span>{style.label}</span>
          </div>
        ) : (
          <span className="text-[10px] text-[#B8AFD1] italic bg-[#201D35] px-2 py-0.5 rounded-md border border-[#443B60]">
            Unreviewed
          </span>
        )}
      </div>

      {/* Right Side: Engine Recommendation & Evaluation Impact */}
      {review ? (
        <div className="flex items-center gap-3 text-[11px] font-mono flex-wrap">
          {review.bestMoveSan && review.classification !== 'best' && review.classification !== 'book' && review.classification !== 'brilliant' && (
            <div className="flex items-center gap-1 text-[#F3EFFB] bg-[#201D35] px-2 py-0.5 rounded-lg border border-[#443B60]">
              <span className="text-[#B8AFD1] text-[10px]">Best:</span>
              <span className="text-[#81b64c] font-bold">{review.bestMoveSan}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-[#B8AFD1]">
            {review.centipawnLoss > 0 && (
              <span className="text-[#d3503c] font-bold">
                -{review.centipawnLoss} cp
              </span>
            )}
            <span className="text-[#F3EFFB]">
              Win: <span className="font-bold text-[#B7A5E8]">{review.winRateAfter}%</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-[#B8AFD1] font-sans">
          Run Game Review to analyze this move
        </div>
      )}
    </div>
  );
};
