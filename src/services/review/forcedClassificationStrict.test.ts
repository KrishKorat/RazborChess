import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { checkForcedMove, classifyMove } from './moveClassifier';
import { MultiPvEvaluation } from '../../types/chess';

describe('Strict Forced Move Classification', () => {
  // Test 1: Exactly one legal move -> Forced
  it('1. classifies as Forced when player has exactly one legal move available', () => {
    // White King on e1 in check by Rook on a1 with only Kd2 available
    const singleLegalFen = '8/8/8/8/8/5k2/8/r3K3 w - - 0 1';
    const ch = new Chess(singleLegalFen);
    expect(ch.moves().length).toBe(1);
    expect(ch.moves()[0]).toBe('Kd2');

    // 1. checkForcedMove helper
    expect(checkForcedMove(singleLegalFen)).toBe(true);

    // 2. classifyMove
    const classification = classifyMove(
      'e1d2',
      'e1d2',
      0,
      5,
      5,
      0,
      singleLegalFen,
      '8/8/8/8/8/5k2/3K4/r7 b - - 1 1',
      'Kd2'
    );
    expect(classification).toBe('forced');
  });

  // Test 2: Two or more legal moves -> Never Forced
  it('2. never classifies as Forced when player has two or more legal moves', () => {
    // White King in check with 2 legal escapes: Kd1 or Kd2
    const twoLegalFen = '8/8/8/8/8/8/5k2/r3K3 w - - 0 1';
    const ch = new Chess(twoLegalFen);
    expect(ch.moves().length).toBeGreaterThanOrEqual(2);

    expect(checkForcedMove(twoLegalFen)).toBe(false);

    const classification = classifyMove(
      'e1d2',
      'e1d2',
      0,
      10,
      10,
      0,
      twoLegalFen,
      '8/8/8/8/8/8/3K1k2/r7 b - - 1 1',
      'Kd2'
    );
    expect(classification).not.toBe('forced');
    expect(classification).toBe('best');
  });

  // Test 3: A necessary or favourable trade with multiple legal moves -> Not Forced
  it('3. does not classify a necessary or favourable trade as Forced when multiple legal moves exist', () => {
    // White Queen on d4 attacked, favourable queen exchange on d8 is the best move, but king or pawn moves are also legal
    const tradeFen = '3r2k1/ppp2ppp/8/8/3Q4/8/PPP2PPP/4R1K1 w - - 0 1';
    const ch = new Chess(tradeFen);
    // White has multiple legal moves (Qxd8+, Qe4, Qe5, Qc3, Qb4, Qa4, h3, g3, etc.)
    expect(ch.moves().length).toBeGreaterThan(5);

    expect(checkForcedMove(tradeFen)).toBe(false);

    // Played the back-rank winning trade Qxd8#
    const classification = classifyMove(
      'd4d8',
      'd4d8',
      0,
      99,
      100,
      0,
      tradeFen,
      '3Q2k1/ppp2ppp/8/8/8/8/PPP2PPP/4R1K1 b - - 0 1',
      'Qxd8#'
    );
    expect(classification).not.toBe('forced');
    expect(classification).toBe('best');
  });

  // Test 4: The engine's preferred move with multiple legal moves -> Not Forced
  it('4. does not classify engine preferred only-saving move as Forced when multiple legal moves exist', () => {
    // Position where top move holds defense while alternatives lose (200+ cp gap), but 25 legal moves exist
    const multiMoveFen = 'r1bqk2r/pppp1ppp/2n5/4p3/1b2P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 1 6';
    const ch = new Chess(multiMoveFen);
    expect(ch.moves().length).toBeGreaterThan(10);

    expect(checkForcedMove(multiMoveFen)).toBe(false);

    const multiPv: MultiPvEvaluation[] = [
      {
        id: 1,
        depth: 14,
        score: 10, // top move Bd2 holds (+0.10)
        pv: ['c1d2'],
        bestMove: 'c1d2',
      },
      {
        id: 2,
        depth: 14,
        score: -240, // 2nd move blunders (-2.40, a 250 cp drop)
        pv: ['a2a3', 'b4c3'],
        bestMove: 'a2a3',
      },
    ];

    const classification = classifyMove(
      'c1d2',
      'c1d2',
      0,
      50,
      50,
      0,
      multiMoveFen,
      'r1bqk2r/pppp1ppp/2n5/4p3/1b2P3/2NP1N2/PPPB1PPP/R2QKB1R b KQkq - 2 6',
      'Bd2',
      multiPv
    );

    // CRITICAL: Must NEVER be 'forced' because legalMoves.length > 1!
    expect(classification).not.toBe('forced');
    // Top engine choice with MultiPV gap is classified as Great or Best
    expect(['great', 'best']).toContain(classification);
  });
});
