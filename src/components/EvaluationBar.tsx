import React from 'react';
import { scoreToWinPercentage } from '../services/engine/uciParser';

interface EvaluationBarProps {
  scoreCp: number;
  mate?: number;
  isFlipped: boolean;
  isSearching: boolean;
  hasEvaluation: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  scoreCp,
  mate,
  isFlipped,
  hasEvaluation,
}) => {
  // Compute win percentage from White's perspective (0 to 100)
  const whiteWinRate = hasEvaluation ? scoreToWinPercentage(scoreCp, mate) : 50;

  // Format label text
  const formatScore = (): string => {
    if (!hasEvaluation) return '0.0';
    if (typeof mate === 'number') {
      return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
    }
    const pawns = scoreCp / 100;
    return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  };

  const scoreText = formatScore();

  // If flipped, black is at the bottom and white is at the top
  const bottomHeight = isFlipped ? 100 - whiteWinRate : whiteWinRate;
  const bottomIsWhite = !isFlipped;

  return (
    <div 
      className="w-5 sm:w-6 md:w-7 h-full bg-[#201D35] rounded-xl overflow-hidden flex flex-col border border-[#443B60] relative shadow-sm select-none shrink-0"
      title={`Evaluation: ${scoreText} (White ${whiteWinRate.toFixed(1)}% win probability)`}
    >
      {/* Top Section */}
      <div
        className={`w-full transition-all duration-300 ease-out relative flex items-start justify-center pt-1 overflow-hidden ${
          bottomIsWhite ? 'bg-[#171525]' : 'bg-[#F3EFFB]'
        }`}
        style={{ height: `${100 - bottomHeight}%` }}
      >
        {/* Score label in top section if top section is dominant (> 50%) */}
        {(100 - bottomHeight) > 50 && (
          <span className={`text-[8px] sm:text-[9px] font-mono font-bold leading-none ${
            bottomIsWhite ? 'text-[#B8AFD1]' : 'text-[#171525]'
          }`}>
            {scoreText}
          </span>
        )}
      </div>

      {/* Center Equality Marker Line: subtle lavender accent */}
      <div className="w-full h-[1.5px] bg-[#B7A5E8]/60 z-10" />

      {/* Bottom Section */}
      <div
        className={`w-full transition-all duration-300 ease-out relative flex items-end justify-center pb-1 overflow-hidden ${
          bottomIsWhite ? 'bg-[#F3EFFB]' : 'bg-[#171525]'
        }`}
        style={{ height: `${bottomHeight}%` }}
      >
        {/* Score label in bottom section if bottom section is dominant (>= 50%) */}
        {bottomHeight >= 50 && (
          <span className={`text-[8px] sm:text-[9px] font-mono font-bold leading-none ${
            bottomIsWhite ? 'text-[#171525]' : 'text-[#B8AFD1]'
          }`}>
            {scoreText}
          </span>
        )}
      </div>
    </div>
  );
};
