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
      className="w-5 sm:w-6 md:w-7 h-full bg-[#131E36] rounded-xl overflow-hidden flex flex-col border border-[#304263] relative shadow-md select-none shrink-0"
      title={`Evaluation: ${scoreText} (White ${whiteWinRate.toFixed(1)}% win probability)`}
    >
      {/* Top Section */}
      <div
        className={`w-full transition-all duration-300 ease-out relative flex items-start justify-center pt-1 overflow-hidden ${
          bottomIsWhite ? 'bg-[#131E36]' : 'bg-[#DFE7F5]'
        }`}
        style={{ height: `${100 - bottomHeight}%` }}
      >
        {/* Score label in top section if top section is dominant (> 50%) */}
        {(100 - bottomHeight) > 50 && (
          <span className={`text-[8px] sm:text-[9px] font-mono font-bold leading-none ${
            bottomIsWhite ? 'text-[#C5D5FA]' : 'text-[#0D1428]'
          }`}>
            {scoreText}
          </span>
        )}
      </div>

      {/* Center Equality Marker Line */}
      <div className="w-full h-[1.5px] bg-[#8EA6F0] z-10 shadow-xs" />

      {/* Bottom Section */}
      <div
        className={`w-full transition-all duration-300 ease-out relative flex items-end justify-center pb-1 overflow-hidden ${
          bottomIsWhite ? 'bg-[#DFE7F5]' : 'bg-[#131E36]'
        }`}
        style={{ height: `${bottomHeight}%` }}
      >
        {/* Score label in bottom section if bottom section is dominant (>= 50%) */}
        {bottomHeight >= 50 && (
          <span className={`text-[8px] sm:text-[9px] font-mono font-bold leading-none ${
            bottomIsWhite ? 'text-[#0D1428]' : 'text-[#C5D5FA]'
          }`}>
            {scoreText}
          </span>
        )}
      </div>
    </div>
  );
};
