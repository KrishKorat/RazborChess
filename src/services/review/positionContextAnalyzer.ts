import { Chess, Square } from 'chess.js';
import { PieceColor, GameReviewStep } from '../../types/chess';

export interface AttackedPiece {
  square: string;
  type: string;
  name: string;
  color: PieceColor;
  value: number;
  isDefended: boolean;
}

export interface ForkDetail {
  targets: AttackedPiece[];
  hasKing: boolean;
  hasQueen: boolean;
  hasRook: boolean;
  description: string;
}

export interface PinDetail {
  pinnedSquare: string;
  pinnedPieceName: string;
  shieldSquare: string;
  shieldPieceName: string;
  isAbsolute: boolean; // pinned to King
  description: string;
}

export interface SkewerDetail {
  frontSquare: string;
  frontPieceName: string;
  backSquare: string;
  backPieceName: string;
  description: string;
}

export interface DiscoveredAttackDetail {
  sliderSquare: string;
  sliderPieceName: string;
  targetSquare: string;
  targetPieceName: string;
  isCheck: boolean;
  description: string;
}

export interface TacticalContext {
  isCheckmate: boolean;
  isCheck: boolean;
  isDoubleCheck: boolean;
  isDiscoveredCheck: boolean;
  isCastling: boolean;
  isCastlingKingside: boolean;
  isCastlingQueenside: boolean;
  isPromotion: boolean;
  promotedPieceName?: string;
  movedPieceType: string;
  movedPieceName: string;
  fromSquare: string;
  toSquare: string;
  isCapture: boolean;
  capturedPieceType?: string;
  capturedPieceName?: string;
  isRecapture: boolean;
  attacksCreated: AttackedPiece[];
  fork?: ForkDetail;
  pin?: PinDetail;
  skewer?: SkewerDetail;
  discoveredAttack?: DiscoveredAttackDetail;
  isPawnBreak: boolean;
  isPassedPawn: boolean;
  isRookOnOpenFile: boolean;
  isRookOnSemiOpenFile: boolean;
  isRookOn7thRank: boolean;
  isKnightOutpost: boolean;
  isKingCentralized: boolean;
  weakensKingShield: boolean;
  hungPiece?: {
    name: string;
    square: string;
    capturerPieceName?: string;
    capturerSquare?: string;
    isMovePiece: boolean;
    isCompletelyUndefended: boolean;
  };
  mateDelivered: boolean;
  mateAllowed?: { allowed: boolean; movesToMate?: number };
  mateMissed?: { missed: boolean; mateInMoves?: number };
  isSacrifice: boolean;
  sacrificedPieceName?: string;
}

export interface BestMoveAnalysis {
  san: string;
  uci?: string;
  accomplishment: string;
  whyBetter: string;
  tacticalIdea: string;
}

export const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

export function getPieceFullName(type?: string): string {
  switch (type?.toLowerCase()) {
    case 'p': return 'pawn';
    case 'n': return 'knight';
    case 'b': return 'bishop';
    case 'r': return 'rook';
    case 'q': return 'queen';
    case 'k': return 'king';
    default: return 'piece';
  }
}

export function isCenterSquare(square: string): boolean {
  return square === 'e4' || square === 'd4' || square === 'e5' || square === 'd5';
}

export function isExtendedCenter(square: string): boolean {
  const f = square[0];
  const r = parseInt(square[1], 10);
  return (f >= 'c' && f <= 'f') && (r >= 3 && r <= 6);
}

export function findKingSquare(chess: Chess, color: PieceColor): Square | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square;
      }
    }
  }
  return null;
}

