import { 
  MoveEvaluation, 
  PieceColor, 
  MoveClassification, 
  GameReviewStep,
  GameReviewReport,
  MultiPvEvaluation,
  CURRENT_REVIEW_SCHEMA_VERSION
} from '../../types/chess';
import { scoreToWinPercentage } from '../engine/uciParser';
import { lookupOpeningMove } from '../openings/openingBookService';
import { Chess } from 'chess.js';

/**
 * Configurable, documented centipawn loss and win rate delta thresholds
 * for objective engine-driven move classifications.
 */
export interface ClassificationThresholds {
  bestMaxCpl: number; // Maximum CPL to still qualify as Best (default: 8)
  bestMaxWinRateDelta: number; // Maximum Win Rate % drop for Best (default: 1.0)
  excellentMaxCpl: number; // Maximum CPL for Excellent (default: 25)
  excellentMaxWinRateDelta: number; // Maximum Win Rate % drop for Excellent (default: 3.0)
  goodMaxCpl: number; // Maximum CPL for Good (default: 60)
  goodMaxWinRateDelta: number; // Maximum Win Rate % drop for Good (default: 7.0)
  inaccuracyMaxCpl: number; // Maximum CPL for Inaccuracy (default: 130)
  inaccuracyMaxWinRateDelta: number; // Maximum Win Rate % drop for Inaccuracy (default: 15.0)
  mistakeMaxCpl: number; // Maximum CPL for Mistake (default: 250)
  mistakeMaxWinRateDelta: number; // Maximum Win Rate % drop for Mistake (default: 25.0)
}

export const DEFAULT_CLASSIFICATION_THRESHOLDS: ClassificationThresholds = {
  bestMaxCpl: 10,
  bestMaxWinRateDelta: 1.0,
  excellentMaxCpl: 25,
  excellentMaxWinRateDelta: 3.0,
  goodMaxCpl: 40,
  goodMaxWinRateDelta: 5.0,
  inaccuracyMaxCpl: 90,
  inaccuracyMaxWinRateDelta: 10.0,
  mistakeMaxCpl: 200,
  mistakeMaxWinRateDelta: 20.0,
};

/**
 * Calculates Centipawn Loss (CPL) and Win Rate Delta from the moving player's perspective.
 * 
 * Computes genuine physical engine score differences and win probability changes
 * without artificial zero overrides so overall accuracy accurately reflects gameplay quality.
 * Accounts for:
 * - White and Black evaluation perspectives
 * - Forced checkmates and lost mate sequences
 * - Incomplete or failed engine searches (does not accidentally produce zero CPL)
 */
