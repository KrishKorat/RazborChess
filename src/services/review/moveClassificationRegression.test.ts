import { describe, it, expect } from 'vitest';
import { classifyMove, calculateMoveDeltas } from './moveClassifier';
import { VariationTree } from '../tree/variationTree';
import { MoveEvaluation, GameReviewReport, GameReviewStep } from '../../types/chess';
import { EvalCache } from '../engine/evalCache';

describe('Move Classification Accuracy & Variation Isolation Regressions', () => {
  const PGN_GAME = `[Event "Live Chess"]
[White "JPlatycerium"]
[Black "KeiFrost"]
[Result "0-1"]
[WhiteElo "1002"]
[BlackElo "1000"]
[ECO "B13"]

1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Bf5 5. c4 e6
6. cxd5 exd5 7. Nc3 Nf6 8. Qe2+ Be7 9. h3 O-O
10. g4 Be4 11. Be3 Bxf3 12. Qxf3 Re8 13. Be2 Nc6
14. g5 Ne4 15. Nxe4 dxe4 16. Qh5 Nxd4 17. O-O-O Nxe2+
18. Kb1 Qa5 19. Qxe2 Bxg5 20. Rhg1 Bxe3 21. Qxe3 Rad8
22. Rde1 Qd2 23. Qg3 Qd3+ 24. Qxd3 exd3 25. Rd1 Re2
26. Rge1 Rxe1 27. Rxe1 d2 28. Rd1 g5 29. Kc2 h5
30. Rxd2 Rxd2+ 31. Kxd2 f5 32. Ke3 Kg7 33. f4 g4
34. hxg4 fxg4 35. Kf2 Kf6 36. Kg3 Kf5 37. b4 b5
38. a3 a6 39. Kh4 Kxf4 40. Kxh5 Kf3 41. Kh4 g3
42. Kh3 Kf2`;

  const fenAfter6cxd5 = 'r2qkb1r/pp3ppp/4p3/3p1b2/3P4/8/PP3PPP/RNBQKB1R b KQkq - 0 6';
  const fenAfter6exd5 = 'r2qkb1r/pp3ppp/8/3p1b2/3P4/8/PP3PPP/RNBQKB1R w KQkq - 0 7';
  const fenAfter6Bd3 = 'r2qkb1r/pp3ppp/4p3/3p4/3P4/3b4/PP3PPP/RNBQKB1R w KQkq - 1 7';

  it('classifies the engine top move (6... exd5) as Best', () => {
    // Before move: White is slightly better (+0.25 cp, or -0.25 cp for Black)
    const evalBefore: MoveEvaluation = {
      depth: 14,
      score: 25, // White perspective
      pv: ['e6d5', 'b1c3', 'g8f6'],
      bestMove: 'e6d5',
    };

    // After move: Black played the top move exd5, position remains equal (+0.25 cp)
    const evalAfter: MoveEvaluation = {
      depth: 14,
      score: 25, // White perspective
      pv: ['b1c3', 'g8f6'],
      bestMove: 'b1c3',
    };

    const deltas = calculateMoveDeltas(evalBefore, evalAfter, 'b');
    expect(deltas.centipawnLoss).toBe(0);

    const classification = classifyMove(
      'e6d5',
      evalBefore.bestMove,
      deltas.centipawnLoss,
      deltas.winRateBefore,
      deltas.winRateAfter,
      deltas.winRateDelta,
      fenAfter6cxd5,
      fenAfter6exd5,
      'exd5'
    );

    expect(classification).toBe('best');
  });

  it('does NOT mark an inferior blunder move (6... Bd3) as Best', () => {
    // Before move: White is +0.25 cp
    const evalBefore: MoveEvaluation = {
      depth: 14,
      score: 25, // White perspective
      pv: ['e6d5', 'b1c3'],
      bestMove: 'e6d5',
    };

    // After move 6... Bd3: Black blunders a bishop for free!
    // White is now winning (+3.60 cp from White's perspective)
    const evalAfter: MoveEvaluation = {
      depth: 14,
      score: 360, // White perspective
      pv: ['f1d3', 'g8f6'],
      bestMove: 'f1d3',
    };

    const deltas = calculateMoveDeltas(evalBefore, evalAfter, 'b');
    // Black suffered significant centipawn loss (> 300 cp)
    expect(deltas.centipawnLoss).toBeGreaterThanOrEqual(300);
    expect(deltas.winRateDelta).toBeGreaterThanOrEqual(20);

    const classification = classifyMove(
      'f5d3', // played move Bd3
      evalBefore.bestMove, // engine recommended exd5
      deltas.centipawnLoss,
      deltas.winRateBefore,
      deltas.winRateAfter,
      deltas.winRateDelta,
      fenAfter6cxd5,
      fenAfter6Bd3,
      'Bd3'
    );

    // Must be classified as blunder or mistake, NEVER best!
    expect(classification).toBe('blunder');
    expect(classification).not.toBe('best');
  });

  it('prevents variation branches from reusing stale classifications from mainline review report', () => {
    const tree = new VariationTree();
    tree.importPgn(PGN_GAME);

    // Mock a completed review report for the mainline
    // In the mainline, move 12 (ply 12) is 6... exd5 which was Best
    const mainlineSteps: GameReviewStep[] = [
      {
        ply: 12,
        moveNumber: 6,
        color: 'b',
        san: 'exd5',
        uci: 'e6d5',
        fenBefore: fenAfter6cxd5,
        fenAfter: fenAfter6exd5,
        centipawnLoss: 0,
        winRateBefore: 47,
        winRateAfter: 47,
        winRateDelta: 0,
        classification: 'best',
        phase: 'opening',
        bestMoveSan: 'exd5',
      },
    ];

    const mockReport: GameReviewReport = {
      whiteAccuracy: 88,
      blackAccuracy: 93,
      whiteAcpl: 25,
      blackAcpl: 18,
      whitePhaseAccuracy: { opening: 90, middlegame: 87, endgame: 95 },
      blackPhaseAccuracy: { opening: 95, middlegame: 92, endgame: 96 },
      classificationCounts: {
        white: { forced: 0, book: 2, brilliant: 0, great: 1, best: 20, excellent: 4, good: 3, inaccuracy: 1, mistake: 10, blunder: 1, missed_win: 0 },
        black: { forced: 0, book: 1, brilliant: 1, great: 0, best: 23, excellent: 5, good: 4, inaccuracy: 3, mistake: 5, blunder: 0, missed_win: 0 },
      },
      estimatedElo: {
        white: { min: 950, max: 1100, estimate: 1020, confidence: 'medium' },
        black: { min: 950, max: 1100, estimate: 1030, confidence: 'medium' },
      },
      moves: mainlineSteps,
      criticalPositions: [],
    };

    // Navigate to move 6. cxd5 (ply 11)
    const pathToPly11 = tree.getMainlinePath().find((n) => n.ply === 11);
    expect(pathToPly11).toBeDefined();
    tree.selectNode(pathToPly11!.id);

    // Black manually plays 6... Bd3 instead of 6... exd5
    const variationNode = tree.addMove('f5', 'd3');
    expect(variationNode).not.toBeNull();
    expect(variationNode!.ply).toBe(12);
    expect(variationNode!.uci).toBe('f5d3');

    // Verify variationNode is NOT a mainline node
    expect(tree.isMainlineNode(variationNode!.id)).toBe(false);

    // Marker resolution logic:
    // Should NOT match mainline step 12 because:
    // 1. variationNode is not on the mainline
    // 2. variationNode.uci ('f5d3') does NOT match mainline step.uci ('e6d5')
    const resolveClassificationForNode = (node: any) => {
      let classification = node.classification || node.review?.classification;
      if (!classification && mockReport.moves && tree.isMainlineNode(node.id)) {
        const step = mockReport.moves.find(
          (m) => m.ply === node.ply && (m.uci.toLowerCase() === node.uci.toLowerCase() || m.san === node.san)
        );
        if (step?.classification) {
          classification = step.classification;
        }
      }
      return classification;
    };

    const resolved = resolveClassificationForNode(variationNode);
    expect(resolved).toBeUndefined(); // Must NOT resolve to 'best'!
    expect(resolved).not.toBe('best');
  });

  it('evalCache does not overwrite deeper evaluations having bestMove with empty bestMove', () => {
    const cache = new EvalCache();
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const goodEval: MoveEvaluation = {
      depth: 14,
      score: 15,
      pv: ['e2e4', 'e7e5'],
      bestMove: 'e2e4',
    };
    cache.set(fen, goodEval);

    const item1 = cache.get(fen);
    expect(item1?.evaluation.bestMove).toBe('e2e4');

    // Attempt to set shallower/empty eval
    const shallowEval: MoveEvaluation = {
      depth: 12,
      score: 0,
      pv: [],
      bestMove: '',
    };
    cache.set(fen, shallowEval);

    // Must still retain the deeper evaluation with bestMove
    const item2 = cache.get(fen);
    expect(item2?.evaluation.depth).toBe(14);
    expect(item2?.evaluation.bestMove).toBe('e2e4');
  });
});