export function doesPieceDirectlyAttack(chess: Chess, fromSquare: string, targetSquare: string): boolean {
  const piece = chess.get(fromSquare as Square);
  if (!piece) return false;

  const f1 = fromSquare.charCodeAt(0) - 97;
  const r1 = parseInt(fromSquare[1], 10);
  const f2 = targetSquare.charCodeAt(0) - 97;
  const r2 = parseInt(targetSquare[1], 10);

  const df = f2 - f1;
  const dr = r2 - r1;

  if (piece.type === 'n') {
    return (Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1);
  }

  if (piece.type === 'p') {
    const forward = piece.color === 'w' ? 1 : -1;
    return dr === forward && Math.abs(df) === 1;
  }

  if (piece.type === 'k') {
    return Math.abs(df) <= 1 && Math.abs(dr) <= 1;
  }

  // Sliders: b, r, q
  const isDiagonal = Math.abs(df) === Math.abs(dr) && df !== 0;
  const isStraight = (df === 0 && dr !== 0) || (dr === 0 && df !== 0);

  if ((piece.type === 'b' && !isDiagonal) || (piece.type === 'r' && !isStraight)) {
    return false;
  }
  if (piece.type === 'q' && !isDiagonal && !isStraight) {
    return false;
  }

  // Ray step
  const stepF = df === 0 ? 0 : (df > 0 ? 1 : -1);
  const stepR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);

  let curF = f1 + stepF;
  let curR = r1 + stepR;
  while (curF !== f2 || curR !== r2) {
    const sq = (String.fromCharCode(97 + curF) + curR) as Square;
    if (chess.get(sq)) return false; // Blocked
    curF += stepF;
    curR += stepR;
  }
  return true;
}

/**
 * Checks if a pawn on the given square is passed.
 */
