import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { 
  calculateMoveDeltas, 
  classifyMove, 
  checkForcedMove,
  compileGameReviewReport 
} from './moveClassifier';
import { 
  generateStructuredMoveExplanation 
} from './moveExplanationService';
import { MoveEvaluation, MultiPvEvaluation, GameReviewStep } from '../../types/chess';

describe('ZEKO_GTA vs KeiFrost Move 54. Kxf3 Reproduction & Forced Classification Tests', () => {
  // Reconstruct the exact endgame ending from the prompt:
  // 47. g5 Nxh5 48. Kg4 g6 49. Kh4 Rb4+ 50. Kh3 Ng7 51. Kg3 Ne6 52. Kh3 Nxg5+ 53. Kg3 Nf3 54. Kxf3 Kf7
  const startFenAtMove47 = '1r6/4k1p1/5n2/7P/6P1/7K/8/8 w - - 0 47';

  function playToEnding() {
    const ch = new Chess(startFenAtMove47);
    const moves = [
      'g5', 'Nxh5',
      'Kg4', 'g6',
      'Kh4', 'Rb4+',
      'Kh3', 'Ng7',
      'Kg3', 'Ne6',
      'Kh3', 'Nxg5+',
      'Kg3', 'Nf3',
    ];
    for (const m of moves) {
      ch.move(m);
    }
    return ch;
  }

  it('correctly sets up position before 54. Kxf3 and identifies White legal moves', () => {
    const ch = playToEnding();
    const fenBefore54Kxf3 = ch.fen();
    expect(fenBefore54Kxf3).toBe('8/4k3/6p1/8/1r6/5nK1/8/8 w - - 2 54');

    // White King on g3: legal moves are Kh3, Kg2, Kf2, and Kxf3
    const legalMoves = ch.moves({ verbose: true });
    const uciMoves = legalMoves.map((m) => m.from + m.to);
    expect(uciMoves).toContain('g3f3'); // Kxf3
    expect(uciMoves).toContain('g3h3'); // Kh3
    expect(uciMoves).toContain('g3g2'); // Kg2
    expect(uciMoves).toContain('g3f2'); // Kf2
    expect(legalMoves.length).toBe(4);
  });

  it('evaluates and classifies 54. Kxf3 correctly as engine best move without perspective inversion', () => {
    const fenBefore = '8/4k3/6p1/8/1r6/5nK1/8/8 w - - 2 54';
    const fenAfterKxf3 = '8/4k3/6p1/8/1r6/5K2/8/8 b - - 0 54';

    // Before move: White is losing (e.g. Black has Rook + Knight vs bare King)
    // From White perspective: -1200 cp
    const evalBefore: MoveEvaluation = {
      depth: 14,
      score: -1200,
      pv: ['g3f3', 'e7f7', 'f3e3'],
      bestMove: 'g3f3', // Kxf3
    };

    // After move: White captured the knight! Black still winning with King + Rook vs King
    // From White perspective: -1150 cp
    const evalAfter: MoveEvaluation = {
      depth: 14,
      score: -1150,
      pv: ['e7f7', 'f3e3', 'b4b3'],
      bestMove: 'e7f7',
    };

    const deltas = calculateMoveDeltas(evalBefore, evalAfter, 'w');
    // Centipawn loss for playing top move Kxf3 is 0
    expect(deltas.centipawnLoss).toBe(0);

    const classification = classifyMove(
      'g3f3', // played move 54. Kxf3
      evalBefore.bestMove, // engine best move 'g3f3'
      deltas.centipawnLoss,
      deltas.winRateBefore,
      deltas.winRateAfter,
      deltas.winRateDelta,
      fenBefore,
      fenAfterKxf3,
      'Kxf3'
    );

    // Matches engine top move
    expect(classification).toBe('best');
  });

  it('guarantees that a manually played inferior move (e.g. 54. Kh3) CANNOT be classified as Best', () => {
    const fenBefore = '8/4k3/6p1/8/1r6/5nK1/8/8 w - - 2 54';
    const fenAfterKh3 = '8/4k3/6p1/8/1r6/5n1K/8/8 b - - 3 54';

    const evalBefore: MoveEvaluation = {
      depth: 14,
      score: -1200,
      pv: ['g3f3'],
      bestMove: 'g3f3', // Engine wants Kxf3
    };

    // If White plays 54. Kh3 instead of capturing the knight, White remains down a full Knight and Rook
    // Black has mate in 6 instead of mate in 15
    const evalAfterKh3: MoveEvaluation = {
      depth: 14,
      score: -2500, // Decisive drop
      pv: ['f3e5', 'h3g3'],
      bestMove: 'f3e5',
    };

    const deltas = calculateMoveDeltas(evalBefore, evalAfterKh3, 'w');

    const classification = classifyMove(
      'g3h3', // played move Kh3
      evalBefore.bestMove, // engine recommended Kxf3 (g3f3)
      deltas.centipawnLoss,
      deltas.winRateBefore,
      deltas.winRateAfter,
      deltas.winRateDelta,
      fenBefore,
      fenAfterKh3,
      'Kh3'
    );

    // CRITICAL: Must NEVER be classified as 'best' because it does not match engine's best move!
    expect(classification).not.toBe('best');
    expect(['mistake', 'blunder', 'inaccuracy', 'good']).toContain(classification);
  });

  describe('Strict Forced Move Classification', () => {
    it('classifies ONLY LEGAL MOVE as Forced', () => {
      // Position with only 1 legal move: White King in check with only 1 escape square
      const checkFen = '8/8/8/8/8/5k2/8/r3K3 w - - 0 1';
      const ch = new Chess(checkFen);
      expect(ch.moves().length).toBe(1);
      expect(ch.moves()[0]).toBe('Kd2');

      const forcedCheck = checkForcedMove(checkFen);
      expect(forcedCheck).toBe(true);

      const classification = classifyMove(
        'e1d2',
        'e1d2',
        0,
        5,
        5,
        0,
        checkFen,
        '8/8/8/8/8/5k2/3K4/r7 b - - 1 1',
        'Kd2'
      );

      expect(classification).toBe('forced');
    });

    it('does NOT classify as Forced when alternatives exist even if second-best drops >= 200 cp', () => {
      const fenBefore = 'r1bqk2r/pppp1ppp/2n5/4p3/1b2P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 1 6';
      
      const multiPv: MultiPvEvaluation[] = [
        {
          id: 1,
          depth: 14,
          score: 10, // top move holds equality (+0.10)
          pv: ['c1d2'],
          bestMove: 'c1d2',
        },
        {
          id: 2,
          depth: 14,
          score: -240, // 2nd move blunders into -2.40 (drops 250 cp)
          pv: ['a2a3', 'b4c3'],
          bestMove: 'a2a3',
        },
      ];

      const forcedCheck = checkForcedMove(fenBefore);
      expect(forcedCheck).toBe(false);

      const classification = classifyMove(
        'c1d2',
        'c1d2',
        0,
        52,
        52,
        0,
        fenBefore,
        'r1bqk2r/pppp1ppp/2n5/4p3/1b2P3/2NP1N2/PPPB1PPP/R2QKB1R b KQkq - 2 6',
        'Bd2',
        multiPv
      );

      // Under strict definition: multiple legal moves -> never forced
      expect(classification).not.toBe('forced');
      expect(['great', 'best']).toContain(classification);
    });

    it('calculates standard accuracy for Forced moves without artificial bonus', () => {
      const step: GameReviewStep = {
        ply: 1,
        moveNumber: 1,
        color: 'w',
        san: 'Kd2',
        uci: 'e1d2',
        fenBefore: '8/8/8/8/8/5k2/8/r3K3 w - - 0 1',
        fenAfter: '8/8/8/8/8/5k2/3K4/r7 b - - 1 1',
        centipawnLoss: 0,
        winRateBefore: 5,
        winRateAfter: 5,
        winRateDelta: 0,
        classification: 'forced',
        phase: 'endgame',
      };

      const report = compileGameReviewReport([step]);
      expect(report.whiteAccuracy).toBe(100);
      expect(report.classificationCounts.white.forced).toBe(1);
    });
  });

  describe('User vs Opponent Move Coaching Perspective', () => {
    it('generates "You played..." when user is Black (KeiFrost) on Black moves', () => {
      const step: GameReviewStep = {
        ply: 106,
        moveNumber: 53,
        color: 'b',
        san: 'Nf3',
        uci: 'g5f3',
        fenBefore: '8/4k1p1/6p1/6n1/1r6/6K1/8/8 b - - 1 53',
        fenAfter: '8/4k1p1/6p1/8/1r6/5nK1/8/8 w - - 2 54',
        centipawnLoss: 0,
        winRateBefore: 99,
        winRateAfter: 99,
        winRateDelta: 0,
        classification: 'best',
        phase: 'endgame',
      };

      const facets = generateStructuredMoveExplanation(step, 'b', { white: 'ZEKO_GTA', black: 'KeiFrost' });
      expect(facets.whatHappened).toContain('You played');
      expect(facets.whatHappened).toContain('Nf3');
      expect(facets.summary).toContain('You');
    });

    it('generates "Your opponent played..." when user is Black on White moves (54. Kxf3)', () => {
      const step: GameReviewStep = {
        ply: 107,
        moveNumber: 54,
        color: 'w',
        san: 'Kxf3',
        uci: 'g3f3',
        fenBefore: '8/4k3/6p1/8/1r6/5nK1/8/8 w - - 2 54',
        fenAfter: '8/4k3/6p1/8/1r6/5K2/8/8 b - - 0 54',
        centipawnLoss: 0,
        winRateBefore: 1,
        winRateAfter: 1,
        winRateDelta: 0,
        classification: 'best',
        phase: 'endgame',
      };

      // User is KeiFrost ('b'), so White move 54. Kxf3 is Opponent's move
      const facets = generateStructuredMoveExplanation(step, 'b', { white: 'ZEKO_GTA', black: 'KeiFrost' });
      expect(facets.whatHappened).toContain('Your opponent played');
      expect(facets.whatHappened).toContain('Kxf3');
      expect(facets.summary).toContain('Your opponent');
    });

    it('provides all 5 required comprehensive explanation facets', () => {
      const step: GameReviewStep = {
        ply: 12,
        moveNumber: 6,
        color: 'b',
        san: 'exd5',
        uci: 'e6d5',
        fenBefore: 'r2qkb1r/pp3ppp/4p3/3p1b2/3P4/8/PP3PPP/RNBQKB1R b KQkq - 0 6',
        fenAfter: 'r2qkb1r/pp3ppp/8/3p1b2/3P4/8/PP3PPP/RNBQKB1R w KQkq - 0 7',
        centipawnLoss: 0,
        winRateBefore: 50,
        winRateAfter: 50,
        winRateDelta: 0,
        classification: 'best',
        phase: 'opening',
        bestMoveSan: 'exd5',
      };

      const facets = generateStructuredMoveExplanation(step, 'b');
      expect(facets.whatHappened).toBeDefined();
      expect(facets.why).toBeDefined();
      expect(facets.alternative).toBeDefined();
      expect(facets.consequence).toBeDefined();
      expect(facets.learningPoint).toBeDefined();
      expect(facets.summary).toBeDefined();
    });
  });
});
