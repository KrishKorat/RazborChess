import React from 'react';
import { Square } from 'chess.js';
import { MoveClassification } from '../types/chess';

interface BoardClassificationMarkerProps {
  square: Square;
  classification: MoveClassification;
  boardWidth: number;
  isFlipped: boolean;
}

interface MarkerStyle {
  bgColor: string;
  borderColor: string;
  textColor: string;
  symbol: string;
  icon?: React.ReactNode;
  label: string;
}

export const BoardClassificationMarker: React.FC<BoardClassificationMarkerProps> = ({
  square,
  classification,
  boardWidth,
  isFlipped,
}) => {
  if (!square || square.length < 2) return null;

  const squareSize = boardWidth / 8;
  const fileIdx = square.charCodeAt(0) - 97; // 0 for 'a', 7 for 'h'
  const rankIdx = 8 - parseInt(square[1], 10); // 0 for '8', 7 for '1'

  const col = isFlipped ? 7 - fileIdx : fileIdx;
  const row = isFlipped ? 7 - rankIdx : rankIdx;

  // Calculate position: anchor at top-right corner of the target square
  const badgeSize = Math.max(16, Math.min(24, Math.round(squareSize * 0.32)));
  const left = col * squareSize + squareSize - badgeSize - 2;
  const top = row * squareSize + 2;

  const getMarkerConfig = (cls: MoveClassification): MarkerStyle => {
    switch (cls) {
      case 'brilliant':
        return {
          bgColor: '#1baca6',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '!!',
          label: 'Brilliant',
        };
      case 'great':
        return {
          bgColor: '#3b82f6',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '!',
          label: 'Great',
        };
      case 'best':
        return {
          bgColor: '#81b64c',
          borderColor: '#ffffff',
          textColor: '#1a1a18',
          symbol: '★',
          label: 'Best',
        };
      case 'forced':
        return {
          bgColor: '#457b9d',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '⚡',
          label: 'Forced',
        };
      case 'excellent':
        return {
          bgColor: '#629924',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '✓',
          label: 'Excellent',
        };
      case 'good':
        return {
          bgColor: '#64748b',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '•',
          label: 'Good',
        };
      case 'book':
        return {
          bgColor: '#a855f7',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '📖',
          label: 'Book',
        };
      case 'inaccuracy':
        return {
          bgColor: '#e5b338',
          borderColor: '#ffffff',
          textColor: '#1a1a18',
          symbol: '?!',
          label: 'Inaccuracy',
        };
      case 'mistake':
        return {
          bgColor: '#ea580c',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '?',
          label: 'Mistake',
        };
      case 'blunder':
        return {
          bgColor: '#dc2626',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '??',
          label: 'Blunder',
        };
      case 'missed_win':
        return {
          bgColor: '#db2777',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '✕',
          label: 'Missed Win',
        };
      default:
        return {
          bgColor: '#81b64c',
          borderColor: '#ffffff',
          textColor: '#ffffff',
          symbol: '★',
          label: 'Best',
        };
    }
  };

  const config = getMarkerConfig(classification);
  const isEmoji = config.symbol === '📖';

  return (
    <div
      data-testid={`board-classification-${classification}`}
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${badgeSize}px`,
        height: `${badgeSize}px`,
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: config.textColor,
      }}
      className="rounded-full border-[1.5px] shadow-[0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center font-bold pointer-events-none select-none z-20 transition-all duration-150"
      title={`${config.label} (${config.symbol}) on ${square}`}
    >
      <span
        style={{
          fontSize: isEmoji ? `${Math.round(badgeSize * 0.6)}px` : `${Math.round(badgeSize * 0.55)}px`,
          lineHeight: 1,
        }}
        className="font-mono font-black"
      >
        {config.symbol}
      </span>
    </div>
  );
};
