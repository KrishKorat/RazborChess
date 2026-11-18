import { MoveClassification } from '../../types/chess';

export interface ClassificationStyle {
  label: string;
  symbol: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  hex: string;
  sourceHighlight: string;
  targetHighlight: string;
  description: string;
}

export const CLASSIFICATION_CONFIG: Record<MoveClassification, ClassificationStyle> = {
  brilliant: {
    label: 'Brilliant',
    symbol: '!!',
    badgeBg: 'bg-[#0F766E]/25',
    badgeText: 'text-[#2DD4BF]',
    badgeBorder: 'border-[#2DD4BF]/50',
    dotColor: '#1baca6',
    hex: '#1baca6',
    sourceHighlight: 'rgba(27, 172, 166, 0.40)',
    targetHighlight: 'rgba(27, 172, 166, 0.65)',
    description: 'Top engine move finding a sound, decisive piece sacrifice',
  },
  great: {
    label: 'Great',
    symbol: '!',
    badgeBg: 'bg-[#1D4ED8]/25',
    badgeText: 'text-[#60A5FA]',
    badgeBorder: 'border-[#60A5FA]/50',
    dotColor: '#3b82f6',
    hex: '#3b82f6',
    sourceHighlight: 'rgba(59, 130, 246, 0.40)',
    targetHighlight: 'rgba(59, 130, 246, 0.65)',
    description: 'Exceptional find; the only move maintaining advantage or saving the game',
  },
  best: {
    label: 'Best',
    symbol: '★',
    badgeBg: 'bg-[#15803D]/25',
    badgeText: 'text-[#4ADE80]',
    badgeBorder: 'border-[#4ADE80]/50',
    dotColor: '#81b64c',
    hex: '#81b64c',
    sourceHighlight: 'rgba(129, 182, 76, 0.40)',
    targetHighlight: 'rgba(129, 182, 76, 0.65)',
    description: 'Engine first choice with zero centipawn loss',
  },
  excellent: {
    label: 'Excellent',
    symbol: '✓',
    badgeBg: 'bg-[#3F6212]/25',
    badgeText: 'text-[#A3E635]',
    badgeBorder: 'border-[#A3E635]/50',
    dotColor: '#629924',
    hex: '#629924',
    sourceHighlight: 'rgba(98, 153, 36, 0.40)',
    targetHighlight: 'rgba(98, 153, 36, 0.65)',
    description: 'Virtually as strong as the top engine recommendation',
  },
  good: {
    label: 'Good',
    symbol: '•',
    badgeBg: 'bg-[#334155]/50',
    badgeText: 'text-[#CBD5E1]',
    badgeBorder: 'border-[#64748B]/50',
    dotColor: '#64748b',
    hex: '#64748b',
    sourceHighlight: 'rgba(100, 116, 139, 0.35)',
    targetHighlight: 'rgba(100, 116, 139, 0.60)',
    description: 'Solid, playable move with minimal loss',
  },
  book: {
    label: 'Book',
    symbol: '📖',
    badgeBg: 'bg-[#6B21A8]/25',
    badgeText: 'text-[#C084FC]',
    badgeBorder: 'border-[#C084FC]/50',
    dotColor: '#a855f7',
    hex: '#a855f7',
    sourceHighlight: 'rgba(168, 85, 247, 0.40)',
    targetHighlight: 'rgba(168, 85, 247, 0.65)',
    description: 'Established opening book move following chess theory',
  },
  forced: {
    label: 'Forced',
    symbol: '⚡',
    badgeBg: 'bg-[#1E3A8A]/35',
    badgeText: 'text-[#93C5FD]',
    badgeBorder: 'border-[#60A5FA]/50',
    dotColor: '#457b9d',
    hex: '#457b9d',
    sourceHighlight: 'rgba(69, 123, 157, 0.40)',
    targetHighlight: 'rgba(69, 123, 157, 0.65)',
    description: 'The only legal move available in this position',
  },
  inaccuracy: {
    label: 'Inaccuracy',
    symbol: '?!',
    badgeBg: 'bg-[#78350F]/30',
    badgeText: 'text-[#FBBF24]',
    badgeBorder: 'border-[#FBBF24]/50',
    dotColor: '#e5b338',
    hex: '#e5b338',
    sourceHighlight: 'rgba(229, 179, 56, 0.40)',
    targetHighlight: 'rgba(229, 179, 56, 0.65)',
    description: 'Suboptimal move giving up an edge or tactical chance',
  },
  mistake: {
    label: 'Mistake',
    symbol: '?',
    badgeBg: 'bg-[#7C2D12]/30',
    badgeText: 'text-[#FB923C]',
    badgeBorder: 'border-[#FB923C]/50',
    dotColor: '#ea580c',
    hex: '#ea580c',
    sourceHighlight: 'rgba(234, 88, 12, 0.40)',
    targetHighlight: 'rgba(234, 88, 12, 0.65)',
    description: 'Noticeable error that worsens the position significantly',
  },
  blunder: {
    label: 'Blunder',
    symbol: '??',
    badgeBg: 'bg-[#7F1D1D]/30',
    badgeText: 'text-[#F87171]',
    badgeBorder: 'border-[#F87171]/50',
    dotColor: '#dc2626',
    hex: '#dc2626',
    sourceHighlight: 'rgba(220, 38, 38, 0.40)',
    targetHighlight: 'rgba(220, 38, 38, 0.65)',
    description: 'Disastrous mistake losing critical material or throwing the game away',
  },
  missed_win: {
    label: 'Missed Win',
    symbol: '✕',
    badgeBg: 'bg-[#831843]/30',
    badgeText: 'text-[#F472B6]',
    badgeBorder: 'border-[#F472B6]/50',
    dotColor: '#db2777',
    hex: '#db2777',
    sourceHighlight: 'rgba(219, 39, 119, 0.40)',
    targetHighlight: 'rgba(219, 39, 119, 0.65)',
    description: 'Critical miss that squandered a forced checkmate or winning edge',
  },
};

export function getClassificationStyle(classification?: MoveClassification): ClassificationStyle | null {
  if (!classification || !CLASSIFICATION_CONFIG[classification]) {
    return null;
  }
  return CLASSIFICATION_CONFIG[classification];
}

export function getClassificationSquareHighlight(classification: MoveClassification): {
  sourceRgba: string;
  targetRgba: string;
  hex: string;
} {
  const conf = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG.best;
  return {
    sourceRgba: conf.sourceHighlight,
    targetRgba: conf.targetHighlight,
    hex: conf.hex,
  };
}
