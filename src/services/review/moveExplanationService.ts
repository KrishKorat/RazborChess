import { Chess } from 'chess.js';
import { GameReviewStep, PieceColor, GameMetadata } from '../../types/chess';
import {
  analyzeTacticalContext,
  analyzeBestAlternative,
  getPieceFullName,
  PIECE_VALUES,
  TacticalContext,
  BestMoveAnalysis,
} from './positionContextAnalyzer';

export { getPieceFullName, PIECE_VALUES };
export type { BestMoveAnalysis };

export interface MoveExplanationFacets {
  whatHappened: string;
  why: string;
  alternative: string;
  consequence: string;
  learningPoint: string;
  summary: string;
  bestMoveIdea?: string;
}

/**
 * Calculates the total material count for White and Black from a FEN string.
 */
export function getMaterialBalance(fen: string): { white: number; black: number } {
  const [board] = fen.trim().split(/\s+/);
  let white = 0;
  let black = 0;

  for (const char of board) {
    const lower = char.toLowerCase();
    const val = PIECE_VALUES[lower];
    if (val !== undefined && val < 100) {
      if (char === char.toUpperCase()) {
        white += val;
      } else {
        black += val;
      }
    }
  }

  return { white, black };
}

/**
 * Verifies if the mover lost net material following this move and the opponent's top engine reply.
 */
export function verifyMaterialLoss(step: GameReviewStep): boolean {
  if (!step.fenBefore || !step.fenAfter) return false;

  const matBefore = getMaterialBalance(step.fenBefore);
  const moverNetBefore = step.color === 'w' 
    ? matBefore.white - matBefore.black 
    : matBefore.black - matBefore.white;

  // 1. Direct material loss on the move itself
  const matAfter = getMaterialBalance(step.fenAfter);
  const moverNetAfter = step.color === 'w' 
    ? matAfter.white - matAfter.black 
    : matAfter.black - matAfter.white;

  // 2. Check if opponent's engine top reply captures a piece
  if (step.playedMoveEval?.pv && step.playedMoveEval.pv.length > 0) {
    try {
      const chess = new Chess(step.fenAfter);
      const opponentUci = step.playedMoveEval.pv[0];
      const from = opponentUci.slice(0, 2);
      const to = opponentUci.slice(2, 4);
      const promotion = opponentUci.length > 4 ? opponentUci.slice(4, 5) : undefined;
      const res = chess.move({ from, to, promotion });

      if (res && res.captured) {
        const matAfterReply = getMaterialBalance(chess.fen());
        const moverNetAfterReply = step.color === 'w'
          ? matAfterReply.white - matAfterReply.black
          : matAfterReply.black - matAfterReply.white;

        if (moverNetAfterReply < moverNetBefore) {
          return true;
        }
      }
    } catch {
      // Fallback
    }
  }

  if (moverNetAfter < moverNetBefore - 1 && !step.san.includes('x')) {
    return true;
  }

  return false;
}

/**
 * Checks if the played move delivered checkmate.
 */
export function isDeliveredCheckmate(step: GameReviewStep): boolean {
  if (step.san.includes('#')) return true;
  if (!step.fenAfter) return false;
  try {
    const chess = new Chess(step.fenAfter);
    return chess.isCheckmate();
  } catch {
    return false;
  }
}

/**
 * Checks if the played move allows the opponent a forced checkmate.
 */
export function allowsForcedCheckmate(step: GameReviewStep): { allowed: boolean; movesToMate?: number } {
  if (!step.playedMoveEval || step.playedMoveEval.mate === undefined) {
    return { allowed: false };
  }

  const mate = step.playedMoveEval.mate;
  const isOpponentMate = step.color === 'w' ? mate < 0 : mate > 0;
  if (isOpponentMate) {
    return { allowed: true, movesToMate: Math.abs(mate) };
  }

  return { allowed: false };
}

/**
 * Checks if the mover missed a forced checkmate they had available.
 */
