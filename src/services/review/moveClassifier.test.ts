import { describe, it, expect } from 'vitest';
import { 
  calculateMoveDeltas, 
  classifyMove, 
  calculateMoveAccuracy, 
  compileGameReviewReport 
} from './moveClassifier';
import { GameReviewStep, MoveEvaluation } from '../../types/chess';

describe('moveClassifier', () => {
  describe('calculateMoveDeltas', () => {
    it('calculates centipawn loss and win rate delta for White move', () => {
      // White was +100 cp (win rate ~62%), after bad move is +20 cp (win rate ~52%)
      const evalBefore: MoveEvaluation = {
        depth: 14,
        score: 100,
        pv: ['e2e4'],
        bestMove: 'e2e4',
      };
      const evalAfter: MoveEvaluation = {
        depth: 14,
        score: 20,
        pv: ['d2d4'],
        bestMove: 'd2d4',
      };

      const deltas = calculateMoveDeltas(evalBefore, evalAfter, 'w');
      expect(deltas.centipawnLoss).toBe(80);
      expect(deltas.winRateDelta).toBeGreaterThan(0);
      expect(deltas.winRateBefore).toBeGreaterThan(deltas.winRateAfter);
    });

    it('calculates centipawn loss and win rate delta for Black move', () => {
      // Position before Black move: White was +50 (Black was -50).
      // Position after Black blunder: White is +350 (Black is -350).
      const evalBefore: MoveEvaluation = {
        depth: 14,
        score: 50,
        pv: ['e7e5'],
        bestMove: 'e7e5',
      };
      const evalAfter: MoveEvaluation = {
        depth: 14,
        score: 350,
        pv: ['f7f6'],
        bestMove: 'f7f6',
      };

      const deltas = calculateMoveDeltas(evalBefore, evalAfter, 'b');
      expect(deltas.centipawnLoss).toBe(300);
      expect(deltas.winRateDelta).toBeGreaterThan(25);
    });

    it('handles White maintaining forced mate with 0 CPL', () => {
      const evalBefore: MoveEvaluation = {
        depth: 14,
        score: 10000,
        mate: 3,
        pv: ['d1h5'],
        bestMove: 'd1h5',
      };
      const evalAfter: MoveEvaluation = {
        depth: 14,
        score: 10000,
        mate: 2,
        pv: ['h5f7'],
        bestMove: 'h5f7',
      };

      const deltas = calculateMoveDeltas(evalBefore, evalAfter, 'w');
      expect(deltas.centipawnLoss).toBe(0);
      expect(deltas.winRateDelta).toBe(0);
    });

    it('penalizes severely if player walks into forced mate', () => {
      const evalBefore: MoveEvaluation = {
        depth: 14,
        score: 0,
        pv: ['g1f3'],
        bestMove: 'g1f3',
      };
      const evalAfter: MoveEvaluation = {
        depth: 14,
        score: -10000,
        mate: -1, // Black mates next move
        pv: ['d8h4'],
        bestMove: 'd8h4',
      };

      const deltas = calculateMoveDeltas(evalBefore, evalAfter, 'w');
      expect(deltas.centipawnLoss).toBeGreaterThan(700);
    });
  });

  describe('classifyMove', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const e4Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

    // Non-book middlegame position for move classification thresholds
    const midFen = 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8';
    const midAfterFen = 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/1PN1PN2/P3BPPP/R1BQ1RK1 b - - 0 8';

    it('classifies recognized opening move as book', () => {
      const res = classifyMove('e2e4', 'e2e4', 0, 52, 52, 0, startFen, e4Fen, 'e4');
      expect(res).toBe('book');
    });

    it('classifies top engine move in middlegame as best', () => {
      const res = classifyMove('d4c5', 'd4c5', 0, 52, 52, 0, midFen, midAfterFen);
      expect(res).toBe('best');
    });

    it('classifies critical saving turnaround as great', () => {
      const res = classifyMove('d4c5', 'd4c5', 0, 32, 48, 0, midFen, midAfterFen);
      expect(res).toBe('great');
    });

    it('classifies small loss (e.g. 15-25 cp) as excellent', () => {
      const res = classifyMove('c3d5', 'd4c5', 18, 52, 50, 2.0, midFen, midAfterFen);
      expect(res).toBe('excellent');
    });

    it('classifies medium loss (e.g. 70 cp) as inaccuracy', () => {
      const res = classifyMove('a2a3', 'd4c5', 70, 52, 43, 9.0, midFen, midAfterFen);
      expect(res).toBe('inaccuracy');
    });

    it('classifies large loss (e.g. 160 cp) as mistake', () => {
      const res = classifyMove('a2a4', 'd4c5', 160, 52, 33, 19.0, midFen, midAfterFen);
      expect(res).toBe('mistake');
    });

    it('classifies catastrophic loss (e.g. 350 cp, win rate drop 35%) as blunder', () => {
      const res = classifyMove('g2g4', 'd4c5', 350, 52, 15, 37.0, midFen, midAfterFen);
      expect(res).toBe('blunder');
    });

    it('classifies squandering a completely winning advantage as missed win', () => {
      const res = classifyMove('b2b3', 'd4c5', 280, 88, 48, 40.0, midFen, midAfterFen);
      expect(res).toBe('missed_win');
    });

    it('classifies only legal move (forced move) as forced', () => {
      // White King on a1, Black Queen on b2 (checkmate) or single escape:
      // White King on h1 in check by rook on g1, only move is Kxg1.
      const singleEscapeFen = 'k5r1/8/8/8/8/8/8/7K w - - 0 1';
      const res = classifyMove('h1g1', 'h1g1', 0, 10, 10, 0, singleEscapeFen, '6K1/8/8/8/8/8/8/8 b - - 0 1');
      expect(res).toBe('forced');
    });
  });

  describe('calculateMoveAccuracy', () => {
    it('returns 100 for 0 win rate delta', () => {
      expect(calculateMoveAccuracy(0)).toBe(100);
      expect(calculateMoveAccuracy(-2)).toBe(100);
    });

    it('returns lower accuracy as delta increases', () => {
      const acc5 = calculateMoveAccuracy(5);
      const acc15 = calculateMoveAccuracy(15);
      const acc30 = calculateMoveAccuracy(30);

      expect(acc5).toBeGreaterThan(acc15);
      expect(acc15).toBeGreaterThan(acc30);
      expect(acc30).toBeGreaterThan(0);
    });
  });

  describe('compileGameReviewReport', () => {
    it('compiles full game report correctly', () => {
      const mockSteps: GameReviewStep[] = [
        {
          ply: 1,
          moveNumber: 1,
          color: 'w',
          san: 'e4',
          uci: 'e2e4',
          fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          centipawnLoss: 0,
          winRateBefore: 52,
          winRateAfter: 52,
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
          fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
          centipawnLoss: 10,
          winRateBefore: 48,
          winRateAfter: 47,
          winRateDelta: 1,
          classification: 'excellent',
          phase: 'opening',
          bestMoveSan: 'e5',
        },
        {
          ply: 3,
          moveNumber: 2,
          color: 'w',
          san: 'Nf3',
          uci: 'g1f3',
          fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
          fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
          centipawnLoss: 0,
          winRateBefore: 53,
          winRateAfter: 53,
          winRateDelta: 0,
          classification: 'best',
          phase: 'opening',
          bestMoveSan: 'Nf3',
        },
        {
          ply: 4,
          moveNumber: 2,
          color: 'b',
          san: 'f6',
          uci: 'f7f6',
          fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
          fenAfter: 'rnbqkbnr/pppp2pp/5p2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
          centipawnLoss: 260,
          winRateBefore: 47,
          winRateAfter: 15,
          winRateDelta: 32,
          classification: 'blunder',
          phase: 'opening',
          bestMoveSan: 'Nc6',
        },
      ];

      const report = compileGameReviewReport(mockSteps);
      expect(report.whiteAccuracy).toBe(100);
      expect(report.blackAccuracy).toBeLessThan(70);
      expect(report.whiteAcpl).toBe(0);
      expect(report.blackAcpl).toBe(135);
      expect(report.classificationCounts.white.best).toBe(2);
      expect(report.classificationCounts.black.blunder).toBe(1);
      expect(report.criticalPositions).toContain(4);
      expect(report.estimatedElo.white.estimate).toBeGreaterThan(report.estimatedElo.black.estimate);
    });
  });
});