export function calculateMoveDeltas(
  evalBefore: MoveEvaluation,
  evalAfter: MoveEvaluation,
  activeColor: PieceColor
): {
  centipawnLoss: number;
  winRateBefore: number;
  winRateAfter: number;
  winRateDelta: number;
  scoreBefore: number;
  scoreAfter: number;
  mateBefore?: number;
  mateAfter?: number;
  isIncomplete?: boolean;
} {
  const isWhite = activeColor === 'w';

  // Check for incomplete or failed engine search
  // If an engine evaluation returned an empty best move and no forced mate,
  // the engine search was interrupted, failed, or timed out.
  const isIncomplete = (!evalBefore.bestMove && typeof evalBefore.mate !== 'number') ||
                       (!evalAfter.bestMove && typeof evalAfter.mate !== 'number');

  // Both evalBefore and evalAfter are normalized to White's perspective by StockfishService.
  const scoreBeforeCpWhite = evalBefore.score ?? 0;
  const mateBeforeWhite = evalBefore.mate;

  const scoreAfterCpWhite = evalAfter.score ?? 0;
  const mateAfterWhite = evalAfter.mate;

  // Convert to moving player's perspective
  const scoreBefore = isWhite ? scoreBeforeCpWhite : -scoreBeforeCpWhite;
  const mateBefore = isWhite ? mateBeforeWhite : (mateBeforeWhite ? -mateBeforeWhite : undefined);

  const scoreAfter = isWhite ? scoreAfterCpWhite : -scoreAfterCpWhite;
  const mateAfter = isWhite ? mateAfterWhite : (mateAfterWhite ? -mateAfterWhite : undefined);

  // If engine evaluation is incomplete, do NOT award a false 0 CPL
  if (isIncomplete) {
    return {
      centipawnLoss: 45,
      winRateBefore: 50.0,
      winRateAfter: 46.0,
      winRateDelta: 4.0,
      scoreBefore: 0,
      scoreAfter: -45,
      mateBefore: undefined,
      mateAfter: undefined,
      isIncomplete: true,
    };
  }

  // Win percentages (0 to 100) from moving player's perspective
  const winRateBefore = scoreToWinPercentage(scoreBefore, mateBefore);
  const winRateAfter = scoreToWinPercentage(scoreAfter, mateAfter);

  const winRateDelta = Math.max(0, winRateBefore - winRateAfter);

  // Centipawn loss calculation accounting for mates and decided positions
  let cpl = 0;

  if (typeof mateAfter === 'number' && mateAfter > 0) {
    // Player achieved or maintained a winning forced checkmate!
    cpl = 0;
  } else if (typeof mateBefore === 'number' && typeof mateAfter === 'number') {
    // Both positions are forced mates
    if (mateBefore > 0 && mateAfter > 0) {
      // Both are winning forced mates for player
      cpl = 0;
    } else if (mateBefore > 0 && mateAfter < 0) {
      // Player had forced mate and blundered into being mated!
      cpl = 1000;
    } else if (mateBefore < 0 && mateAfter < 0) {
      // Player was already in forced mate; maintained defense
      cpl = 0;
    } else {
      cpl = Math.max(0, 800 - scoreAfter);
    }
  } else if (typeof mateBefore === 'number' && mateBefore > 0 && typeof mateAfter !== 'number') {
    // Player had a forced mate and transitioned to a non-mate line
    if (scoreAfter >= 600 || winRateAfter >= 98) {
      // Overwhelmingly winning continuation (e.g. +15 pawns, queen promotion imminent).
      // Win is completely preserved; not a mistake.
      cpl = Math.max(0, Math.min(10, Math.round(winRateDelta * 10)));
    } else if (scoreAfter >= 400 || winRateAfter >= 90) {
      // Still clearly winning continuation with minor extension
      cpl = 35;
    } else if (scoreAfter >= 200 || winRateAfter >= 70) {
      // Substantial portion of advantage lost
      cpl = 180;
    } else {
      // Lost forced mate to equal or losing position
      cpl = Math.max(350, 800 - scoreAfter);
    }
  } else if (typeof mateAfter === 'number' && mateAfter < 0) {
    if (typeof mateBefore === 'number' && mateBefore < 0) {
      // Maintained defense while getting mated
      cpl = 0;
    } else if (scoreBefore <= -500 || winRateBefore <= 5) {
      // Player was already completely lost; transitioning to forced mate did not lose the game
      cpl = Math.max(0, Math.min(30, Math.round(winRateDelta * 10)));
    } else {
      // Player blundered from a playable position into a forced mate
      cpl = Math.max(300, scoreBefore - (-800));
    }
  } else {
    // Standard centipawn comparison
    const rawCpl = Math.max(0, scoreBefore - scoreAfter);

    // Scaling in decided positions:
    // When both positions are overwhelmingly winning (winRateBefore >= 95% and winRateAfter >= 95% or scoreAfter >= 400),
    // raw centipawn differences like +17.0 -> +11.0 or +12.0 -> +8.0 represent search horizon or technique variations,
    // NOT blunders. Compress CPL to align with actual win probability impact:
    if (winRateBefore >= 95 && winRateAfter >= 95 && scoreAfter >= 400) {
      cpl = Math.min(rawCpl, Math.max(0, Math.round(winRateDelta * 15)));
    } else if (winRateBefore <= 5 && winRateAfter <= 5 && scoreBefore <= -400) {
      // Symmetrically, in dead-lost positions where all legal moves lose,
      // numerical fluctuations (-14.0 -> -18.0) do not represent a new blunder:
      cpl = Math.min(rawCpl, Math.max(0, Math.round(winRateDelta * 15)));
    } else {
      cpl = rawCpl;
    }
  }

  return {
    centipawnLoss: Math.round(cpl),
    winRateBefore: Math.round(winRateBefore * 10) / 10,
    winRateAfter: Math.round(winRateAfter * 10) / 10,
    winRateDelta: Math.round(winRateDelta * 10) / 10,
    scoreBefore,
    scoreAfter,
    mateBefore,
    mateAfter,
    isIncomplete: false,
  };
}