export function missedForcedCheckmate(step: GameReviewStep): boolean {
  if (!step.bestMoveEval || step.bestMoveEval.mate === undefined) {
    return false;
  }

  const bestMate = step.bestMoveEval.mate;
  const moverHadMate = step.color === 'w' ? bestMate > 0 : bestMate < 0;
  if (!moverHadMate) return false;

  if (step.playedMoveEval?.mate !== undefined) {
    const playedMate = step.playedMoveEval.mate;
    const moverStillHasMate = step.color === 'w' ? playedMate > 0 : playedMate < 0;
    if (moverStillHasMate) return false;
  }

  return true;
}

/**
 * Detects basic tactical context for backwards-compatibility.
 */
export function detectTacticalContext(step: GameReviewStep): {
  hungPiece?: { name: string; square: string };
  isCastling: boolean;
  isCastlingKingside: boolean;
  isCastlingQueenside: boolean;
  movedPieceName: string;
  isRecapture: boolean;
} {
  const ctx = analyzeTacticalContext(step);
  return {
    hungPiece: ctx.hungPiece ? { name: ctx.hungPiece.name, square: ctx.hungPiece.square } : undefined,
    isCastling: ctx.isCastling,
    isCastlingKingside: ctx.isCastlingKingside,
    isCastlingQueenside: ctx.isCastlingQueenside,
    movedPieceName: ctx.movedPieceName,
    isRecapture: ctx.isRecapture,
  };
}

/**
 * Describes the action of the move clearly, concisely, and with concrete chess knowledge.
 */
export function describeMoveAction(step: GameReviewStep, isUser: boolean, ctx?: TacticalContext): string {
  const prefix = isUser ? 'You played' : 'Your opponent played';
  const san = step.san;
  const context = ctx || analyzeTacticalContext(step);

  if (san === 'O-O') {
    return `${prefix} kingside castling (${san}), tucking the king into safety and activating the rook along the f-file.`;
  }
  if (san === 'O-O-O') {
    return `${prefix} queenside castling (${san}), securing the king while bringing the rook to the central d-file.`;
  }
  if (context.isCheckmate) {
    return `${prefix} ${san}, delivering checkmate!`;
  }
  if (context.isDoubleCheck) {
    return `${prefix} ${san}, delivering a devastating double check!`;
  }
  if (context.isDiscoveredCheck && context.discoveredAttack) {
    return `${prefix} ${san}, delivering a discovered check from the ${context.discoveredAttack.sliderPieceName} on ${context.discoveredAttack.sliderSquare}.`;
  }
  if (context.fork) {
    const withCheck = context.isCheck ? ' with check' : '';
    const desc = context.fork.description.replace(/^forks/, 'forking');
    return `${prefix} ${san}, ${desc}${withCheck}.`;
  }
  if (context.pin) {
    const withCheck = context.isCheck ? ' with check' : '';
    const desc = context.pin.description.replace(/^pins/, 'pinning');
    return `${prefix} ${san}, ${desc}${withCheck}.`;
  }
  if (context.skewer) {
    const withCheck = context.isCheck ? ' with check' : '';
    const desc = context.skewer.description.replace(/^skewers/, 'skewering');
    return `${prefix} ${san}, ${desc}${withCheck}.`;
  }
  if (context.isCheck) {
    return `${prefix} ${san}, delivering check to the enemy king.`;
  }
  if (context.isPromotion) {
    return `${prefix} ${san}, promoting the pawn to a ${context.promotedPieceName || 'queen'}.`;
  }
  if (context.isCapture) {
    const target = context.capturedPieceName ? ` the ${context.capturedPieceName}` : '';
    return `${prefix} ${san}, capturing${target} on ${context.toSquare}.`;
  }
  if (context.isRookOnOpenFile) {
    return `${prefix} ${san}, taking control of the open ${context.toSquare[0]}-file with the rook.`;
  }
  if (context.isRookOn7thRank) {
    return `${prefix} ${san}, invading the 7th rank with the rook to pressure enemy pawns.`;
  }
  if (context.isKnightOutpost) {
    return `${prefix} ${san}, anchoring the knight on the strong ${context.toSquare} outpost.`;
  }
  if (context.isPassedPawn) {
    return `${prefix} ${san}, advancing the passed pawn toward the promotion square.`;
  }
  if (context.isPawnBreak) {
    return `${prefix} ${san}, striking with a central pawn break to contest space.`;
  }
  if (context.isKingCentralized) {
    return `${prefix} ${san}, centralizing the king for the endgame.`;
  }
  if (san.startsWith('N')) {
    return `${prefix} ${san}, maneuvering the knight for tactical activity and central control.`;
  }
  if (san.startsWith('B')) {
    return `${prefix} ${san}, developing the bishop along an active diagonal.`;
  }
  if (san.startsWith('R')) {
    return `${prefix} ${san}, positioning the rook along an important file.`;
  }
  if (san.startsWith('Q')) {
    return `${prefix} ${san}, maneuvering the queen into position.`;
  }
  if (san.startsWith('K')) {
    return `${prefix} ${san}, moving the king.`;
  }
  return `${prefix} ${san}, advancing pawns for central space and control.`;
}

