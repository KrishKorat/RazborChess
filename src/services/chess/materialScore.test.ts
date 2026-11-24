import { describe, it, expect } from 'vitest';
import { calculateMaterial } from './materialScore';

describe('calculateMaterial', () => {
  it('returns zero advantage and no captured pieces for initial standard chess position', () => {
    const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = calculateMaterial(initialFen);

    expect(result.whiteMaterial).toBe(39); // 8*1 + 2*3 + 2*3 + 2*5 + 9 = 39
    expect(result.blackMaterial).toBe(39);
    expect(result.advantage).toBe(0);
    expect(result.whiteAdvantage).toBe(0);
    expect(result.blackAdvantage).toBe(0);
    expect(result.whiteCaptured).toEqual([]);
    expect(result.blackCaptured).toEqual([]);
  });

  it('correctly calculates captured pawn and advantage +1 for White', () => {
    // Black missing 1 pawn on d5
    const fen = 'rnbqkbnr/ppp1pppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 2';
    const result = calculateMaterial(fen);

    expect(result.whiteMaterial).toBe(39);
    expect(result.blackMaterial).toBe(38);
    expect(result.advantage).toBe(1);
    expect(result.whiteAdvantage).toBe(1);
    expect(result.blackAdvantage).toBe(0);
    expect(result.whiteCaptured).toEqual([{ type: 'p', count: 1 }]);
    expect(result.blackCaptured).toEqual([]);
  });

  it('correctly calculates advantage for Black when White is down a Knight', () => {
    // White missing a knight (N)
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR b KQkq - 0 1';
    const result = calculateMaterial(fen);

    expect(result.whiteMaterial).toBe(36);
    expect(result.blackMaterial).toBe(39);
    expect(result.advantage).toBe(-3);
    expect(result.whiteAdvantage).toBe(0);
    expect(result.blackAdvantage).toBe(3);
    expect(result.blackCaptured).toEqual([{ type: 'n', count: 1 }]);
    expect(result.whiteCaptured).toEqual([]);
  });

  it('groups multiple captured pieces of same type with correct counts', () => {
    // Black lost 3 pawns and 1 knight: 'rnbqkb1r' has 1 knight (lost 1), 'pp2p1pp' has 5 pawns (lost 3)
    const fen = 'rnbqkb1r/pp2p1pp/8/8/8/8/PPPPPP1P/RNBQK1NR w KQkq - 0 5';
    const result = calculateMaterial(fen);

    // Black lost 3 pawns and 1 knight
    expect(result.whiteCaptured).toEqual([
      { type: 'p', count: 3 },
      { type: 'n', count: 1 },
    ]);
    // White lost 1 pawn (7 pawns left) and 1 bishop (1 bishop left)
    expect(result.blackCaptured).toEqual([
      { type: 'p', count: 1 },
      { type: 'b', count: 1 },
    ]);

    // White points: 7*1 + 2*3 + 1*3 + 2*5 + 9 = 35
    // Black points: 5*1 + 1*3 + 2*3 + 2*5 + 9 = 33
    // Advantage = 35 - 33 = +2
    expect(result.whiteAdvantage).toBe(2);
    expect(result.blackAdvantage).toBe(0);
  });

  it('handles equal material exchanges without showing advantage for either side', () => {
    // Both sides lost 1 knight
    const fen = 'r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1';
    const result = calculateMaterial(fen);

    expect(result.whiteMaterial).toBe(36);
    expect(result.blackMaterial).toBe(36);
    expect(result.advantage).toBe(0);
    expect(result.whiteAdvantage).toBe(0);
    expect(result.blackAdvantage).toBe(0);
    expect(result.whiteCaptured).toEqual([{ type: 'n', count: 1 }]);
    expect(result.blackCaptured).toEqual([{ type: 'n', count: 1 }]);
  });

  it('handles empty or malformed FEN gracefully', () => {
    const result = calculateMaterial('');
    expect(result.advantage).toBe(0);
    expect(result.whiteAdvantage).toBe(0);
    expect(result.blackAdvantage).toBe(0);
    expect(result.whiteCaptured).toEqual([
      { type: 'p', count: 8 },
      { type: 'n', count: 2 },
      { type: 'b', count: 2 },
      { type: 'r', count: 2 },
      { type: 'q', count: 1 },
    ]);
  });
});
