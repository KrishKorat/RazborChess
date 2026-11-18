import { describe, it, expect } from 'vitest';
import { 
  classifyMove, 
  detectMaterialSacrifice,
  isMissedWin,
  checkGreatMoveContext,
  compileGameReviewReport
} from './moveClassifier';
import { MultiPvEvaluation, GameReviewStep, CURRENT_REVIEW_SCHEMA_VERSION } from '../../types/chess';
import { Chess } from 'chess.js';

describe('Move Classification System Audit & Correction', () => {
  // Test position: Morphy Opera Game before 10. Nxb5!
  // White has pawn on d4, bishop on c4, knight on c3, queen on f3, Black has pawns on b5, c6, d6, queen on e7
  const operaBefore10 = 'r3kb1r/p3qppp/2p5/1p6/2BP4/1QN2b2/PP3PPP/R1B2RK1 w kq - 0 10';
  // After 10. Nxb5 cxb5
  const operaAfter10 = 'r3kb1r/p3qppp/2p5/1N6/2BP4/1Q3b2/PP3PPP/R1B2RK1 b kq - 0 10';

  // Test position: Ordinary middlegame position
  const quietMidFenBefore = 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8';
  const quietMidFenAfter = 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/1PN1PN2/P3BPPP/R1BQ1RK1 b - - 0 8';

  // Test position: Forced move (King has only 1 legal escape move)
  const singleEscapeFen = 'k5r1/8/8/8/8/8/8/7K w - - 0 1';
  const singleEscapeAfterFen = 'k5K1/8/8/8/8/8/8/8 b - - 0 1';

  describe('1. Genuine Brilliant Sacrifice Detection', () => {
    it('identifies genuine tactical piece sacrifice (Morphy 10. Nxb5) as Brilliant', () => {
      // Knight enters b5 where Black's pawn on c6 can capture it
      const isSac = detectMaterialSacrifice(operaBefore10, operaAfter10, 'c3b5');
      expect(isSac).toBe(true);

      const classification = classifyMove(
        'c3b5',
        'c3b5',
        0,
        92, // winRateBefore: winning attack, but not 98%+
        94, // winRateAfter: maintains decisive attack
        0,
        operaBefore10,
        operaAfter10,
        'Nxb5'
      );
      expect(classification).toBe('brilliant');
    });

    it('identifies direct exchange sacrifice (Rook for Knight) as Brilliant', () => {
      // Position before Morphy 13. Rxd7
      const operaBefore13 = '3rkb1r/p2n1ppp/2p5/1B6/3P4/1Q6/PP3PPP/2KR3R w k - 2 13';
      const operaAfter13 = '3rkb1r/p2R1ppp/2p5/1B6/3P4/1Q6/PP3PPP/2K4R b k - 0 13';

      const isSac = detectMaterialSacrifice(operaBefore13, operaAfter13, 'd1d7');
      expect(isSac).toBe(true);

      const classification = classifyMove(
        'd1d7',
        'd1d7',
        0,
        94,
        96,
        0,
        operaBefore13,
        operaAfter13,
        'Rxd7'
      );
      expect(classification).toBe('brilliant');
    });

    it('does NOT classify ordinary best moves as Brilliant', () => {
      // Routine piece development: 8. Ne5 in Scandinavian
      const scandiFenBefore = 'r3kb1r/pp2pppp/2n5/q2pN3/3P2b1/2N4P/PPP1BPP1/R1BQK2R w KQkq - 1 8';
      const scandiFenAfter = 'r3kb1r/pp2pppp/2n5/q3N3/3P2b1/2N4P/PPP1BPP1/R1BQK2R b KQkq - 2 8';

      // Ne5 is not a sacrifice; it is a solid defended knight outpost
      const isSac = detectMaterialSacrifice(scandiFenBefore, scandiFenAfter, 'c3e5');
      expect(isSac).toBe(false);

      const classification = classifyMove(
        'c3e5',
        'c3e5',
        0,
        78,
        78,
        0,
        scandiFenBefore,
        scandiFenAfter,
        'Ne5'
      );
      // Must be 'best', never 'brilliant'!
      expect(classification).toBe('best');
    });

    it('does NOT classify ordinary pawn moves or routine best moves as Brilliant', () => {
      const classification = classifyMove(
        'd2d4',
        'd2d4',
        0,
        55,
        55,
        0,
        quietMidFenBefore,
        quietMidFenAfter,
        'd4'
      );
      expect(classification).toBe('best');
      expect(classification).not.toBe('brilliant');
    });

    it('does NOT classify moves in already trivially won positions (+12.00) as Brilliant', () => {
      // When winRateBefore >= 97% or score >= 700 cp, flashy moves are just cleanups
      const classification = classifyMove(
        'c3b5',
        'c3b5',
        0,
        98.5,
        99.0,
        0,
        operaBefore10,
        operaAfter10,
        'Nxb5',
        [],
        undefined,
        undefined,
        850,
        900
      );
      expect(classification).not.toBe('brilliant');
      expect(['best', 'great']).toContain(classification);
    });
  });

  describe('2. Great Move (!) Contextual Detection', () => {
    it('classifies as Great when second candidate move is significantly worse (gap >= 100 cp)', () => {
      const multiPv: MultiPvEvaluation[] = [
        { id: 1, depth: 14, score: 180, pv: ['c3d5'], bestMove: 'c3d5' },
        { id: 2, depth: 14, score: 20, pv: ['a1c1'], bestMove: 'a1c1' }, // 160 cp gap!
      ];

      const isGreat = checkGreatMoveContext(multiPv, 68, 70, 180, 180, 0);
      expect(isGreat).toBe(true);

      const classification = classifyMove(
        'c3d5',
        'c3d5',
        0,
        68,
        70,
        0,
        quietMidFenBefore,
        quietMidFenAfter,
        'Nd5',
        multiPv,
        undefined,
        undefined,
        180,
        180
      );
      expect(classification).toBe('great');
    });

    it('classifies as Best (NOT Great) when candidates have near-identical evaluations', () => {
      const multiPv: MultiPvEvaluation[] = [
        { id: 1, depth: 14, score: 45, pv: ['c3d5'], bestMove: 'c3d5' },
        { id: 2, depth: 14, score: 40, pv: ['a1c1'], bestMove: 'a1c1' }, // Only 5 cp gap!
      ];

      const isGreat = checkGreatMoveContext(multiPv, 54, 54, 45, 45, 0);
      expect(isGreat).toBe(false);

      const classification = classifyMove(
        'c3d5',
        'c3d5',
        0,
        54,
        54,
        0,
        quietMidFenBefore,
        quietMidFenAfter,
        'Nd5',
        multiPv,
        undefined,
        undefined,
        45,
        45
      );
      expect(classification).toBe('best');
    });

    it('does NOT qualify ordinary defensive moves as Great without decisive bifurcation', () => {
      // Player was in a defensive position (-220 cp, 30% win rate) and just maintains -220 cp without turnaround or MultiPV bifurcation.
      // A defensive position alone must NOT automatically qualify as Great.
      const isGreat = checkGreatMoveContext([], 30, 30, -220, -220, 0);
      expect(isGreat).toBe(false);

      const classification = classifyMove(
        'f1e1',
        'f1e1',
        0,
        30,
        30,
        0,
        quietMidFenBefore,
        quietMidFenAfter,
        'Re1',
        [],
        undefined,
        undefined,
        -220,
        -220
      );
      expect(classification).toBe('best');
    });

    it('classifies sole saving move under severe pressure as Great when proven by MultiPV bifurcation', () => {
      // Player is facing defeat (-220 cp), finds the sole defensive resource holding equality (-30 cp),
      // while second-best candidate loses (-230 cp, a gap of 200 cp!)
      const savingMultiPv: MultiPvEvaluation[] = [
        { id: 1, depth: 14, score: -30, pv: ['f1e1'], bestMove: 'f1e1' },
        { id: 2, depth: 14, score: -230, pv: ['a1c1'], bestMove: 'a1c1' },
      ];

      const isGreat = checkGreatMoveContext(savingMultiPv, 30, 47, -220, -30, 0);
      expect(isGreat).toBe(true);

      const classification = classifyMove(
        'f1e1',
        'f1e1',
        0,
        30,
        47,
        0,
        quietMidFenBefore,
        quietMidFenAfter,
        'Re1',
        savingMultiPv,
        undefined,
        undefined,
        -220,
        -30
      );
      expect(classification).toBe('great');
    });
  });

  describe('3. Missed Win Detection', () => {
    it('classifies missed forced checkmate as Missed Win', () => {
      // White had Mate in 2, but played a careless move allowing Black to escape to equality
      const isMissed = isMissedWin(
        false, // not engine top move
        2,     // mateBefore: White had Mate in 2
        undefined, // mateAfter: lost the forced mate
        10000,
        40,    // scoreAfter dropped to +0.40 cp
        100,   // winRateBefore = 100%
        54,    // winRateAfter = 54%
        46     // winRateDelta = 46%
      );
      expect(isMissed).toBe(true);

      const classification = classifyMove(
        'a2a3',
        'h5f7',
        800,
        100,
        54,
        46,
        'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1n3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
        'r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1n3/P7/1PPP1PPP/RNB1K1NR b KQkq - 0 4',
        'a3',
        [],
        2,
        undefined,
        10000,
        40
      );
      expect(classification).toBe('missed_win');
    });

    it('classifies squandering a decisive winning advantage (e.g. +4.50 to +0.60) as Missed Win', () => {
      const isMissed = isMissedWin(
        false,
        undefined,
        undefined,
        450, // scoreBefore: decisive +4.50 cp
        60,  // scoreAfter: drops to +0.60 cp
        93,  // winRateBefore: 93%
        58,  // winRateAfter: 58% (no longer clearly winning!)
        35   // winRateDelta: 35%
      );
      expect(isMissed).toBe(true);

      const classification = classifyMove(
        'h2h3',
        'd4c5',
        390,
        93,
        58,
        35,
        quietMidFenBefore,
        quietMidFenAfter,
        'h3',
        [],
        undefined,
        undefined,
        450,
        60
      );
      expect(classification).toBe('missed_win');
    });

    it('does NOT classify blunders in equal positions as Missed Win (must be Blunder)', () => {
      // Position was 0.00 (winRateBefore 50%), player hangs a rook -> drops to -4.00 (winRateAfter 10%)
      const isMissed = isMissedWin(
        false,
        undefined,
        undefined,
        0,
        -400,
        50,
        10,
        40
      );
      expect(isMissed).toBe(false); // Player was never winning!

      const classification = classifyMove(
        'g2g4',
        'd4c5',
        400,
        50,
        10,
        40,
        quietMidFenBefore,
        quietMidFenAfter,
        'g4',
        [],
        undefined,
        undefined,
        0,
        -400
      );
      expect(classification).toBe('blunder');
      expect(classification).not.toBe('missed_win');
    });

    it('does NOT classify moves that remain completely winning (+10.00 to +6.00) as Missed Win', () => {
      // Position was +10.00 (winRate 99.5%), player played suboptimal move that is still +6.00 (winRate 99.0%)
      const isMissed = isMissedWin(
        false,
        undefined,
        undefined,
        1000,
        600,
        99.5,
        99.0,
        0.5
      );
      expect(isMissed).toBe(false); // Position is still completely winning!
    });
  });

  describe('4. Forced Move Correctness', () => {
    it('classifies forced moves with only 1 legal option as Forced (never Brilliant or Great)', () => {
      // King on h1 in check, only legal move is Kxg1
      const ch = new Chess(singleEscapeFen);
      expect(ch.moves().length).toBe(1);

      const classification = classifyMove(
        'h1g1',
        'h1g1',
        0,
        15,
        15,
        0,
        singleEscapeFen,
        singleEscapeAfterFen,
        'Kxg1'
      );
      expect(classification).toBe('forced');
      expect(classification).not.toBe('great');
      expect(classification).not.toBe('brilliant');
    });
  });

  describe('5. End-to-End Report Generation with All 10 Classifications', () => {
    it('supports all 10 classifications in report compilation, counters, and statistics', () => {
      const steps: GameReviewStep[] = [
        { ply: 1, moveNumber: 1, color: 'w', san: 'e4', uci: 'e2e4', fenBefore: 's', fenAfter: 'e4', centipawnLoss: 0, winRateBefore: 52, winRateAfter: 52, winRateDelta: 0, classification: 'book', phase: 'opening' },
        { ply: 2, moveNumber: 1, color: 'b', san: 'e5', uci: 'e7e5', fenBefore: 'e4', fenAfter: 'e5', centipawnLoss: 0, winRateBefore: 48, winRateAfter: 48, winRateDelta: 0, classification: 'book', phase: 'opening' },
        { ply: 3, moveNumber: 2, color: 'w', san: 'Nf3', uci: 'g1f3', fenBefore: 'e5', fenAfter: 'Nf3', centipawnLoss: 0, winRateBefore: 52, winRateAfter: 52, winRateDelta: 0, classification: 'best', phase: 'opening' },
        { ply: 4, moveNumber: 2, color: 'b', san: 'd6', uci: 'd7d6', fenBefore: 'Nf3', fenAfter: 'd6', centipawnLoss: 15, winRateBefore: 48, winRateAfter: 46.5, winRateDelta: 1.5, classification: 'excellent', phase: 'opening' },
        { ply: 5, moveNumber: 3, color: 'w', san: 'd4', uci: 'd2d4', fenBefore: 'd6', fenAfter: 'd4', centipawnLoss: 32, winRateBefore: 53.5, winRateAfter: 50.5, winRateDelta: 3.0, classification: 'good', phase: 'opening' },
        { ply: 6, moveNumber: 3, color: 'b', san: 'Bg4', uci: 'c8g4', fenBefore: 'd4', fenAfter: 'Bg4', centipawnLoss: 55, winRateBefore: 49.5, winRateAfter: 43.5, winRateDelta: 6.0, classification: 'inaccuracy', phase: 'opening' },
        { ply: 7, moveNumber: 4, color: 'w', san: 'dxe5', uci: 'd4e5', fenBefore: 'Bg4', fenAfter: 'dxe5', centipawnLoss: 110, winRateBefore: 56.5, winRateAfter: 44.5, winRateDelta: 12.0, classification: 'mistake', phase: 'opening' },
        { ply: 8, moveNumber: 4, color: 'b', san: 'Bxf3', uci: 'g4f3', fenBefore: 'dxe5', fenAfter: 'Bxf3', centipawnLoss: 260, winRateBefore: 55.5, winRateAfter: 25.5, winRateDelta: 30.0, classification: 'blunder', phase: 'opening' },
        { ply: 9, moveNumber: 5, color: 'w', san: 'Qxf3', uci: 'd1f3', fenBefore: 'Bxf3', fenAfter: 'Qxf3', centipawnLoss: 350, winRateBefore: 88, winRateAfter: 50, winRateDelta: 38.0, classification: 'missed_win', phase: 'opening' },
        { ply: 10, moveNumber: 5, color: 'b', san: 'dxe5', uci: 'd6e5', fenBefore: 'Qxf3', fenAfter: 'dxe5', centipawnLoss: 0, winRateBefore: 50, winRateAfter: 50, winRateDelta: 0, classification: 'great', phase: 'opening' },
        { ply: 11, moveNumber: 6, color: 'w', san: 'Bc4', uci: 'f1c4', fenBefore: 'dxe5', fenAfter: 'Bc4', centipawnLoss: 0, winRateBefore: 85, winRateAfter: 85, winRateDelta: 0, classification: 'brilliant', phase: 'opening' },
      ];

      const report = compileGameReviewReport(steps);
      expect(report.schemaVersion).toBe(CURRENT_REVIEW_SCHEMA_VERSION);

      // Verify every classification exists in the report counts
      const allClassifications = [
        'book', 'brilliant', 'great', 'best', 'excellent',
        'good', 'inaccuracy', 'mistake', 'blunder', 'missed_win'
      ] as const;

      for (const cat of allClassifications) {
        const total = (report.classificationCounts.white[cat] || 0) + (report.classificationCounts.black[cat] || 0);
        expect(total).toBeGreaterThanOrEqual(1);
      }

      // Check critical positions contain blunders, mistakes, and missed wins
      expect(report.criticalPositions).toContain(7); // blunder
      expect(report.criticalPositions).toContain(8); // blunder
      expect(report.criticalPositions).toContain(9); // missed_win
    });
  });
});