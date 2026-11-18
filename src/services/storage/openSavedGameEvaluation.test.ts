import { describe, it, expect } from 'vitest';
import { VariationTree } from '../tree/variationTree';
import { EvalCache, populateEvalCacheFromReview } from '../engine/evalCache';
import { GameReviewReport } from '../../types/chess';
import { SavedGame } from '../../types/storage';

describe('Saved Game Evaluation Loading and Persistence', () => {
  it('immediately populates evalCache with stored evaluations from a saved game review report', () => {
    const tree = new VariationTree();
    tree.addMove('e2', 'e4');
    tree.addMove('e7', 'e5');
    tree.addMove('g1', 'f3');

    const rootFen = tree.getRootNode().fen;
    const e4Fen = tree.getNode('node_1')!.fen;
    const e5Fen = tree.getNode('node_2')!.fen;
    const nf3Fen = tree.getNode('node_3')!.fen;

    const mockReport: GameReviewReport = {
      schemaVersion: 2,
      whiteAccuracy: 92.4,
      blackAccuracy: 89.1,
      whiteAcpl: 22,
      blackAcpl: 28,
      whitePhaseAccuracy: { opening: 95, middlegame: 90, endgame: 92 },
      blackPhaseAccuracy: { opening: 93, middlegame: 87, endgame: 89 },
      classificationCounts: {
        white: { brilliant: 0, great: 0, best: 2, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, forced: 0, missed_win: 0 },
        black: { brilliant: 0, great: 0, best: 1, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, forced: 0, missed_win: 0 },
      },
      estimatedElo: {
        white: { min: 1800, max: 2000, estimate: 1900, confidence: 'high' },
        black: { min: 1750, max: 1950, estimate: 1850, confidence: 'high' },
      },
      moves: [
        {
          ply: 1,
          moveNumber: 1,
          color: 'w',
          san: 'e4',
          uci: 'e2e4',
          fenBefore: rootFen,
          fenAfter: e4Fen,
          playedMoveEval: { depth: 16, score: 28, bestMove: 'e2e4', pv: ['e2e4'], fen: e4Fen },
          bestMoveEval: { depth: 16, score: 25, bestMove: 'e2e4', pv: ['e2e4'], fen: rootFen },
          centipawnLoss: 0,
          winRateBefore: 53.6,
          winRateAfter: 54.0,
          winRateDelta: 0,
          classification: 'best',
          phase: 'opening',
          bestMoveSan: 'e4',
        },
        {
          ply: 2,
          moveNumber: 1,
          color: 'b',
          san: 'e5',
          uci: 'e7e5',
          fenBefore: e4Fen,
          fenAfter: e5Fen,
          playedMoveEval: { depth: 16, score: 20, bestMove: 'e7e5', pv: ['e7e5'], fen: e5Fen },
          bestMoveEval: { depth: 16, score: 28, bestMove: 'e7e5', pv: ['e7e5'], fen: e4Fen },
          centipawnLoss: 8,
          winRateBefore: 54.0,
          winRateAfter: 52.8,
          winRateDelta: 1.2,
          classification: 'best',
          phase: 'opening',
          bestMoveSan: 'e5',
        },
        {
          ply: 3,
          moveNumber: 2,
          color: 'w',
          san: 'Nf3',
          uci: 'g1f3',
          fenBefore: e5Fen,
          fenAfter: nf3Fen,
          playedMoveEval: { depth: 16, score: 35, bestMove: 'g1f3', pv: ['g1f3'], fen: nf3Fen },
          bestMoveEval: { depth: 16, score: 20, bestMove: 'g1f3', pv: ['g1f3'], fen: e5Fen },
          centipawnLoss: 0,
          winRateBefore: 52.8,
          winRateAfter: 55.0,
          winRateDelta: 0,
          classification: 'best',
          phase: 'opening',
          bestMoveSan: 'Nf3',
        },
      ],
      criticalPositions: [],
    };

    const savedGame: SavedGame = {
      id: 'test_game_1',
      title: 'Test Game',
      pgn: tree.exportPgn(),
      startingFen: rootFen,
      currentFen: nf3Fen,
      treeNodes: Array.from(tree.getAllNodes().values()),
      currentNodeId: 'node_3',
      metadata: { white: 'White Player', black: 'Black Player' },
      reviewReport: mockReport,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: 'review',
    };

    const evalCache = new EvalCache();
    expect(evalCache.size()).toBe(0);

    // Simulate opening the game
    evalCache.clear();
    populateEvalCacheFromReview(evalCache, savedGame.reviewReport, tree);

    // Assert that root, e4, e5, and Nf3 are all in cache with correct scores
    expect(evalCache.has(rootFen)).toBe(true);
    expect(evalCache.get(rootFen)?.evaluation.score).toBe(25);

    expect(evalCache.has(e4Fen)).toBe(true);
    expect(evalCache.get(e4Fen)?.evaluation.score).toBe(28);

    expect(evalCache.has(e5Fen)).toBe(true);
    expect(evalCache.get(e5Fen)?.evaluation.score).toBe(20);

    expect(evalCache.has(nf3Fen)).toBe(true);
    expect(evalCache.get(nf3Fen)?.evaluation.score).toBe(35);
  });

  it('clears stale evaluations when switching games so data does not bleed across games', () => {
    const evalCache = new EvalCache();
    evalCache.set('old_fen_1', { depth: 14, score: 999, bestMove: 'a2a3', pv: ['a2a3'] });
    expect(evalCache.has('old_fen_1')).toBe(true);

    // When opening a new game, clearing cache removes the old positions
    evalCache.clear();
    expect(evalCache.has('old_fen_1')).toBe(false);
    expect(evalCache.size()).toBe(0);
  });
});
