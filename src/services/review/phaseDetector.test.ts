import { describe, it, expect } from 'vitest';
import { detectGamePhase } from './phaseDetector';

describe('detectGamePhase', () => {
  it('identifies the standard starting position as opening', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(detectGamePhase(startFen)).toBe('opening');
  });

  it('identifies standard opening moves as opening', () => {
    // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5
    const italianFen = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    expect(detectGamePhase(italianFen)).toBe('opening');
  });

  it('identifies a king and pawn endgame as endgame', () => {
    const pawnEndgameFen = '8/5k2/4p3/3pP3/3P4/5K2/8/8 w - - 0 45';
    expect(detectGamePhase(pawnEndgameFen)).toBe('endgame');
  });

  it('identifies a position with both queens off and low material as endgame', () => {
    // White: R+B+4P, Black: R+N+4P, Queens traded
    const rookEndgameFen = '2r3k1/5ppp/8/8/8/5B2/5PPP/3R2K1 w - - 0 30';
    expect(detectGamePhase(rookEndgameFen)).toBe('endgame');
  });

  it('identifies a rich middlegame position as middlegame', () => {
    // Move 18, both queens on board, pieces developed
    const middlegameFen = 'r2q1rk1/1pp1bppp/p1np1n2/4p3/2B1P1b1/2NP1N2/PPPB1PPP/R2Q1RK1 w - - 2 18';
    expect(detectGamePhase(middlegameFen)).toBe('middlegame');
  });

  it('handles invalid FEN gracefully without throwing', () => {
    expect(detectGamePhase('invalid-fen-string')).toBe('middlegame');
  });
});