/**
 * Generates comprehensive, perspective-aware move explanations with natural chess coach insights.
 */
export function generateStructuredMoveExplanation(
  step: GameReviewStep,
  userColor: PieceColor = 'w',
  _metadata?: GameMetadata
): MoveExplanationFacets {
  const isUser = step.color === userColor;
  const { classification, bestMoveSan, winRateBefore, winRateAfter, phase } = step;

  // Comprehensive tactical and positional analysis
  const ctx = analyzeTacticalContext(step);
  const bestAlt = analyzeBestAlternative(step, userColor);

  // 1. What happened?
  const whatHappened = describeMoveAction(step, isUser, ctx);

  // 2. Why was the move good or bad?
  let why = '';
  let summary = '';

  const mateDelivered = ctx.mateDelivered;
  const mateAllowed = ctx.mateAllowed || allowsForcedCheckmate(step);
  const mateMissed = ctx.mateMissed || (missedForcedCheckmate(step) ? { missed: true } : undefined);
  const hasMaterialLoss = verifyMaterialLoss(step);
  const hungPiece = ctx.hungPiece;

  if (mateDelivered) {
    why = isUser 
      ? 'You spotted the decisive mating net and finished the game immediately.'
      : 'Your opponent found the decisive checkmating attack.';
    summary = isUser ? 'You delivered checkmate, ending the game.' : 'Your opponent delivered checkmate to conclude the game.';
  } else if (mateAllowed && mateAllowed.allowed && (classification === 'blunder' || classification === 'mistake')) {
    why = isUser
      ? `This move critically leaves your king exposed to a forced checkmate${mateAllowed.movesToMate ? ` in ${mateAllowed.movesToMate}` : ''}.`
      : `Your opponent exposed their king to a forced checkmate${mateAllowed.movesToMate ? ` in ${mateAllowed.movesToMate}` : ''}.`;
    summary = isUser
      ? `This move leaves your king exposed to a forced checkmate.${bestMoveSan ? ` ${bestMoveSan} was required.` : ''}`
      : 'Your opponent left their king open to a forced checkmate.';
  } else if (mateMissed && mateMissed.missed && (classification === 'missed_win' || classification === 'blunder')) {
    why = isUser
      ? `You had a forced checkmate sequence on the board but missed the execution.`
      : `Your opponent had a forced checkmate but failed to execute it.`;
    summary = isUser
      ? `You missed a forced checkmate sequence${bestMoveSan ? ` with ${bestMoveSan}` : ''}.`
      : 'Your opponent missed a forced checkmate sequence.';
  } else {
    switch (classification) {
      case 'forced':
        why = isUser
          ? 'This was your only legal move available on the board.'
          : 'Your opponent had no other legal moves available in this position.';
        summary = isUser
          ? 'This was your only legal move available.'
          : "This was your opponent's only legal move.";
        break;

      case 'brilliant':
        if (ctx.isSacrifice && ctx.sacrificedPieceName) {
          why = isUser
            ? `A sound and tactical material sacrifice that completely justifies giving up your ${ctx.sacrificedPieceName} on ${ctx.toSquare}.`
            : `Your opponent found an exceptional tactical sacrifice with their ${ctx.sacrificedPieceName} that breaks open the position.`;
          summary = isUser
            ? `A brilliant move! You found a sound piece sacrifice that creates a winning position.`
            : 'Your opponent found a brilliant piece sacrifice to break open the position.';
        } else {
          why = isUser
            ? 'A sound and tactical material sacrifice that completely justifies giving up material.'
            : 'Your opponent found an exceptional tactical sacrifice that breaks open the position.';
          summary = isUser
            ? 'A brilliant move! You found a sound piece sacrifice that creates a winning position.'
            : 'Your opponent found a brilliant piece sacrifice to break open the position.';
        }
        break;

      case 'great':
        if (ctx.fork) {
          why = isUser
            ? `A critical tactical find that ${ctx.fork.description}, preserving your winning advantage.`
            : `A critical move by your opponent that ${ctx.fork.description}.`;
          summary = isUser
            ? 'A great move! The only move that maintains your advantage.'
            : 'A critical move by your opponent that holds their advantage.';
        } else if (ctx.pin) {
          why = isUser
            ? `A critical find that ${ctx.pin.description}, maintaining your advantage under pressure.`
            : `Your opponent found the critical pin to hold their advantage.`;
          summary = isUser
            ? 'A great move! The only move that maintains your advantage.'
            : 'A critical move by your opponent that holds their advantage.';
        } else {
          why = isUser
            ? 'The only move that maintains the advantage in a sharp, critical position.'
            : 'Your opponent found the critical only-move continuation under pressure.';
          summary = isUser
            ? 'A great move! The only move that maintains your advantage.'
            : 'A critical move by your opponent that holds their advantage.';
        }
        break;

      case 'best':
        if (winRateBefore >= 60 && winRateAfter >= 85) {
          why = isUser
            ? 'You converted your positional advantage into a decisive winning continuation.'
            : 'Your opponent converted their advantage cleanly.';
          summary = isUser
            ? 'You found the strongest move and converted your advantage.'
            : 'Your opponent found the strongest move to convert their advantage.';
        } else if (ctx.fork) {
          why = isUser
            ? `The engine's top choice: ${ctx.fork.description}, forcing decisive material gain.`
            : `Your opponent found the strongest move, executing a tactical fork.`;
          summary = isUser
            ? "You found the engine's strongest continuation."
            : "Your opponent found the engine's strongest continuation.";
        } else if (ctx.pin) {
          why = isUser
            ? `The engine's top choice: ${ctx.pin.description}, maintaining strong pressure.`
            : `Your opponent found the strongest continuation.`;
          summary = isUser
            ? "You found the engine's strongest continuation."
            : "Your opponent found the engine's strongest continuation.";
        } else {
          why = isUser
            ? "You found the engine's strongest continuation, maximizing your piece harmony and pressure."
            : "Your opponent found the engine's top choice, leaving you with limited counterplay.";
          summary = isUser
            ? "You found the engine's strongest continuation."
            : "Your opponent found the engine's strongest continuation.";
        }
        break;

      case 'excellent':
        why = isUser
          ? "A very strong move that nearly matches the engine's first choice with minimal loss of accuracy."
          : 'Your opponent played a very strong move that maintains the balance of the position.';
        summary = isUser
          ? "A very strong move that nearly matches the engine's top choice."
          : "A very strong move that nearly matches the engine's top choice.";
        break;

      case 'good':
        why = isUser
          ? 'A practical, solid move that keeps your position safe and active.'
          : 'Your opponent played a solid move that maintains their position.';
        summary = isUser
          ? 'A solid move that keeps your position sound.'
          : "A solid move that keeps your opponent's position sound.";
        break;

      case 'book':
        why = 'Standard opening book theory recognized by grandmasters and opening theory databases.';
        summary = 'Standard opening book theory.';
        break;

      case 'inaccuracy':
        if (isUser) {
          if (ctx.weakensKingShield) {
            why = 'This move loosens the pawn shelter in front of your king, creating structural weaknesses.';
          } else if (hasMaterialLoss) {
            why = 'You exchanged or positioned a piece suboptimally, giving up pressure.';
          } else {
            why = 'A slight inaccuracy that relinquishes part of your positional advantage.';
          }
          summary = bestMoveSan
            ? `You played an inaccuracy. ${bestMoveSan} was slightly more precise.`
            : 'A slight inaccuracy that gives away part of your advantage.';
        } else {
          why = 'Your opponent played an inaccurate move, reducing their pressure.';
          summary = bestMoveSan
            ? `Your opponent played an inaccuracy. ${bestMoveSan} was stronger.`
            : 'Your opponent played an inaccuracy, opening up opportunities for you.';
        }
        break;

      case 'mistake':
        if (isUser) {
          if (winRateBefore >= 70 && winRateAfter < 55) {
            why = 'This move gives up your clear advantage and lets your opponent equalize.';
            summary = 'This move gives up a significant advantage.';
          } else if (hungPiece || hasMaterialLoss) {
            const h = hungPiece;
            why = h
              ? `You left your ${h.name} on ${h.square} vulnerable without sufficient tactical compensation.`
              : 'You left material vulnerable without sufficient tactical compensation.';
            summary = `This mistake drops material without compensation.${bestMoveSan ? ` ${bestMoveSan} was stronger.` : ''}`;
          } else if (ctx.weakensKingShield) {
            why = 'A serious positional mistake that compromises your king safety.';
            summary = bestMoveSan
              ? `A mistake that concedes the advantage. ${bestMoveSan} was stronger.`
              : 'A mistake that allows your opponent counterplay.';
          } else {
            why = 'A tactical mistake that shifts control of the board to your opponent.';
            summary = bestMoveSan
              ? `A mistake that concedes the advantage. ${bestMoveSan} was stronger.`
              : 'A mistake that allows your opponent counterplay.';
          }
        } else {
          if (hungPiece || hasMaterialLoss) {
            why = 'Your opponent allowed material to be captured or conceded a tactical weakness.';
            summary = 'Your opponent left material vulnerable, giving you a clear opportunity.';
          } else {
            why = 'Your opponent made a mistake, giving you a chance to take control.';
            summary = 'Your opponent made a mistake, handing you the initiative.';
          }
        }
        break;

      case 'blunder':
        if (isUser) {
          if (winRateBefore >= 75 && winRateAfter < 40) {
            why = 'This move turns what was a winning position into a lost game.';
            summary = 'You turned a winning position into a loss.';
          } else if (hungPiece || hasMaterialLoss) {
            const h = hungPiece;
            why = h
              ? `A serious blunder that leaves your ${h.name} on ${h.square} undefended, losing critical material.`
              : 'A serious blunder that drops significant material without compensation.';
            summary = `This blunder loses decisive material.${bestMoveSan ? ` ${bestMoveSan} was required.` : ''}`;
          } else {
            why = 'A serious blunder that severely damages your pawn structure or king safety.';
            summary = bestMoveSan
              ? `A serious blunder that compromises your position. ${bestMoveSan} was required.`
              : 'A serious blunder that gives your opponent a decisive advantage.';
          }
        } else {
          if (hungPiece || hasMaterialLoss) {
            why = 'Your opponent blundered material, giving you a clear path to victory.';
            summary = 'Your opponent hung critical material, leaving you with a winning position.';
          } else {
            why = 'Your opponent blundered severely, shifting the evaluation decisively in your favor.';
            summary = 'Your opponent blundered, allowing you to gain a decisive advantage.';
          }
        }
        break;

      case 'missed_win':
        if (isUser) {
          why = 'You held a decisive winning advantage but failed to play the winning continuation.';
          summary = bestMoveSan
            ? `You missed an opportunity to secure a decisive advantage with ${bestMoveSan}.`
            : 'You missed a chance to win the game.';
        } else {
          why = 'Your opponent had a winning position but let the win slip away.';
          summary = 'Your opponent had a winning position but let the win slip away.';
        }
        break;

      default:
        why = 'A standard practical move in this position.';
        summary = isUser ? 'A standard practical move.' : 'Your opponent made a normal move.';
    }
  }

  // 3. Best alternative
  let alternative = '';
  const isTopQuality = classification === 'best' || classification === 'brilliant' || classification === 'great' || classification === 'forced' || classification === 'book';

  if (isTopQuality) {
    alternative = 'No stronger continuation was available in this position.';
  } else if (bestMoveSan) {
    if (bestAlt) {
      if (isUser) {
        alternative = `Consider ${bestMoveSan} instead: it ${bestAlt.accomplishment}, which ${bestAlt.whyBetter}.`;
      } else {
        alternative = `Your opponent could have played ${bestMoveSan} to ${bestAlt.accomplishment}.`;
      }
    } else {
      if (isUser) {
        alternative = `Consider ${bestMoveSan} instead, which preserves your coordination and piece activity.`;
      } else {
        alternative = `Your opponent could have played ${bestMoveSan} to maintain resistance.`;
      }
    }
  } else {
    alternative = 'Maintain active piece coordination and king security.';
  }

  // 4. Best move idea (for the best move recommendation card)
  let bestMoveIdea: string | undefined;
  if (!isTopQuality && bestMoveSan && bestAlt) {
    bestMoveIdea = `Recommended: ${bestMoveSan} — ${bestAlt.accomplishment}. This is stronger because it ${bestAlt.whyBetter}.`;
  }

  // 5. Consequence
  let consequence = '';
  if (classification === 'blunder' || classification === 'mistake') {
    if (isUser) {
      consequence = hungPiece
        ? `Your opponent gained free material by picking off the ${hungPiece.name} on ${hungPiece.square}.`
        : 'Your opponent gained a more comfortable position, additional material, or a decisive initiative.';
    } else {
      consequence = 'You gained a commanding position with immediate tactical opportunities.';
    }
  } else if (classification === 'inaccuracy') {
    if (isUser) {
      consequence = 'The position drifted closer to equality, allowing your opponent counterplay.';
    } else {
      consequence = 'Your opponent gave away some ground, letting you equalize or claim the initiative.';
    }
  } else if (classification === 'forced') {
    consequence = 'The defensive obligations of the position were fulfilled without further deterioration.';
  } else {
    if (isUser) {
      consequence = 'You maintained solid control and kept your strategic advantage intact.';
    } else {
      consequence = 'Your opponent maintained their structure and solid chances.';
    }
  }

  // 6. Learning point
  let learningPoint = '';
  if (hungPiece || hasMaterialLoss) {
    learningPoint = 'Before playing a move, calculate opponent recaptures and check if pieces left behind are defended.';
  } else if (ctx.fork) {
    learningPoint = 'Look for tactical forks that attack multiple high-value targets simultaneously.';
  } else if (ctx.pin) {
    learningPoint = 'Exploit pins along ranks, files, and diagonals to immobilize enemy defenders.';
  } else if (mateAllowed?.allowed || mateMissed?.missed) {
    learningPoint = 'Always prioritize king safety and look for forcing checks, captures, and threats before passive moves.';
  } else if (classification === 'forced') {
    learningPoint = 'When in a constrained position, identifying the only saving move prevents instant defeat.';
  } else if (classification === 'missed_win') {
    learningPoint = 'When ahead, look for forcing tactical shots that extinguish the opponent’s counterplay immediately.';
  } else if (phase === 'opening') {
    learningPoint = 'In the opening, focus on rapid piece development, central control, and early king safety.';
  } else if (phase === 'endgame') {
    learningPoint = 'In the endgame, active king placement and calculated pawn advances decide the outcome.';
  } else {
    learningPoint = 'Compare candidate moves systematically and maintain active piece harmony throughout the game.';
  }

  return {
    whatHappened,
    why,
    alternative,
    consequence,
    learningPoint,
    summary,
    bestMoveIdea,
  };
}

/**
 * Generates a concise, deterministic, evidence-based explanation for a game review step.
 * Backwards-compatible wrapper returning the summary string.
 */
export function generateMoveExplanation(step: GameReviewStep, userColor: PieceColor = 'w'): string {
  return generateStructuredMoveExplanation(step, userColor).summary;
}
