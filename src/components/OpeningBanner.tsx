import React from 'react';
import { BookOpen } from 'lucide-react';
import { OpeningInfo } from '../services/openings/openingService';

interface OpeningBannerProps {
  opening: OpeningInfo;
}

export const OpeningBanner: React.FC<OpeningBannerProps> = ({ opening }) => {
  const isStart = opening.name === 'Starting Position';
  const isUnclassified = opening.name === 'Unclassified Opening';

  return (
    <div 
      className="px-3 py-2 bg-[#131E36] border-b border-[#304263] flex items-center justify-between text-xs select-none shrink-0"
      title={opening.fullName}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <BookOpen 
          className={`w-3.5 h-3.5 shrink-0 ${
            isUnclassified ? 'text-[#9AAAC9]' : 'text-[#8EA6F0]'
          }`} 
        />
        <div className="min-w-0 flex-1 truncate">
          <div className={`font-semibold text-xs truncate ${
            isUnclassified ? 'text-[#9AAAC9]' : 'text-[#EDF2FF]'
          }`}>
            {opening.name}
          </div>
          {!isStart && !isUnclassified && (opening.variation || opening.eco) && (
            <div className="text-[11px] text-[#9AAAC9] truncate">
              {opening.variation ? `${opening.variation} · ECO ${opening.eco}` : `ECO ${opening.eco}`}
            </div>
          )}
        </div>
      </div>

      {!isStart && !isUnclassified && opening.eco && (
        <span className="font-mono text-[10px] font-bold text-[#C5D5FA] bg-[#202F50] px-2 py-0.5 rounded-full border border-[#304263] shrink-0 ml-2">
          {opening.eco}
        </span>
      )}
    </div>
  );
};
