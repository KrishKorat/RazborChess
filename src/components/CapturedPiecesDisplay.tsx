import React from 'react';
import { CapturedPieceGroup, PieceType } from '../services/chess/materialScore';

interface CapturedPiecesDisplayProps {
  captured: CapturedPieceGroup[];
  pieceColor: 'w' | 'b'; // Color of the captured pieces (the pieces lost by the opponent)
  advantage?: number; // Point advantage (> 0 to show, e.g. +3)
  testId?: string;
}

/**
 * High-contrast, iconic chess piece SVGs (viewBox 0 0 45 45).
 * - White pieces: Bright white (#FFFFFF) fill with dark slate (#0F172A) crisp outline.
 * - Black pieces: Deep dark (#0A101D) fill with high-contrast lavender (#B7A5E8) outline.
 */
const PieceSvg: React.FC<{ type: PieceType; color: 'w' | 'b' }> = ({ type, color }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#FFFFFF' : '#0a101d';
  const stroke = isWhite ? '#0f172a' : '#B7A5E8';
  const strokeWidth = isWhite ? 1.8 : 2;

  switch (type) {
    case 'p':
      return (
        <svg
          viewBox="0 0 45 45"
          className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0 transition-transform"
          aria-hidden="true"
        >
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'n':
      return (
        <svg
          viewBox="0 0 45 45"
          className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0 transition-transform"
          aria-hidden="true"
        >
          <path
            d="M 22,10 C 32.5,11 38.5,18 38,39 L 14,39 C 14,30 24,32.5 22,18 C 22.4,20.9 17.5,25.4 15,27 C 12,29 12.2,31.3 10,31 C 9,30 11.4,28 10,28 C 9,28 10.2,29.2 9,30 C 8,30 5,31 5,26 C 5,24 11,14 11,14 C 11,14 12.9,12.1 13,10.5 C 12.3,9.5 12.5,8.5 12.5,7.5 C 13.5,6.5 15.5,10 15.5,10 L 17.5,10 C 17.5,10 18.3,8 20,7 C 21,7 21,10 21,10 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <circle cx="13.5" cy="14.5" r="1.3" fill={stroke} />
        </svg>
      );
    case 'b':
      return (
        <svg
          viewBox="0 0 45 45"
          className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0 transition-transform"
          aria-hidden="true"
        >
          <circle cx="22.5" cy="8" r="2.5" fill={fill} stroke={stroke} strokeWidth={isWhite ? 1.5 : 1.8} />
          <path
            d="M 9,36 C 12.4,35 19.1,36.4 22.5,34 C 25.9,36.4 32.6,35 36,36 C 36,36 37.6,36.5 39,38 C 38.3,39 37.3,39 36,38.5 C 32.6,37.5 25.9,39 22.5,37.5 C 19.1,39 12.4,37.5 9,38.5 C 7.6,39 6.7,39 6,38 C 7.3,36.5 9,36 9,36 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <path
            d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <path
            d="M 22.5,15.5 L 22.5,22.5 M 19,19 L 26,19"
            stroke={stroke}
            strokeWidth={isWhite ? 1.5 : 1.8}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'r':
      return (
        <svg
          viewBox="0 0 45 45"
          className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0 transition-transform"
          aria-hidden="true"
        >
          <path
            d="M 9,39 L 36,39 L 36,36 L 9,36 Z M 12,36 L 12,32 L 33,32 L 33,36 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <path
            d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 L 31,17 L 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5 L 14,17 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'q':
      return (
        <svg
          viewBox="0 0 45 45"
          className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0 transition-transform"
          aria-hidden="true"
        >
          <path
            d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <path
            d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <circle cx="6.5" cy="12.5" r="1.5" fill={stroke} />
          <circle cx="14.3" cy="9.8" r="1.5" fill={stroke} />
          <circle cx="22.5" cy="8.8" r="1.5" fill={stroke} />
          <circle cx="30.7" cy="9.8" r="1.5" fill={stroke} />
          <circle cx="38.5" cy="12.5" r="1.5" fill={stroke} />
        </svg>
      );
  }
};

const PIECE_NAMES: Record<PieceType, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
};

export const CapturedPiecesDisplay: React.FC<CapturedPiecesDisplayProps> = ({
  captured,
  pieceColor,
  advantage = 0,
  testId,
}) => {
  if (captured.length === 0 && advantage <= 0) {
    return null;
  }

  const colorLabel = pieceColor === 'w' ? 'White' : 'Black';

  return (
    <div
      data-testid={testId || 'captured-pieces-panel'}
      className="flex items-center gap-1.5 shrink-0 select-none ml-1 sm:ml-2"
    >
      {/* Captured piece icons row */}
      {captured.length > 0 && (
        <div className="flex items-center gap-1 shrink-0" data-testid="captured-piece-icons">
          {captured.map((group) => (
            <div
              key={group.type}
              className="flex items-center gap-0.5 shrink-0"
              title={`${group.count} ${colorLabel} ${PIECE_NAMES[group.type]}${group.count > 1 ? 's' : ''}`}
            >
              <PieceSvg type={group.type} color={pieceColor} />
              {group.count > 1 && (
                <span className="text-[10px] font-bold text-[#B8AFD1] font-mono leading-none select-none">
                  {group.count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Numerical Material Advantage Score (distinct from piece counts) */}
      {advantage > 0 && (
        <span
          data-testid="material-advantage"
          className="text-[11px] font-mono font-bold text-[#B7A5E8] bg-[#B7A5E8]/20 hover:bg-[#B7A5E8]/30 px-1.5 py-0.5 rounded-md border border-[#B7A5E8]/35 leading-none shadow-xs ml-0.5 shrink-0 select-none"
          title={`+${advantage} material point${advantage > 1 ? 's' : ''} advantage`}
        >
          +{advantage}
        </span>
      )}
    </div>
  );
};
