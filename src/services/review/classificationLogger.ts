import { MoveClassification, PieceColor } from '../../types/chess';

export interface ClassificationLogPayload {
  fenBefore: string;
  fenAfter: string;
  playedUci: string;
  playedSan?: string;
  bestUci: string;
  bestSan?: string;
  activeColor: PieceColor;
  evalBefore: {
    scoreWhiteCp: number;
    scoreSideToMoveCp: number;
    mateWhite?: number;
    mateSideToMove?: number;
    depth: number;
    isFromCache: boolean;
  };
  evalAfter: {
    scoreWhiteCp: number;
    scoreSideToMoveCp: number;
    mateWhite?: number;
    mateSideToMove?: number;
    depth: number;
    isFromCache: boolean;
  };
  deltas: {
    centipawnLoss: number;
    winRateBefore: number;
    winRateAfter: number;
    winRateDelta: number;
    scoreBeforeMover: number;
    scoreAfterMover: number;
  };
  classification: MoveClassification;
  source?: 'review' | 'live_board';
}

export interface ClassificationPendingPayload {
  fenBefore: string;
  fenAfter: string;
  playedUci: string;
  playedSan?: string;
  activeColor: PieceColor;
  evalBeforeAvailable: boolean;
  evalAfterAvailable: boolean;
  reason: string;
  source?: 'review' | 'live_board';
}

/**
 * Diagnostic logger instrumenting the classification pipeline in the developer console.
 * Transparently surfaces all evaluation parameters, perspective calculations, depths,
 * cache origins, and delta metrics.
 */
export function logClassificationDetails(payload: ClassificationLogPayload): void {
  const moverStr = payload.activeColor === 'w' ? 'White' : 'Black';
  const opponentStr = payload.activeColor === 'w' ? 'Black' : 'White';
  const moveLabel = payload.playedSan || payload.playedUci;

  const logObj = {
    '1. Position FEN Before': payload.fenBefore,
    '2. Played Move (UCI)': payload.playedUci,
    '3. Best Move (UCI)': payload.bestUci,
    '4. Eval Before Move': {
      'White Perspective': payload.evalBefore.mateWhite !== undefined 
        ? `M${payload.evalBefore.mateWhite}` 
        : `${(payload.evalBefore.scoreWhiteCp / 100).toFixed(2)} (${payload.evalBefore.scoreWhiteCp} cp)`,
      'Side-To-Move Perspective': `${moverStr} to move: ${
        payload.evalBefore.mateSideToMove !== undefined 
          ? `M${payload.evalBefore.mateSideToMove}` 
          : `${(payload.evalBefore.scoreSideToMoveCp / 100).toFixed(2)} (${payload.evalBefore.scoreSideToMoveCp} cp)`
      }`,
      'Depth': payload.evalBefore.depth,
      'From Cache': payload.evalBefore.isFromCache,
    },
    '5. Eval After Move': {
      'White Perspective': payload.evalAfter.mateWhite !== undefined 
        ? `M${payload.evalAfter.mateWhite}` 
        : `${(payload.evalAfter.scoreWhiteCp / 100).toFixed(2)} (${payload.evalAfter.scoreWhiteCp} cp)`,
      'Side-To-Move Perspective': `${opponentStr} to move: ${
        payload.evalAfter.mateSideToMove !== undefined 
          ? `M${payload.evalAfter.mateSideToMove}` 
          : `${(payload.evalAfter.scoreSideToMoveCp / 100).toFixed(2)} (${payload.evalAfter.scoreSideToMoveCp} cp)`
      }`,
      'Depth': payload.evalAfter.depth,
      'From Cache': payload.evalAfter.isFromCache,
    },
    '6. Moving Player Perspective': {
      'Player': moverStr,
      'Score Before': `${payload.deltas.scoreBeforeMover} cp`,
      'Score After': `${payload.deltas.scoreAfterMover} cp`,
      'Win Rate Before': `${payload.deltas.winRateBefore.toFixed(1)}%`,
      'Win Rate After': `${payload.deltas.winRateAfter.toFixed(1)}%`,
    },
    '7. Calculated Centipawn Loss': `${payload.deltas.centipawnLoss} cp`,
    '8. Calculated Win Rate Loss': `${payload.deltas.winRateDelta.toFixed(1)}%`,
    '9. Final Classification': payload.classification.toUpperCase(),
  };

  console.groupCollapsed(
    `[BoardScope Classification] Move ${moveLabel} (${payload.playedUci}) -> ${payload.classification.toUpperCase()} (CPL: ${payload.deltas.centipawnLoss}, WR-Drop: ${payload.deltas.winRateDelta}%)`
  );
  console.log('Position FEN Before:', payload.fenBefore);
  console.log('Actual Played Move:', payload.playedUci, payload.playedSan ? `(${payload.playedSan})` : '');
  console.log("Stockfish's Best Move:", payload.bestUci, payload.bestSan ? `(${payload.bestSan})` : '');
  console.log('Evaluation Before (White cp):', payload.evalBefore.scoreWhiteCp, '| Depth:', payload.evalBefore.depth, '| Cached:', payload.evalBefore.isFromCache);
  console.log('Evaluation After (White cp):', payload.evalAfter.scoreWhiteCp, '| Depth:', payload.evalAfter.depth, '| Cached:', payload.evalAfter.isFromCache);
  console.log('Side-to-move Perspective (Before):', `${moverStr}: ${payload.evalBefore.scoreSideToMoveCp} cp`);
  console.log('Side-to-move Perspective (After):', `${opponentStr}: ${payload.evalAfter.scoreSideToMoveCp} cp`);
  console.log('Calculated Centipawn Loss:', payload.deltas.centipawnLoss);
  console.log('Calculated Win Rate Difference:', `${payload.deltas.winRateDelta}%`);
  console.log('Final Move Classification:', payload.classification);
  console.table(logObj);
  console.groupEnd();
}

/**
 * Diagnostic logger when evaluation for a move is pending or missing.
 * Prevents substituting zeroes or default fallbacks.
 */
export function logClassificationPending(payload: ClassificationPendingPayload): void {
  const moveLabel = payload.playedSan || payload.playedUci;
  console.log(
    `[BoardScope Classification] PENDING for move ${moveLabel} (${payload.playedUci}): ${payload.reason} (evalBefore: ${payload.evalBeforeAvailable ? 'Ready' : 'Waiting'}, evalAfter: ${payload.evalAfterAvailable ? 'Ready' : 'Waiting'})`
  );
}
