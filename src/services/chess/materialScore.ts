export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q';

export interface CapturedPieceGroup {
  type: PieceType;
  count: number;
}

export interface MaterialResult {
  whiteMaterial: number;
  blackMaterial: number;
  advantage: number; // positive = White ahead, negative = Black ahead, 0 = equal
  whiteAdvantage: number; // positive number if White is ahead, else 0
  blackAdvantage: number; // positive number if Black is ahead, else 0
  whiteCaptured: CapturedPieceGroup[]; // Black pieces captured by White
  blackCaptured: CapturedPieceGroup[]; // White pieces captured by Black
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

const INITIAL_PIECE_COUNTS: Record<PieceType, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
};

const ORDERED_PIECE_TYPES: PieceType[] = ['p', 'n', 'b', 'r', 'q'];

/**
 * Calculates material totals, advantage score, and captured piece counts from a FEN string.
 * Standard piece values: Pawn=1, Knight=3, Bishop=3, Rook=5, Queen=9, King=0.
 */
export function calculateMaterial(fen: string): MaterialResult {
  const whiteCounts: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  const blackCounts: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

  if (fen) {
    const placement = fen.split(' ')[0] || '';
    for (let i = 0; i < placement.length; i++) {
      const char = placement[i];
      switch (char) {
        case 'P': whiteCounts.p++; break;
        case 'N': whiteCounts.n++; break;
        case 'B': whiteCounts.b++; break;
        case 'R': whiteCounts.r++; break;
        case 'Q': whiteCounts.q++; break;
        case 'p': blackCounts.p++; break;
        case 'n': blackCounts.n++; break;
        case 'b': blackCounts.b++; break;
        case 'r': blackCounts.r++; break;
        case 'q': blackCounts.q++; break;
        default: break;
      }
    }
  }

  // Calculate material points on the board
  let whiteMaterial = 0;
  let blackMaterial = 0;
  for (const t of ORDERED_PIECE_TYPES) {
    whiteMaterial += whiteCounts[t] * PIECE_VALUES[t];
    blackMaterial += blackCounts[t] * PIECE_VALUES[t];
  }

  const advantage = whiteMaterial - blackMaterial;
  const whiteAdvantage = advantage > 0 ? advantage : 0;
  const blackAdvantage = advantage < 0 ? -advantage : 0;

  // Pieces captured by White (missing Black pieces)
  const whiteCaptured: CapturedPieceGroup[] = [];
  for (const t of ORDERED_PIECE_TYPES) {
    const lost = Math.max(0, INITIAL_PIECE_COUNTS[t] - blackCounts[t]);
    if (lost > 0) {
      whiteCaptured.push({ type: t, count: lost });
    }
  }

  // Pieces captured by Black (missing White pieces)
  const blackCaptured: CapturedPieceGroup[] = [];
  for (const t of ORDERED_PIECE_TYPES) {
    const lost = Math.max(0, INITIAL_PIECE_COUNTS[t] - whiteCounts[t]);
    if (lost > 0) {
      blackCaptured.push({ type: t, count: lost });
    }
  }

  return {
    whiteMaterial,
    blackMaterial,
    advantage,
    whiteAdvantage,
    blackAdvantage,
    whiteCaptured,
    blackCaptured,
  };
}