/**
 * Checks if a move qualifies as a "Missed Win".
 * 
 * Requirements:
 * 1. Mover had a demonstrably winning advantage before the move:
 *    - Forced checkmate (mateBefore > 0), OR
 *    - Decisive advantage: winRateBefore >= 80% OR scoreBefore >= +280 cp.
 * 2. Played move is NOT the engine's best move.
 * 3. The move lost a substantial portion of the advantage:
 *    - winRateDelta >= 18% OR centipawnLoss >= 200 cp (or losing forced mate).
 * 4. The resulting position is NO LONGER clearly winning:
 *    - Resulting winRateAfter < 65% OR scoreAfter < +150 cp (or got mated / losing).
 *    - If player had a forced mate, and lost the forced mate such that winRateAfter < 70% or scoreAfter < +250 cp.
 */
export function isMissedWin(
  isEngineTopMove: boolean,
  mateBefore: number | undefined,
  mateAfter: number | undefined,
  scoreBeforeCp: number,
  scoreAfterCp: number,
  winRateBefore: number,
  winRateAfter: number,
  winRateDelta: number,
  cpl: number = 0
): boolean {
  if (isEngineTopMove) return false;

  // If the player reached or retained a winning forced checkmate, it is never a missed win
  if (typeof mateAfter === 'number' && mateAfter > 0) return false;

  // If resulting position remains decisively winning (+4.00 cp or >= 85% win rate),
  // the player has not missed the win.
  if (scoreAfterCp >= 400 && winRateAfter >= 85) return false;

  // Case 1: Player had a forced checkmate (mateBefore > 0)
  if (typeof mateBefore === 'number' && mateBefore > 0) {
    if (typeof mateAfter === 'number' && mateAfter > 0) {
      return false;
    }
    // Player lost the forced mate: position ceased to be a clean forced win
    if (winRateAfter < 70 || scoreAfterCp < 250 || (typeof mateAfter === 'number' && mateAfter < 0)) {
      return true;
    }
  }

  // Case 2: Player had a demonstrably winning advantage (winRateBefore >= 80% or scoreBefore >= 280 cp)
  const isWinningBefore = winRateBefore >= 80 || (typeof scoreBeforeCp === 'number' && scoreBeforeCp >= 280);
  if (!isWinningBefore) return false;

  // Substantial loss of advantage
  const lostSubstantialAdvantage = winRateDelta >= 18 || cpl >= 200 || (scoreBeforeCp - scoreAfterCp >= 200);

  // Resulting position is NO LONGER clearly winning
  const isNoLongerWinning = winRateAfter < 65 || scoreAfterCp < 150 || (typeof mateAfter === 'number' && mateAfter < 0);

  return lostSubstantialAdvantage && isNoLongerWinning;
}

/**
 * Checks if a move qualifies as a "Great" move (!).
 * 
 * A Great move must be objectively exceptional, defensible, and rare:
 * - It must be the engine's #1 move (cpl = 0).
 * - Position must not be a forced move (legalMovesCount > 1).
 * - Position must NOT already be trivially won (scoreBefore < 550 cp, winRateBefore < 95%).
 * - Requires either:
 *   1. Decisive MultiPV candidate bifurcation (gap >= 150 cp or >= 15% win rate):
 *      - Sole winning move: top move wins (>= 150 cp, >= 68%), while 2nd best drops to equal/worse (<= 50 cp, <= 54%).
 *      - Sole saving move: 2nd best loses (<= -150 cp, <= 30%), while top move holds (>= -50 cp, >= 45%).
 *   2. Critical saving turnaround:
 *      - Mover was facing defeat (winRateBefore <= 35% or scoreBeforeCp <= -200 cp)
 *      - Top move saved the game toward equality or advantage (winRateAfter >= 48% and winRateAfter - winRateBefore >= 14%).
 * 
 * Arbitrary 100-cp candidate gaps or defensive moves without decisive bifurcation do NOT qualify.
 */
