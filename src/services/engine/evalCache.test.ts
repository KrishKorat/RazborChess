import { describe, it, expect, beforeEach } from 'vitest';
import { EvalCache, normalizeFen, convertUciPvToSan } from './evalCache';
import { MoveEvaluation } from '../../types/chess';

describe('EvalCache & UCI-to-SAN Converter', () => {
  let cache: EvalCache;

  beforeEach(() => {
    cache = new EvalCache(3); // Small size to test LRU eviction
  });

  const dummyEval: MoveEvaluation = {
    depth: 16,
    score: 35,
    pv: ['e2e4', 'e7e5'],
    bestMove: 'e2e4',
  };

  it('normalizes FEN by omitting move counters', () => {
    const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const fen2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 14 30';

    expect(normalizeFen(fen1)).toBe(normalizeFen(fen2));
    expect(normalizeFen(fen1)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3');
  });

  it('stores and retrieves evaluations by FEN', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    cache.set(fen, dummyEval, []);

    expect(cache.has(fen)).toBe(true);
    const retrieved = cache.get(fen);
    expect(retrieved).toBeDefined();
    expect(retrieved?.evaluation.score).toBe(35);
    expect(retrieved?.evaluation.bestMove).toBe('e2e4');
  });

  it('evicts oldest entries when exceeding maxEntries (LRU)', () => {
    const fenA = 'k7/8/8/8/8/8/8/4K3 w - - 0 1';
    const fenB = 'k7/8/8/8/8/8/8/5K2 w - - 0 1';
    const fenC = 'k7/8/8/8/8/8/8/6K1 w - - 0 1';
    const fenD = 'k7/8/8/8/8/8/8/7K w - - 0 1';

    cache.set(fenA, dummyEval);
    cache.set(fenB, dummyEval);
    cache.set(fenC, dummyEval);

    expect(cache.size()).toBe(3);
    expect(cache.has(fenA)).toBe(true);

    // Adding 4th entry evicts oldest (fenA)
    cache.set(fenD, dummyEval);
    expect(cache.size()).toBe(3);
    expect(cache.has(fenA)).toBe(false);
    expect(cache.has(fenB)).toBe(true);
    expect(cache.has(fenC)).toBe(true);
    expect(cache.has(fenD)).toBe(true);
  });

  it('converts UCI principal variations to SAN accurately', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const uciPv = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'];

    const sanPv = convertUciPvToSan(startFen, uciPv);
    expect(sanPv).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
  });

  it('handles invalid or empty UCI moves gracefully without crashing', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(convertUciPvToSan(startFen, [])).toEqual([]);
    expect(convertUciPvToSan(startFen, ['invalidMove'])).toEqual([]);
  });
});
