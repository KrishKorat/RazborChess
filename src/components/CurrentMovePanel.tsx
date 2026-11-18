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
      <div className="w-full bg-[#1C2949] border border-[#344567] rounded-md px-3 py-2 flex items-center justify-between text-xs text-[#F3F5FF] shadow-sm">
        <span className="font-semibold text-[#F3F5FF] flex items-center gap-1.5">
          <span>Starting Position</span>
        </span>
        <span className="text-[11px] text-[#A7B3D0] font-mono">White to move</span>
      </div>
    );
  }

  const isWhite = currentNode.color === 'w';
  const playerLabel = isWhite ? 'White' : 'Black';
  const moveLabel = `${currentNode.moveNumber}${isWhite ? '.' : '...'} ${currentNode.san}`;

  return (
    <div className="w-full bg-[#1C2949] border border-[#344567] rounded-md p-2 sm:p-2.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm text-[#F3F5FF]">
      {/* Left Side: Played Move & Classification */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[#A7B3D0] font-mono text-[11px]">Move:</span>
          <span className="font-bold text-[#F3F5FF] font-mono text-sm">{moveLabel}</span>
          <span className="text-[#A7B3D0] text-[10px]">({playerLabel})</span>
        </div>

        {style && review ? (
          <div 
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}
            title={style.description}
          >
            <span className="font-bold text-sm leading-none">{style.symbol}</span>
            <span>{style.label}</span>
          </div>
        ) : (
          <span className="text-[10px] text-[#A7B3D0] italic bg-[#151F3B] px-2 py-0.5 rounded border border-[#344567]">
            Unreviewed
          </span>
        )}
      </div>

      {/* Right Side: Engine Recommendation & Evaluation Impact */}
      {review ? (
        <div className="flex items-center gap-3 text-[11px] font-mono flex-wrap">
          {review.bestMoveSan && review.classification !== 'best' && review.classification !== 'book' && review.classification !== 'brilliant' && (
            <div className="flex items-center gap-1 text-[#F3F5FF] bg-[#151F3B] px-2 py-0.5 rounded border border-[#344567]">
              <span className="text-[#A7B3D0] text-[10px]">Best:</span>
              <span className="text-[#7895E8] font-bold">{review.bestMoveSan}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-[#A7B3D0]">
            {review.centipawnLoss > 0 && (
              <span className="text-[#FCA5A5] font-semibold">
                -{review.centipawnLoss} cp
              </span>
            )}
            <span className="text-[#F3F5FF]">
              Win: <span className="font-bold text-[#A9B8F2]">{review.winRateAfter}%</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-[#A7B3D0] font-sans">
          Run Game Review to analyze this move
        </div>
      )}
    </div>
  );
};