export function checkGreatMoveContext(
  multiPvLines: MultiPvEvaluation[],
  winRateBefore: number,
  winRateAfter: number,
  scoreBeforeCp: number,
  scoreAfterCp: number,
  centipawnLoss: number,
  legalMovesCount: number = 10
): boolean {
  // Must be optimal (cpl = 0)
  if (centipawnLoss > 0) return false;

  // Must not be a forced move
  if (legalMovesCount <= 1) return false;

  // Position must not be trivially won
  if (scoreBeforeCp >= 550 || winRateBefore >= 95) return false;

  // Case 1: MultiPV Candidate Bifurcation
  if (multiPvLines && multiPvLines.length >= 2) {
    const topEval = multiPvLines[0];
    const secondEval = multiPvLines[1];
    if (topEval && secondEval) {
      const topScore = topEval.score ?? 0;
      const secondScore = secondEval.score ?? 0;
      const topWin = scoreToWinPercentage(topScore, topEval.mate);
      const secondWin = scoreToWinPercentage(secondScore, secondEval.mate);

      const gapCp = topScore - secondScore;
      const gapWin = topWin - secondWin;

      if (gapCp >= 150 || gapWin >= 15) {
        // (a) Sole winning move: top move wins, 2nd drops to equal or worse
        if (topScore >= 150 && secondScore <= 50) {
          return true;
        }
        // (b) Sole saving move: 2nd loses, top holds
        if (secondScore <= -150 && topScore >= -50) {
          return true;
        }
      }
    }
  }

  // Case 2: Critical Saving Turnaround
  if (
    (winRateBefore <= 35 || scoreBeforeCp <= -200) &&
    (winRateAfter >= 48 || scoreAfterCp >= -50) &&
    (winRateAfter - winRateBefore >= 14 || scoreAfterCp - scoreBeforeCp >= 150)
  ) {
    return true;
  }

  return false;
}

/**
 * Detects if a position has exactly ONE legal move available.
 * Under strict definition, a move is Forced if and only if legalMoves.length === 1.
 * When legalMoves.length > 1, the move is never forced.
 */
export function checkForcedMove(fenBefore: string): boolean {
  try {
    const ch = new Chess(fenBefore);
    return ch.moves().length === 1;
  } catch {
    return false;
  }
}

/**
 * Detects if a move involves a genuine, sound, and tactically justified material sacrifice.
 * 
 * Rules:
 * 1. The sacrificed piece must be a minor or major piece (Knight, Bishop, Rook, Queen, value >= 3).
 * 2. Either:
 *    a) Direct capture sacrifice: piece of value >= 3 captures lesser material (net loss >= 2 points),
 *       and opponent has an immediate legal recapture on that square.
 *    b) Offered piece sacrifice: piece of value >= 3 is moved into a square where it can be
 *       captured by an opponent piece of lesser value (e.g. enemy pawn or minor),
 *       OR placed on a completely undefended square (0 friendly recaptures).
 * 3. Does NOT flag equal trades, routine development moves, or pieces left en prise elsewhere.
 */
