import { describe, it, expect } from 'vitest';
import { generateStructuredMoveExplanation, generateMoveExplanation } from './moveExplanationService';
import { analyzeTacticalContext, analyzeBestAlternative } from './positionContextAnalyzer';
import { GameReviewStep } from '../../types/chess';

describe('Chess.com-Style Intelligent Move Feedback', () => {
  describe('1. Tactical and Positional Concept Extraction', () => {
    it('detects knight forks against King and Rook', () => {
      // White plays Nc7+
      const step: GameReviewStep = {
        ply: 15,
        moveNumber: 8,
        color: 'w',
        san: 'Nc7+',
        uci: 'd5c7',
        fenBefore: 'r3k2r/pppb1ppp/8/3N4/8/8/PPPP1PPP/R1B1KB1R w KQkq - 0 8',
        fenAfter: 'r3k2r/ppNb1ppp/8/8/8/8/PPPP1PPP/R1B1KB1R b KQkq - 1 8',
        centipawnLoss: 0,
        winRateBefore: 85,
        winRateAfter: 95,
        winRateDelta: 0,
        classification: 'best',
        phase: 'middlegame',
      };

      const ctx = analyzeTacticalContext(step);
      expect(ctx.isCheck).toBe(true);
      expect(ctx.fork).toBeDefined();
      expect(ctx.fork?.hasKing).toBe(true);
      expect(ctx.fork?.hasRook).toBe(true);
      expect(ctx.fork?.description).toContain('king and rook');

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.whatHappened).toContain('fork');
    });

    it('detects pins created by bishops against the enemy King', () => {
      // White plays Bb5, pinning the knight on c6 to the king on e8 (after 1. e4 e5 2. Nf3 Nc6 3. Bb5 d6)
      const step: GameReviewStep = {
        ply: 7,
        moveNumber: 4,
        color: 'w',
        san: 'Bb5',
        uci: 'f1b5',
        fenBefore: 'r1bqkbnr/ppp2ppp/2np4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
        fenAfter: 'r1bqkbnr/ppp2ppp/2np4/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 1 4',
        centipawnLoss: 0,
        winRateBefore: 55,
        winRateAfter: 55,
        winRateDelta: 0,
        classification: 'best',
        phase: 'opening',
      };

      const ctx = analyzeTacticalContext(step);
      expect(ctx.pin).toBeDefined();
      expect(ctx.pin?.pinnedPieceName).toBe('knight');
      expect(ctx.pin?.pinnedSquare).toBe('c6');
      expect(ctx.pin?.isAbsolute).toBe(true);

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.whatHappened).toContain('pinning');
    });

    it('detects skewers along open lines', () => {
      // White plays Re1+, skewering King on e5 and Rook on e8 behind it
      const step: GameReviewStep = {
        ply: 61,
        moveNumber: 31,
        color: 'w',
        san: 'Re1+',
        uci: 'a1e1',
        fenBefore: '4r3/8/8/4k3/8/8/8/R5K1 w - - 0 31',
        fenAfter: '4r3/8/8/4k3/8/8/8/4R1K1 b - - 1 31',
        centipawnLoss: 0,
        winRateBefore: 90,
        winRateAfter: 99,
        winRateDelta: 0,
        classification: 'best',
        phase: 'endgame',
      };

      const ctx = analyzeTacticalContext(step);
      expect(ctx.skewer).toBeDefined();
      expect(ctx.skewer?.frontPieceName).toBe('king');
      expect(ctx.skewer?.backPieceName).toBe('rook');

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.whatHappened).toContain('skewering');
    });

    it('detects discovered check unmasked by moving piece', () => {
      // Knight on e4 jumps to g5+, uncovering rook on e1 checking king on e8
      const step: GameReviewStep = {
        ply: 41,
        moveNumber: 21,
        color: 'w',
        san: 'Ng5+',
        uci: 'e4g5',
        fenBefore: '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 21',
        fenAfter: '4k3/8/8/6N1/8/8/8/4R1K1 b - - 1 21',
        centipawnLoss: 0,
        winRateBefore: 90,
        winRateAfter: 95,
        winRateDelta: 0,
        classification: 'best',
        phase: 'endgame',
      };

      const ctx = analyzeTacticalContext(step);
      expect(ctx.isDiscoveredCheck).toBe(true);
      expect(ctx.isDoubleCheck).toBe(false);
      expect(ctx.discoveredAttack).toBeDefined();
      expect(ctx.discoveredAttack?.sliderPieceName).toBe('rook');

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.whatHappened).toContain('discovered check');
    });

    it('detects double check when both moving piece and uncovered slider deliver check', () => {
      // Knight on e4 jumps to f6+, both checking king on e8 and uncovering rook on e1
      const step: GameReviewStep = {
        ply: 41,
        moveNumber: 21,
        color: 'w',
        san: 'Nf6+',
        uci: 'e4f6',
        fenBefore: '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 21',
        fenAfter: '4k3/8/5N2/8/8/8/8/4R1K1 b - - 1 21',
        centipawnLoss: 0,
        winRateBefore: 90,
        winRateAfter: 95,
        winRateDelta: 0,
        classification: 'best',
        phase: 'endgame',
      };

      const ctx = analyzeTacticalContext(step);
      expect(ctx.isDiscoveredCheck).toBe(true);
      expect(ctx.isDoubleCheck).toBe(true);

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.whatHappened).toContain('double check');
    });

    it('detects rook seizing an open file', () => {
      // White plays Rad1 on an open d-file with no pawns
      const step: GameReviewStep = {
        ply: 25,
        moveNumber: 13,
        color: 'w',
        san: 'Rad1',
        uci: 'a1d1',
        fenBefore: 'r2q1rk1/ppp2ppp/2n1bn2/8/8/2N2N2/PPP2PPP/R2QKB1R w KQ - 0 13',
        fenAfter: 'r2q1rk1/ppp2ppp/2n1bn2/8/8/2N2N2/PPP2PPP/3RKB1R b K - 1 13',
        centipawnLoss: 0,
        winRateBefore: 55,
        winRateAfter: 55,
        winRateDelta: 0,
        classification: 'best',
        phase: 'middlegame',
      };

      const ctx = analyzeTacticalContext(step);
      expect(ctx.isRookOnOpenFile).toBe(true);

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.whatHappened).toContain('open d-file');
    });

    it('detects advancing a passed pawn in the endgame', () => {
      // White pushes b5 passed pawn to b6
      const step: GameReviewStep = {
        ply: 75,
        moveNumber: 38,
        color: 'w',
        san: 'b6',
        uci: 'b5b6',
        fenBefore: '8/4k1p1/8/1P6/8/5K2/8/8 w - - 0 38',
        fenAfter: '8/4k1p1/1P6/8/8/5K2/8/8 b - - 0 38',
        centipawnLoss: 0,
        winRateBefore: 95,
        winRateAfter: 95,
        winRateDelta: 0,
        classification: 'best',
        phase: 'endgame',
      };

      const ctx = analyzeTacticalContext(step);
      expect(ctx.isPassedPawn).toBe(true);

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.whatHappened).toContain('passed pawn');
    });

    it('detects king centralization in the endgame', () => {
      // White plays Ke4, centralizing the king
      const step: GameReviewStep = {
        ply: 81,
        moveNumber: 41,
        color: 'w',
        san: 'Ke4',
        uci: 'f3e4',
        fenBefore: '8/4k1p1/8/8/8/5K2/8/8 w - - 0 41',
        fenAfter: '8/4k1p1/8/8/4K3/8/8/8 b - - 1 41',
        centipawnLoss: 0,
        winRateBefore: 50,
        winRateAfter: 50,
        winRateDelta: 0,
        classification: 'best',
        phase: 'endgame',
      };

      const ctx = analyzeTacticalContext(step);
      expect(ctx.isKingCentralized).toBe(true);

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.whatHappened).toContain('centralizing the king');
    });

    it('detects knight outpost in enemy territory', () => {
      // White places Nd5, supported by c4 pawn with no Black pawns on c or e files ahead
      const step: GameReviewStep = {
        ply: 21,
        moveNumber: 11,
        color: 'w',
        san: 'Nd5',
        uci: 'c3d5',
        fenBefore: 'r1bq1rk1/pp2bppp/8/8/2P1p3/2N5/PP3PPP/R1BQKB1R w KQ - 0 11',
        fenAfter: 'r1bq1rk1/pp2bppp/8/3N4/2P1p3/8/PP3PPP/R1BQKB1R b KQ - 1 11',
        centipawnLoss: 0,
        winRateBefore: 60,
        winRateAfter: 60,
        winRateDelta: 0,
        classification: 'best',
        phase: 'middlegame',
      };

      const ctx = analyzeTacticalContext(step);
      expect(ctx.isKnightOutpost).toBe(true);

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.whatHappened).toContain('outpost');
    });
  });

  describe('2. Coaching Feedback for Mistakes and Blunders', () => {
    it('clearly identifies dropped material when player hangs a piece', () => {
      // White hangs the queen: 1. Qe4?? Nxe4
      const fenBefore = 'rnbqkb1r/pppp1ppp/5n2/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 3';
      const fenAfter = 'rnbqkb1r/pppp1ppp/5n2/4p3/4Q3/8/PPPPPPPP/RNB1KBNR b KQkq - 1 3';
      const step: GameReviewStep = {
        ply: 5,
        moveNumber: 3,
        color: 'w',
        san: 'Qe4',
        uci: 'd1e4',
        fenBefore,
        fenAfter,
        playedMoveEval: {
          score: -600,
          depth: 14,
          bestMove: 'f6e4',
          pv: ['f6e4'],
        },
        bestMoveSan: 'Nf3',
        centipawnLoss: 550,
        winRateBefore: 55,
        winRateAfter: 5,
        winRateDelta: 50,
        classification: 'blunder',
        phase: 'opening',
      };

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.summary).toContain('decisive material');
      expect(facets.why).toContain('queen on e4');
      expect(facets.bestMoveIdea).toBeDefined();
      expect(facets.bestMoveIdea).toContain('Recommended: Nf3');
    });

    it('clearly explains when a blunder allows forced checkmate', () => {
      const step: GameReviewStep = {
        ply: 7,
        moveNumber: 4,
        color: 'w',
        san: 'g4',
        uci: 'g2g4',
        fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/5P2/8/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
        fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/5PP1/8/PPPPP2P/RNBQKBNR b KQkq g3 0 2',
        playedMoveEval: {
          score: -10000,
          depth: 14,
          mate: -1, // Fool's mate: Qh4#
          bestMove: 'd8h4',
          pv: ['d8h4'],
        },
        bestMoveSan: 'Nf3',
        centipawnLoss: 900,
        winRateBefore: 45,
        winRateAfter: 0,
        winRateDelta: 45,
        classification: 'blunder',
        phase: 'opening',
      };

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.summary).toContain('forced checkmate');
      expect(facets.why).toContain('forced checkmate in 1');
      expect(facets.bestMoveIdea).toBeDefined();
    });

    it('clearly explains missed checkmate opportunities', () => {
      const step: GameReviewStep = {
        ply: 7,
        moveNumber: 4,
        color: 'w',
        san: 'Nf3',
        uci: 'g1f3',
        fenBefore: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
        fenAfter: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNB1K2R b KQkq - 1 4',
        bestMoveSan: 'Qxf7#',
        bestMoveEval: {
          score: 10000,
          depth: 14,
          mate: 1, // Scholar's mate
          bestMove: 'f3f7',
          pv: ['f3f7'],
        },
        playedMoveEval: {
          score: 150,
          depth: 14,
          bestMove: 'e4f6',
          pv: ['e4f6'],
        },
        centipawnLoss: 800,
        winRateBefore: 100,
        winRateAfter: 65,
        winRateDelta: 35,
        classification: 'missed_win',
        phase: 'opening',
      };

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.summary).toContain('forced checkmate sequence');
      expect(facets.summary).toContain('Qxf7#');
      expect(facets.bestMoveIdea).toContain('delivers immediate checkmate');
    });
  });

  describe('3. Best Alternative Explanation Engine', () => {
    it('explains what the recommended best move accomplishes when played move was an inaccuracy', () => {
      // 1. e4 e5 2. Bc4 (instead of 2. Nf3)
      const step: GameReviewStep = {
        ply: 3,
        moveNumber: 2,
        color: 'w',
        san: 'Bc4',
        uci: 'f1c4',
        fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
        bestMoveSan: 'Nf3',
        centipawnLoss: 25,
        winRateBefore: 55,
        winRateAfter: 52,
        winRateDelta: 3,
        classification: 'inaccuracy',
        phase: 'opening',
      };

      const bestAlt = analyzeBestAlternative(step, 'w');
      expect(bestAlt).toBeDefined();
      expect(bestAlt?.san).toBe('Nf3');
      expect(bestAlt?.accomplishment).toBeDefined();
      expect(bestAlt?.whyBetter).toBeDefined();

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.bestMoveIdea).toBeDefined();
      expect(facets.bestMoveIdea).toContain('Recommended: Nf3');
    });

    it('explains fork executed by the recommended best move', () => {
      // Position where White played Kd1 instead of Nc7+ fork
      const step: GameReviewStep = {
        ply: 15,
        moveNumber: 8,
        color: 'w',
        san: 'Kd1',
        uci: 'e1d1',
        fenBefore: 'r3k2r/pppb1ppp/8/3N4/8/8/PPPP1PPP/R1B1KB1R w KQkq - 0 8',
        fenAfter: 'r3k2r/pppb1ppp/8/3N4/8/8/PPPP1PPP/R1BK1B1R b kq - 1 8',
        bestMoveSan: 'Nc7+',
        centipawnLoss: 450,
        winRateBefore: 90,
        winRateAfter: 50,
        winRateDelta: 40,
        classification: 'mistake',
        phase: 'middlegame',
      };

      const bestAlt = analyzeBestAlternative(step, 'w');
      expect(bestAlt).toBeDefined();
      expect(bestAlt?.san).toBe('Nc7+');
      expect(bestAlt?.accomplishment).toContain('forks the king and rook');

      const facets = generateStructuredMoveExplanation(step, 'w');
      expect(facets.bestMoveIdea).toContain('forks the king and rook');
    });
  });

  describe('4. Forced Move Strict Requirement', () => {
    it('verifies explanation for forced moves states only legal move available', () => {
      const step: GameReviewStep = {
        ply: 10,
        moveNumber: 5,
        color: 'b',
        san: 'Kh8',
        uci: 'g8h8',
        fenBefore: '7k/8/8/8/8/8/8/7K b - - 0 5',
        fenAfter: '8/7k/8/8/8/8/8/7K w - - 1 6',
        centipawnLoss: 0,
        winRateBefore: 50,
        winRateAfter: 50,
        winRateDelta: 0,
        classification: 'forced',
        phase: 'endgame',
      };

      const textUser = generateMoveExplanation(step, 'b');
      expect(textUser).toBe('This was your only legal move available.');

      const textOpponent = generateMoveExplanation(step, 'w');
      expect(textOpponent).toBe("This was your opponent's only legal move.");
    });
  });
});
