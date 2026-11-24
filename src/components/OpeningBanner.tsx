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
      className="px-3 py-2 bg-[#171525] border-b border-[#443B60] flex items-center justify-between text-xs select-none shrink-0"
      title={opening.fullName}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <BookOpen 
          className={`w-3.5 h-3.5 shrink-0 ${
            isUnclassified ? 'text-[#8C81A8]' : 'text-[#B7A5E8]'
          }`} 
        />
        <div className="min-w-0 flex-1 truncate">
          <div className={`font-semibold text-xs truncate ${
            isUnclassified ? 'text-[#B8AFD1]' : 'text-[#F3EFFB]'
          }`}>
            {opening.name}
          </div>
          {!isStart && !isUnclassified && (opening.variation || opening.eco) && (
            <div className="text-[10px] text-[#B8AFD1] font-normal truncate">
              {opening.variation ? `${opening.variation} · ECO ${opening.eco}` : `ECO ${opening.eco}`}
            </div>
          )}
        </div>
      </div>

      {!isStart && !isUnclassified && opening.eco && (
        <span className="font-mono text-[10px] font-bold text-[#B7A5E8] bg-[#B7A5E8]/15 px-2 py-0.5 rounded-full border border-[#B7A5E8]/25 shrink-0 ml-2 shadow-xs">
          {opening.eco}
        </span>
      )}
    </div>
  );
};