export function detectMaterialSacrifice(
  fenBefore: string,
  fenAfter: string,
  playedUci?: string
): boolean {
  if (!playedUci || playedUci.length < 4) return false;

  try {
    const b1 = new Chess(fenBefore);
    const b2 = new Chess(fenAfter);

    const pieceValues: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    const fromSquare = playedUci.slice(0, 2);
    const toSquare = playedUci.slice(2, 4);

    const movedPiece = b1.get(fromSquare as any);
    if (!movedPiece) return false;

    const movedValue = pieceValues[movedPiece.type] || 0;
    // Pawns are not piece sacrifices for Brilliant
    if (movedValue < 3) return false;

    const targetPieceBefore = b1.get(toSquare as any);
    const capturedValue = targetPieceBefore ? pieceValues[targetPieceBefore.type] || 0 : 0;

    // Opponent legal moves in fenAfter
    const oppMoves = b2.moves({ verbose: true });
    const oppCapturesOnToSquare = oppMoves.filter((m) => m.to === toSquare);

    // 1. Direct capture sacrifice:
    // Player used a major/minor piece to capture lesser material (net material loss >= 2 points),
    // e.g. R x N (loss 2), B x P (loss 2), Q x R (loss 4), Q x N (loss 6)
    // AND opponent has an immediate legal recapture on toSquare
    if (targetPieceBefore && movedValue - capturedValue >= 2 && oppCapturesOnToSquare.length > 0) {
      return true;
    }

    // 2. Offered piece sacrifice on destination square (toSquare) in fenAfter:
    if (oppCapturesOnToSquare.length > 0) {
      // (a) Opponent can capture with a piece of LESSER value than movedPiece
      // e.g. Pawn captures Knight/Bishop/Rook/Queen, or Minor captures Rook/Queen, or Rook captures Queen
      const lesserAttacker = oppCapturesOnToSquare.some(
        (m) => (pieceValues[m.piece] || 0) < movedValue
      );
      if (lesserAttacker) {
        return true;
      }

      // (b) Piece on toSquare is completely UNDEFENDED (0 player recaptures on toSquare if opponent takes)
      const isCompletelyUndefended = oppCapturesOnToSquare.every((capMove) => {
        try {
          const testBoard = new Chess(fenAfter);
          testBoard.move(capMove);
          const myReplies = testBoard.moves({ verbose: true });
          return !myReplies.some((m) => m.to === toSquare);
        } catch {
          return false;
        }
      });

      if (isCompletelyUndefended) {
        return true;
      }
    }

    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Classifies a played move based on transparent, documented engine metrics,
 * tactical evaluation, opening book lookup, and centipawn loss.
 */
export function classifyMove(
  playedUci: string,
  bestUci: string,
  cpl: number,
  winRateBefore: number,
  winRateAfter: number,
  winRateDelta: number,
  fenBefore: string,
  fenAfter: string,
  playedSan?: string,
  multiPvLines: MultiPvEvaluation[] = [],
  mateBefore?: number,
  mateAfter?: number,
  scoreBeforeCp?: number,
  scoreAfterCp?: number,
  thresholds: ClassificationThresholds = DEFAULT_CLASSIFICATION_THRESHOLDS
): MoveClassification {
  // If engine search failed or is incomplete, do NOT invent classifications
  if (!bestUci && cpl === 0 && winRateDelta === 0) {
    try {
      const ch = new Chess(fenBefore);
      if (!ch.isGameOver() && ch.moves().length > 0) {
        return 'good';
      }
    } catch {}
  }

  // 1. Check Opening Book first
  const bookCheck = lookupOpeningMove(fenBefore, playedUci, playedSan);
  if (bookCheck.isBook) {
    return 'book';
  }

  // 2. Check for Forced Move (Subtype 1: Only legal move)
  let legalMovesCount = 10;
  try {
    const ch = new Chess(fenBefore);
    legalMovesCount = ch.moves().length;
    if (legalMovesCount <= 1) {
      return 'forced';
    }
  } catch (e) {
    // Fallback if FEN parsing fails
  }

  const normalizedPlayed = (playedUci || '').toLowerCase().trim();
  const normalizedBest = (bestUci || '').toLowerCase().trim();
  const isEngineTopMove = Boolean(normalizedPlayed && normalizedBest && normalizedPlayed === normalizedBest);

  const moverScoreBefore = typeof scoreBeforeCp === 'number' ? scoreBeforeCp : 0;
  const moverScoreAfter = typeof scoreAfterCp === 'number' ? scoreAfterCp : (moverScoreBefore - cpl);

  // 3. Check for Missed Win (evaluated before ordinary blunder/mistake!)
  if (isMissedWin(
    isEngineTopMove,
    mateBefore,
    mateAfter,
    moverScoreBefore,
    moverScoreAfter,
    winRateBefore,
    winRateAfter,
    winRateDelta,
    cpl
  )) {
    return 'missed_win';
  }

  // If the resulting position remains overwhelmingly winning (mateAfter > 0 or score >= +400 cp with >= 92% win rate),
  // a move that maintains this crushing advantage is never a blunder or mistake:
  const isDecisivelyWinning = (typeof mateAfter === 'number' && mateAfter > 0) || (moverScoreAfter >= 400 && winRateAfter >= 92);

  // If the player was already completely lost (score <= -500 cp or winRate <= 5%) and the move did not change the outcome (winRateDelta <= 1.0%),
  // it is not a new blunder or mistake:
  const isAlreadyDeadLost = (moverScoreBefore <= -500 || winRateBefore <= 5) && winRateDelta <= 1.0;

  // 4. Check for Blunder
  if (!isEngineTopMove && !isDecisivelyWinning && !isAlreadyDeadLost && (cpl >= thresholds.mistakeMaxCpl || winRateDelta >= thresholds.mistakeMaxWinRateDelta)) {
    return 'blunder';
  }

  // 5. Check for Mistake
  if (!isEngineTopMove && !isDecisivelyWinning && !isAlreadyDeadLost && (cpl >= thresholds.inaccuracyMaxCpl || winRateDelta >= thresholds.inaccuracyMaxWinRateDelta)) {
    return 'mistake';
  }

  // 6. Check for Inaccuracy
  if (!isEngineTopMove && !isDecisivelyWinning && !isAlreadyDeadLost && (cpl >= thresholds.goodMaxCpl || winRateDelta >= thresholds.goodMaxWinRateDelta)) {
    return 'inaccuracy';
  }

  // 7. Check for Brilliant Move (!!)
  // Requirements:
  // - Matches engine's top choice (cpl <= 5)
  // - Position before was contested (not trivially won: winRateBefore < 96% and moverScoreBefore < 550 cp)
  // - Position after remains clearly winning (moverScoreAfter >= 150 cp OR winRateAfter >= 72%, or forced mate)
  // - Involves a genuine, sound material sacrifice
  const isWinningAfter = (typeof scoreAfterCp === 'number' ? moverScoreAfter >= 150 : winRateAfter >= 72) || 
                         (typeof mateAfter === 'number' && mateAfter > 0);
  const isContestedBefore = winRateBefore < 96 && (typeof scoreBeforeCp !== 'number' || moverScoreBefore < 550);

  if (isEngineTopMove && cpl <= 5 && isContestedBefore && isWinningAfter) {
    const isSacrifice = detectMaterialSacrifice(fenBefore, fenAfter, playedUci);
    if (isSacrifice) {
      return 'brilliant';
    }
  }

  // 8. Check for Great Move (!)
  // Requirements:
  // - Matches engine's top choice (cpl = 0)
  // - Objectively exceptional only-winning or only-saving move verified by MultiPV bifurcation
  if (isEngineTopMove && cpl === 0) {
    const isGreat = checkGreatMoveContext(
      multiPvLines,
      winRateBefore,
      winRateAfter,
      moverScoreBefore,
      moverScoreAfter,
      cpl,
      legalMovesCount
    );
    if (isGreat) {
      return 'great';
    }
  }

  // 9. Best Move: Engine's first choice
  if (isEngineTopMove) {
    return 'best';
  }

  // 10. Excellent Move: Very close to top engine recommendation
  if (!isAlreadyDeadLost && cpl <= thresholds.excellentMaxCpl && winRateDelta <= thresholds.excellentMaxWinRateDelta) {
    return 'excellent';
  }

  // 11. Good Move: Solid move with minimal concession
  return 'good';
}

/**
 * Calculates single-move accuracy percentage based on win probability drop
 * and centipawn loss.
 * 
 * Win rate delta is the primary metric (CAPS-like exponential model),
 * while centipawn loss acts as a safeguard against flattening in decided positions
 * (e.g. dropping from +8.00 to +3.50 where win probability delta is tiny despite a severe blunder).
 */
export function calculateMoveAccuracy(winRateDelta: number, centipawnLoss?: number): number {
  if (winRateDelta <= 0 && (!centipawnLoss || centipawnLoss <= 0)) return 100;

  const delta = Math.max(0, winRateDelta);
  const accWin = 103.1668 * Math.exp(-0.0435 * delta) - 3.1668;
  const clampedWin = Math.min(100, Math.max(0, accWin));

  if (typeof centipawnLoss === 'number' && centipawnLoss > 0) {
    const accCpl = 100 * Math.exp(-0.0016 * centipawnLoss);
    const combined = Math.min(clampedWin, accCpl);
    return Math.min(100, Math.max(0, Math.round(combined * 10) / 10));
  }

  return Math.min(100, Math.max(0, Math.round(clampedWin * 10) / 10));
}

/**
 * Qualitative performance evaluation tier based on game accuracy and move count.
 * Replaces arbitrary numerical Elo ratings with transparent qualitative descriptions.
 */
export function getPerformanceTier(accuracy: number, moveCount: number): string {
  if (moveCount < 6) return 'Unavailable (short game)';
  if (accuracy >= 95) return 'Grandmaster Quality';
  if (accuracy >= 90) return 'Master Quality';
  if (accuracy >= 85) return 'Strong Club';
  if (accuracy >= 75) return 'Intermediate';
  return 'Developing';
}

/**
 * Compiles a comprehensive Game Review Report across all reviewed steps.
 */
export function compileGameReviewReport(steps: GameReviewStep[]): GameReviewReport {
  const whiteSteps = steps.filter((s) => s.color === 'w');
  const blackSteps = steps.filter((s) => s.color === 'b');

  const calcAverageAccuracy = (list: GameReviewStep[]) => {
    if (list.length === 0) return 100;
    const sum = list.reduce((acc, s) => {
      // Book moves receive 100% accuracy as sound opening theory
      if (s.classification === 'book') {
        return acc + 100;
      }
      return acc + calculateMoveAccuracy(s.winRateDelta, s.centipawnLoss);
    }, 0);
    return Math.round((sum / list.length) * 10) / 10;
  };

  const calcAcpl = (list: GameReviewStep[]) => {
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, s) => acc + s.centipawnLoss, 0);
    return Math.round((sum / list.length) * 10) / 10;
  };

  const calcPhaseAcc = (list: GameReviewStep[], phase: 'opening' | 'middlegame' | 'endgame') => {
    const phaseMoves = list.filter((s) => s.phase === phase);
    return calcAverageAccuracy(phaseMoves);
  };

  const initCounts = (): Record<MoveClassification, number> => ({
    book: 0,
    forced: 0,
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    missed_win: 0,
  });

  const whiteCounts = initCounts();
  const blackCounts = initCounts();

  steps.forEach((s) => {
    if (s.color === 'w') {
      whiteCounts[s.classification]++;
    } else {
      blackCounts[s.classification]++;
    }
  });

  const whiteAcpl = calcAcpl(whiteSteps);
  const blackAcpl = calcAcpl(blackSteps);
  const whiteAccuracy = calcAverageAccuracy(whiteSteps);
  const blackAccuracy = calcAverageAccuracy(blackSteps);

  // Estimated Performance Elo calculation
  const estimateElo = (acc: number, acpl: number, count: number) => {
    if (count === 0) {
      return { min: 800, max: 1200, estimate: 1000, confidence: 'None (no moves analyzed)' };
    }

    let base = 3100 - (acpl * 17) + ((acc - 75) * 18);
    base = Math.max(800, Math.min(2850, Math.round(base)));

    const margin = count < 10 ? 200 : count < 25 ? 120 : 80;
    const confidence = count < 10 ? 'Low (short game)' : count < 25 ? 'Moderate' : 'High';

    return {
      min: Math.max(600, base - margin),
      max: Math.min(2950, base + margin),
      estimate: base,
      confidence,
    };
  };

  // Critical positions: turning points where a move lost >= 90 cp or missed a win
  const criticalPositions: number[] = [];
  steps.forEach((s) => {
    if (s.classification === 'blunder' || s.classification === 'missed_win' || s.classification === 'mistake') {
      criticalPositions.push(s.ply);
    }
  });

  return {
    schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
    whiteAccuracy,
    blackAccuracy,
    whiteAcpl,
    blackAcpl,
    whitePhaseAccuracy: {
      opening: calcPhaseAcc(whiteSteps, 'opening'),
      middlegame: calcPhaseAcc(whiteSteps, 'middlegame'),
      endgame: calcPhaseAcc(whiteSteps, 'endgame'),
    },
    blackPhaseAccuracy: {
      opening: calcPhaseAcc(blackSteps, 'opening'),
      middlegame: calcPhaseAcc(blackSteps, 'middlegame'),
      endgame: calcPhaseAcc(blackSteps, 'endgame'),
    },
    classificationCounts: {
      white: whiteCounts,
      black: blackCounts,
    },
    estimatedElo: {
      white: estimateElo(whiteAccuracy, whiteAcpl, whiteSteps.length),
      black: estimateElo(blackAccuracy, blackAcpl, blackSteps.length),
    },
    moves: steps,
    criticalPositions,
  };
}