export function isPassedPawn(chess: Chess, square: string, color: PieceColor): boolean {
  const piece = chess.get(square as Square);
  if (!piece || piece.type !== 'p') return false;

  const fileIdx = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10);
  const filesToCheck = [fileIdx - 1, fileIdx, fileIdx + 1].filter((f) => f >= 0 && f <= 7);

  for (let r = 1; r <= 8; r++) {
    const isAhead = color === 'w' ? r > rank : r < rank;
    if (!isAhead) continue;

    for (const f of filesToCheck) {
      const sq = (String.fromCharCode(97 + f) + r) as Square;
      const target = chess.get(sq);
      if (target && target.type === 'p' && target.color !== color) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Detects pins created by the moved piece.
 */
export function detectPins(chess: Chess, toSquare: string, moverColor: PieceColor): PinDetail | undefined {
  const piece = chess.get(toSquare as Square);
  if (!piece || (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q')) return undefined;

  const directions: Array<[number, number]> = [];
  if (piece.type === 'b' || piece.type === 'q') {
    directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  }
  if (piece.type === 'r' || piece.type === 'q') {
    directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
  }

  const file = toSquare.charCodeAt(0) - 97;
  const rank = parseInt(toSquare[1], 10);
  const enemyColor: PieceColor = moverColor === 'w' ? 'b' : 'w';

  for (const [df, dr] of directions) {
    let f = file + df;
    let r = rank + dr;
    let pinnedPiece: { type: string; color: PieceColor } | null = null;
    let pinnedSquare: string | null = null;

    while (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
      const sq = (String.fromCharCode(97 + f) + r) as Square;
      const target = chess.get(sq);
      if (target) {
        if (!pinnedPiece) {
          if (target.color === enemyColor && target.type !== 'k') {
            pinnedPiece = target;
            pinnedSquare = sq;
          } else {
            break;
          }
        } else {
          if (target.color === enemyColor) {
            if (target.type === 'k') {
              return {
                pinnedSquare: pinnedSquare!,
                pinnedPieceName: getPieceFullName(pinnedPiece.type),
                shieldSquare: sq,
                shieldPieceName: 'king',
                isAbsolute: true,
                description: `pins the ${getPieceFullName(pinnedPiece.type)} on ${pinnedSquare} to the king on ${sq}`,
              };
            }
            if (target.type === 'q' && pinnedPiece.type !== 'q') {
              return {
                pinnedSquare: pinnedSquare!,
                pinnedPieceName: getPieceFullName(pinnedPiece.type),
                shieldSquare: sq,
                shieldPieceName: 'queen',
                isAbsolute: false,
                description: `pins the ${getPieceFullName(pinnedPiece.type)} on ${pinnedSquare} to the queen on ${sq}`,
              };
            }
          }
          break;
        }
      }
      f += df;
      r += dr;
    }
  }
  return undefined;
}

/**
 * Detects forks created by the moved piece.
 */
export function detectForks(chess: Chess, toSquare: string, moverColor: PieceColor): ForkDetail | undefined {
  const piece = chess.get(toSquare as Square);
  if (!piece) return undefined;

  const enemyColor: PieceColor = moverColor === 'w' ? 'b' : 'w';
  const file = toSquare.charCodeAt(0) - 97;
  const rank = parseInt(toSquare[1], 10);
  const attackedSquares: string[] = [];

  if (piece.type === 'n') {
    const jumps: Array<[number, number]> = [
      [-1, -2], [-2, -1], [-2, 1], [-1, 2],
      [1, 2], [2, 1], [2, -1], [1, -2],
    ];
    for (const [df, dr] of jumps) {
      const f = file + df;
      const r = rank + dr;
      if (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
        attackedSquares.push(String.fromCharCode(97 + f) + r);
      }
    }
  } else if (piece.type === 'p') {
    const dr = moverColor === 'w' ? 1 : -1;
    for (const df of [-1, 1]) {
      const f = file + df;
      const r = rank + dr;
      if (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
        attackedSquares.push(String.fromCharCode(97 + f) + r);
      }
    }
  } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
    const directions: Array<[number, number]> = [];
    if (piece.type === 'b' || piece.type === 'q') directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    if (piece.type === 'r' || piece.type === 'q') directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    for (const [df, dr] of directions) {
      let f = file + df;
      let r = rank + dr;
      while (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
        const sq = String.fromCharCode(97 + f) + r;
        attackedSquares.push(sq);
        if (chess.get(sq as Square)) break;
        f += df;
        r += dr;
      }
    }
  }

  const targets: AttackedPiece[] = [];
  for (const sq of attackedSquares) {
    const target = chess.get(sq as Square);
    if (target && target.color === enemyColor) {
      const isDefended = chess.isAttacked(sq as Square, enemyColor);
      targets.push({
        square: sq,
        type: target.type,
        name: getPieceFullName(target.type),
        color: target.color,
        value: PIECE_VALUES[target.type] || 0,
        isDefended,
      });
    }
  }

  // A fork attacks at least 2 pieces of meaningful value (or King + piece, or 2 minor/major pieces)
  if (targets.length >= 2) {
    const hasKing = targets.some((t) => t.type === 'k');
    const hasQueen = targets.some((t) => t.type === 'q');
    const hasRook = targets.some((t) => t.type === 'r');
    const highValueTargets = targets.filter((t) => t.type === 'k' || t.value >= (PIECE_VALUES[piece.type] || 1) || !t.isDefended);

    if (hasKing || highValueTargets.length >= 2) {
      let desc = '';
      if (hasKing && hasQueen) {
        desc = `forks the king and queen`;
      } else if (hasKing && hasRook) {
        desc = `forks the king and rook`;
      } else if (hasKing) {
        const other = targets.find((t) => t.type !== 'k');
        desc = `forks the king on ${targets.find((t) => t.type === 'k')!.square} and the ${other?.name || 'piece'} on ${other?.square}`;
      } else {
        const [t1, t2] = targets;
        desc = `forks the ${t1.name} on ${t1.square} and ${t2.name} on ${t2.square}`;
      }

      return {
        targets,
        hasKing,
        hasQueen,
        hasRook,
        description: desc,
      };
    }
  }

  return undefined;
}

/**
 * Detects skewers created by the moved piece.
 */
export function detectSkewers(chess: Chess, toSquare: string, moverColor: PieceColor): SkewerDetail | undefined {
  const piece = chess.get(toSquare as Square);
  if (!piece || (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q')) return undefined;

  const enemyColor: PieceColor = moverColor === 'w' ? 'b' : 'w';
  const directions: Array<[number, number]> = [];
  if (piece.type === 'b' || piece.type === 'q') directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  if (piece.type === 'r' || piece.type === 'q') directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);

  const file = toSquare.charCodeAt(0) - 97;
  const rank = parseInt(toSquare[1], 10);

  for (const [df, dr] of directions) {
    let f = file + df;
    let r = rank + dr;
    let frontPiece: { type: string; color: PieceColor } | null = null;
    let frontSquare: string | null = null;

    while (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
      const sq = (String.fromCharCode(97 + f) + r) as Square;
      const target = chess.get(sq);
      if (target) {
        if (!frontPiece) {
          if (target.color === enemyColor && (target.type === 'k' || target.type === 'q' || target.type === 'r')) {
            frontPiece = target;
            frontSquare = sq;
          } else {
            break;
          }
        } else {
          if (target.color === enemyColor) {
            const frontVal = PIECE_VALUES[frontPiece.type] || 0;
            const backVal = PIECE_VALUES[target.type] || 0;
            if (frontVal >= backVal && frontVal >= 5) {
              return {
                frontSquare: frontSquare!,
                frontPieceName: getPieceFullName(frontPiece.type),
                backSquare: sq,
                backPieceName: getPieceFullName(target.type),
                description: `skewers the ${getPieceFullName(frontPiece.type)} on ${frontSquare} to the ${getPieceFullName(target.type)} on ${sq}`,
              };
            }
          }
          break;
        }
      }
      f += df;
      r += dr;
    }
  }
  return undefined;
}

/**
 * Detects discovered attacks unmasked by vacating fromSquare.
 */
export function detectDiscoveredAttack(
  chessAfter: Chess,
  fromSquare: string,
  moverColor: PieceColor
): DiscoveredAttackDetail | undefined {
  if (!fromSquare || fromSquare.length !== 2) return undefined;

  const enemyColor: PieceColor = moverColor === 'w' ? 'b' : 'w';
  const file = fromSquare.charCodeAt(0) - 97;
  const rank = parseInt(fromSquare[1], 10);

  const rayPairs = [
    { dir1: [1, 0], dir2: [-1, 0], types: ['r', 'q'] },
    { dir1: [0, 1], dir2: [0, -1], types: ['r', 'q'] },
    { dir1: [1, 1], dir2: [-1, -1], types: ['b', 'q'] },
    { dir1: [1, -1], dir2: [-1, 1], types: ['b', 'q'] },
  ];

  for (const { dir1, dir2, types } of rayPairs) {
    for (const [friendlyDir, enemyDir] of [[dir1, dir2], [dir2, dir1]]) {
      let ff = file + friendlyDir[0];
      let fr = rank + friendlyDir[1];
      let friendlySlider: { type: string; color: PieceColor } | null = null;
      let friendlySquare: string | null = null;

      while (ff >= 0 && ff <= 7 && fr >= 1 && fr <= 8) {
        const sq = (String.fromCharCode(97 + ff) + fr) as Square;
        const p = chessAfter.get(sq);
        if (p) {
          if (p.color === moverColor && types.includes(p.type)) {
            friendlySlider = p;
            friendlySquare = sq;
          }
          break;
        }
        ff += friendlyDir[0];
        fr += friendlyDir[1];
      }

      if (!friendlySlider || !friendlySquare) continue;

      let ef = file + enemyDir[0];
      let er = rank + enemyDir[1];
      let enemyTarget: { type: string; color: PieceColor } | null = null;
      let enemySquare: string | null = null;

      while (ef >= 0 && ef <= 7 && er >= 1 && er <= 8) {
        const sq = (String.fromCharCode(97 + ef) + er) as Square;
        const p = chessAfter.get(sq);
        if (p) {
          if (p.color === enemyColor) {
            enemyTarget = p;
            enemySquare = sq;
          }
          break;
        }
        ef += enemyDir[0];
        er += enemyDir[1];
      }

      if (friendlySlider && enemyTarget && enemySquare) {
        const isCheck = enemyTarget.type === 'k';
        const sliderName = getPieceFullName(friendlySlider.type);
        const targetName = getPieceFullName(enemyTarget.type);
        const desc = isCheck
          ? `unmasks a discovered check from the ${sliderName} on ${friendlySquare}`
          : `unmasks a discovered attack on the ${targetName} on ${enemySquare}`;

        return {
          sliderSquare: friendlySquare,
          sliderPieceName: sliderName,
          targetSquare: enemySquare,
          targetPieceName: targetName,
          isCheck,
          description: desc,
        };
      }
    }
  }

  return undefined;
}

/**
 * Checks if a rook is placed on an open or semi-open file, or the 7th rank.
 */
export function checkRookFileActivity(chess: Chess, square: string, color: PieceColor): {
  isOpen: boolean;
  isSemiOpen: boolean;
  is7thRank: boolean;
} {
  const piece = chess.get(square as Square);
  if (!piece || piece.type !== 'r') return { isOpen: false, isSemiOpen: false, is7thRank: false };

  const file = square[0];
  const rank = parseInt(square[1], 10);
  const is7thRank = color === 'w' ? rank === 7 : rank === 2;

  let friendlyPawns = 0;
  let enemyPawns = 0;

  for (let r = 1; r <= 8; r++) {
    const sq = (file + r) as Square;
    const p = chess.get(sq);
    if (p && p.type === 'p') {
      if (p.color === color) friendlyPawns++;
      else enemyPawns++;
    }
  }

  const isOpen = friendlyPawns === 0 && enemyPawns === 0;
  const isSemiOpen = friendlyPawns === 0 && enemyPawns > 0;

  return { isOpen, isSemiOpen, is7thRank };
}

/**
 * Checks if a knight on square is an outpost.
 */
export function checkKnightOutpost(chess: Chess, square: string, color: PieceColor): boolean {
  const piece = chess.get(square as Square);
  if (!piece || piece.type !== 'n') return false;

  const fileIdx = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10);
  const isGoodRank = color === 'w' ? (rank >= 4 && rank <= 6) : (rank >= 3 && rank <= 5);
  if (!isGoodRank) return false;

  // Defended by friendly pawn?
  const pawnRank = color === 'w' ? rank - 1 : rank + 1;
  const defendedByPawn = [-1, 1].some((df) => {
    const f = fileIdx + df;
    if (f < 0 || f > 7) return false;
    const p = chess.get((String.fromCharCode(97 + f) + pawnRank) as Square);
    return p && p.type === 'p' && p.color === color;
  });

  if (!defendedByPawn) return false;

  // Can enemy pawns drive it away?
  const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';
  const enemyPawnsAhead = [-1, 1].some((df) => {
    const f = fileIdx + df;
    if (f < 0 || f > 7) return false;
    for (let r = 1; r <= 8; r++) {
      const isAhead = color === 'w' ? r > rank : r < rank;
      if (!isAhead) continue;
      const p = chess.get((String.fromCharCode(97 + f) + r) as Square);
      if (p && p.type === 'p' && p.color === enemyColor) return true;
    }
    return false;
  });

  return !enemyPawnsAhead;
}

/**
 * Checks if a move weakens the pawn shield around the castled king.
 */
export function checkWeakensKingShield(
  chessBefore: Chess,
  _chessAfter: Chess,
  step: GameReviewStep
): boolean {
  if (step.san.startsWith('O-O')) return false;

  const color = step.color;
  const kingSquare = color === 'w' ? 'g1' : 'g8';
  const kPiece = chessBefore.get(kingSquare as Square);
  if (!kPiece || kPiece.type !== 'k' || kPiece.color !== color) return false;

  const uci = step.uci;
  if (!uci || uci.length < 4) return false;

  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const piece = chessBefore.get(from as Square);
  if (!piece || piece.type !== 'p') return false;

  if (color === 'w') {
    if (['f2', 'g2', 'h2'].includes(from) && (to === 'f3' || to === 'f4' || to === 'g4')) {
      return true;
    }
  } else {
    if (['f7', 'g7', 'h7'].includes(from) && (to === 'f6' || to === 'f5' || to === 'g5')) {
      return true;
    }
  }

  return false;
}

/**
 * Comprehensive tactical and positional analyzer for a GameReviewStep.
 */
export function analyzeTacticalContext(step: GameReviewStep): TacticalContext {
  const isCastlingKingside = step.san === 'O-O';
  const isCastlingQueenside = step.san === 'O-O-O';
  const isCastling = isCastlingKingside || isCastlingQueenside;

  let isCheckmate = step.san.includes('#');
  let isCheck = step.san.includes('+') || isCheckmate;
  let isDoubleCheck = false;
  let isDiscoveredCheck = false;
  let isPromotion = step.san.includes('=');
  let promotedPieceName: string | undefined;

  let movedPieceType = 'p';
  let movedPieceName = 'pawn';
  const fromSquare = step.uci ? step.uci.slice(0, 2) : '';
  const toSquare = step.uci ? step.uci.slice(2, 4) : '';

  let isCapture = step.san.includes('x');
  let capturedPieceType: string | undefined;
  let capturedPieceName: string | undefined;
  let isRecapture = isCapture;

  let attacksCreated: AttackedPiece[] = [];
  let fork: ForkDetail | undefined;
  let pin: PinDetail | undefined;
  let skewer: SkewerDetail | undefined;
  let discoveredAttack: DiscoveredAttackDetail | undefined;

  let isPawnBreak = false;
  let isPassed = false;
  let isRookOnOpenFile = false;
  let isRookOnSemiOpenFile = false;
  let isRookOn7thRank = false;
  let isKnightOutpost = false;
  let isKingCentralized = false;
  let weakensKingShield = false;
  let hungPiece: TacticalContext['hungPiece'];

  let mateDelivered = isCheckmate;
  let mateAllowed: TacticalContext['mateAllowed'];
  let mateMissed: TacticalContext['mateMissed'];
  let isSacrifice = false;
  let sacrificedPieceName: string | undefined;

  try {
    if (step.fenBefore && step.fenAfter) {
      const chessBefore = new Chess(step.fenBefore);
      const chessAfter = new Chess(step.fenAfter);

      if (fromSquare) {
        const pieceBefore = chessBefore.get(fromSquare as Square);
        if (pieceBefore) {
          movedPieceType = pieceBefore.type;
          movedPieceName = getPieceFullName(pieceBefore.type);
        }
      }

      if (isCapture && toSquare) {
        const pieceCaptured = chessBefore.get(toSquare as Square);
        if (pieceCaptured) {
          capturedPieceType = pieceCaptured.type;
          capturedPieceName = getPieceFullName(pieceCaptured.type);
        }
      }

      if (isPromotion && step.uci && step.uci.length > 4) {
        promotedPieceName = getPieceFullName(step.uci[4]);
      }

      isCheckmate = chessAfter.isCheckmate() || isCheckmate;
      isCheck = chessAfter.inCheck() || isCheck;
      mateDelivered = isCheckmate;

      // Discovered attack & check
      discoveredAttack = detectDiscoveredAttack(chessAfter, fromSquare, step.color);
      if (discoveredAttack?.isCheck) {
        isDiscoveredCheck = true;
        const enemyColor: PieceColor = step.color === 'w' ? 'b' : 'w';
        const enemyKingSquare = findKingSquare(chessAfter, enemyColor);
        if (enemyKingSquare && toSquare && doesPieceDirectlyAttack(chessAfter, toSquare, enemyKingSquare)) {
          isDoubleCheck = true;
        }
      }

      // Pins, Forks, Skewers from destination square
      if (toSquare) {
        pin = detectPins(chessAfter, toSquare, step.color);
        fork = detectForks(chessAfter, toSquare, step.color);
        skewer = detectSkewers(chessAfter, toSquare, step.color);

        // Rook file activity
        if (movedPieceType === 'r') {
          const rookAct = checkRookFileActivity(chessAfter, toSquare, step.color);
          isRookOnOpenFile = rookAct.isOpen;
          isRookOnSemiOpenFile = rookAct.isSemiOpen;
          isRookOn7thRank = rookAct.is7thRank;
        }

        // Knight outpost
        if (movedPieceType === 'n') {
          isKnightOutpost = checkKnightOutpost(chessAfter, toSquare, step.color);
        }

        // Passed pawn
        if (movedPieceType === 'p') {
          isPassed = isPassedPawn(chessAfter, toSquare, step.color);

          // Pawn break
          if (['c4', 'd4', 'e4', 'f4', 'c5', 'd5', 'e5', 'f5'].includes(toSquare)) {
            const enemyColor: PieceColor = step.color === 'w' ? 'b' : 'w';
            const fIdx = toSquare.charCodeAt(0) - 97;
            const r = parseInt(toSquare[1], 10);
            const dr = step.color === 'w' ? 1 : -1;
            const attacksEnemyPawn = [-1, 1].some((df) => {
              const targetSq = (String.fromCharCode(97 + fIdx + df) + (r + dr)) as Square;
              const p = chessAfter.get(targetSq);
              return p && p.type === 'p' && p.color === enemyColor;
            });
            if (attacksEnemyPawn) {
              isPawnBreak = true;
            }
          }
        }

        // King centralization in endgame
        if (movedPieceType === 'k' && step.phase === 'endgame') {
          isKingCentralized = isCenterSquare(toSquare) || isExtendedCenter(toSquare);
        }
      }

      weakensKingShield = checkWeakensKingShield(chessBefore, chessAfter, step);

      // Check hanging piece in opponent engine continuation
      if (step.playedMoveEval?.pv && step.playedMoveEval.pv.length > 0) {
        const oppUci = step.playedMoveEval.pv[0];
        const oppFrom = oppUci.slice(0, 2);
        const oppTo = oppUci.slice(2, 4);

        const targetPieceInAfter = chessAfter.get(oppTo as Square);
        const capturerPieceInAfter = chessAfter.get(oppFrom as Square);

        if (targetPieceInAfter && targetPieceInAfter.color === step.color) {
          const targetVal = PIECE_VALUES[targetPieceInAfter.type] || 0;
          const capturerVal = capturerPieceInAfter ? PIECE_VALUES[capturerPieceInAfter.type] || 0 : 0;
          const isDefended = chessAfter.isAttacked(oppTo as Square, step.color);

          if (!isDefended || targetVal > capturerVal) {
            hungPiece = {
              name: getPieceFullName(targetPieceInAfter.type),
              square: oppTo,
              capturerPieceName: capturerPieceInAfter ? getPieceFullName(capturerPieceInAfter.type) : undefined,
              capturerSquare: oppFrom,
              isMovePiece: oppTo === toSquare,
              isCompletelyUndefended: !isDefended,
            };
          }
        }
      }

      // Mate allowed check
      if (step.playedMoveEval?.mate !== undefined) {
        const mate = step.playedMoveEval.mate;
        const isOpponentMate = step.color === 'w' ? mate < 0 : mate > 0;
        if (isOpponentMate) {
          mateAllowed = { allowed: true, movesToMate: Math.abs(mate) };
        }
      }

      // Mate missed check
      if (step.bestMoveEval?.mate !== undefined) {
        const bestMate = step.bestMoveEval.mate;
        const moverHadMate = step.color === 'w' ? bestMate > 0 : bestMate < 0;
        if (moverHadMate) {
          const playedMate = step.playedMoveEval?.mate;
          const stillHasMate = playedMate !== undefined && (step.color === 'w' ? playedMate > 0 : playedMate < 0);
          if (!stillHasMate) {
            mateMissed = { missed: true, mateInMoves: Math.abs(bestMate) };
          }
        }
      }

      // Sacrifice detection for minor/major pieces
      const moverVal = PIECE_VALUES[movedPieceType] || 0;
      if (moverVal >= 3 && toSquare) {
        const oppMoves = chessAfter.moves({ verbose: true });
        const capturesOnTo = oppMoves.filter((m) => m.to === toSquare);
        if (capturesOnTo.length > 0) {
          const lesserAttacker = capturesOnTo.some((m) => (PIECE_VALUES[m.piece] || 0) < moverVal);
          const isUndefended = !chessAfter.isAttacked(toSquare as Square, step.color);
          if (lesserAttacker || isUndefended) {
            isSacrifice = true;
            sacrificedPieceName = movedPieceName;
          }
        }
      }
    }
  } catch {
    // Graceful fallback on malformed FEN
  }

  return {
    isCheckmate,
    isCheck,
    isDoubleCheck,
    isDiscoveredCheck,
    isCastling,
    isCastlingKingside,
    isCastlingQueenside,
    isPromotion,
    promotedPieceName,
    movedPieceType,
    movedPieceName,
    fromSquare,
    toSquare,
    isCapture,
    capturedPieceType,
    capturedPieceName,
    isRecapture,
    attacksCreated,
    fork,
    pin,
    skewer,
    discoveredAttack,
    isPawnBreak,
    isPassedPawn: isPassed,
    isRookOnOpenFile,
    isRookOnSemiOpenFile,
    isRookOn7thRank,
    isKnightOutpost,
    isKingCentralized,
    weakensKingShield,
    hungPiece,
    mateDelivered,
    mateAllowed,
    mateMissed,
    isSacrifice,
    sacrificedPieceName,
  };
}

/**
 * Analyzes the best engine alternative move and explains what it accomplishes and why it is better.
 */
export function analyzeBestAlternative(
  step: GameReviewStep,
  userColor: PieceColor = 'w'
): BestMoveAnalysis | undefined {
  const bestSan = step.bestMoveSan;
  if (!bestSan || bestSan === step.san || !step.fenBefore) {
    return undefined;
  }

  try {
    const chess = new Chess(step.fenBefore);
    const moveRes = chess.move(bestSan);
    if (!moveRes) return undefined;

    const isUser = step.color === userColor;
    const pieceName = getPieceFullName(moveRes.piece);
    const to = moveRes.to;

    let accomplishment = '';
    let whyBetter = '';
    let tacticalIdea = '';

    // 1. Delivered Mate
    if (moveRes.san.includes('#') || chess.isCheckmate()) {
      accomplishment = `delivers immediate checkmate against the enemy king`;
      whyBetter = isUser
        ? `winning the game immediately instead of giving your opponent another chance`
        : `winning the game on the spot`;
      tacticalIdea = `Mating net`;
    }
    // 2. Tactical Fork
    else if (detectForks(chess, to, step.color)) {
      const fork = detectForks(chess, to, step.color)!;
      accomplishment = moveRes.captured
        ? `captures the ${getPieceFullName(moveRes.captured)} on ${to} and ${fork.description}`
        : `${fork.description}`;
      whyBetter = `winning decisive material through a tactical fork`;
      tacticalIdea = `Tactical fork`;
    }
    // 3. Pin
    else if (detectPins(chess, to, step.color)) {
      const pin = detectPins(chess, to, step.color)!;
      accomplishment = moveRes.captured
        ? `captures the ${getPieceFullName(moveRes.captured)} on ${to} and ${pin.description}`
        : `${pin.description}`;
      whyBetter = `immobilizing the enemy piece and building decisive pressure`;
      tacticalIdea = `Pin`;
    }
    // 4. Skewer
    else if (detectSkewers(chess, to, step.color)) {
      const skewer = detectSkewers(chess, to, step.color)!;
      accomplishment = moveRes.captured
        ? `captures the ${getPieceFullName(moveRes.captured)} on ${to} and ${skewer.description}`
        : `${skewer.description}`;
      whyBetter = `winning decisive material through a skewer`;
      tacticalIdea = `Skewer`;
    }
    // 5. Capture Material
    else if (moveRes.captured) {
      const capName = getPieceFullName(moveRes.captured);
      accomplishment = `captures the ${capName} on ${to}${moveRes.san.includes('+') ? ' with check' : ''}`;
      whyBetter = `winning material and establishing an overwhelming advantage`;
      tacticalIdea = `Material gain`;
    }
    // 6. Castling
    else if (moveRes.san === 'O-O' || moveRes.san === 'O-O-O') {
      accomplishment = `castles to tuck the king into safety and activate the rook`;
      whyBetter = `securing the king before launching active operations`;
      tacticalIdea = `King safety`;
    }
    // 7. Check
    else if (moveRes.san.includes('+') || chess.inCheck()) {
      accomplishment = `checks the enemy king on ${to}, forcing defensive concessions`;
      whyBetter = `keeping the initiative with tempo`;
      tacticalIdea = `Forcing check`;
    }
    // 8. Rook Open File
    else if (moveRes.piece === 'r') {
      const rookAct = checkRookFileActivity(chess, to, step.color);
      if (rookAct.isOpen) {
        accomplishment = `seizes control of the open ${to[0]}-file with the rook`;
        whyBetter = `dominating the open file and creating infiltration threats`;
        tacticalIdea = `Open file control`;
      } else if (rookAct.is7thRank) {
        accomplishment = `invades the 7th rank with the rook to attack enemy pawns`;
        whyBetter = `tying down enemy pieces to passive defense`;
        tacticalIdea = `7th rank invasion`;
      } else {
        accomplishment = `positions the rook on an active file`;
        whyBetter = `maximizing rook activity and coordinating pieces`;
        tacticalIdea = `Piece activation`;
      }
    }
    // 9. Knight Outpost / Center
    else if (moveRes.piece === 'n') {
      const isOutpost = checkKnightOutpost(chess, to, step.color);
      if (isOutpost) {
        accomplishment = `anchors the knight on an unchallengeable outpost on ${to}`;
        whyBetter = `exerting powerful central influence from a defended square`;
        tacticalIdea = `Knight outpost`;
      } else if (isCenterSquare(to)) {
        accomplishment = `develops the knight toward the central ${to} square`;
        whyBetter = `controlling key central squares and coordinating piece play`;
        tacticalIdea = `Central control`;
      } else {
        accomplishment = `maneuvers the knight to a more active and influential square`;
        whyBetter = `improving knight harmony`;
        tacticalIdea = `Knight maneuver`;
      }
    }
    // 10. Passed Pawn
    else if (moveRes.piece === 'p' && isPassedPawn(chess, to, step.color)) {
      accomplishment = `pushes the passed ${to[0]}-pawn toward the promotion rank`;
      whyBetter = `increasing queen-promotion pressure and forcing passive defense`;
      tacticalIdea = `Passed pawn advance`;
    }
    // 11. General Development / Piece Activity
    else {
      accomplishment = `improves ${pieceName} activity and controls key territory`;
      whyBetter = `preserving active piece harmony and preventing opponent counterplay`;
      tacticalIdea = `Positional improvement`;
    }

    return {
      san: bestSan,
      uci: moveRes.lan,
      accomplishment,
      whyBetter,
      tacticalIdea,
    };
  } catch {
    return undefined;
  }
}
