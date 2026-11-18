import { describe, it, expect } from 'vitest';
import {
  parseUciInfoLine,
  parseBestMoveLine,
  convertScoreToPerspectives,
  scoreToWinPercentage,
  createMultiPvEvaluation,
  getActiveColorFromFen,
} from './uciParser';

describe('UCI Parser & Score Converter', () => {
  it('parses typical Stockfish 19 info line with centipawns', () => {
    const line = 'info depth 18 seldepth 25 multipv 1 score cp 42 nodes 235120 nps 480100 time 489 pv e2e4 e7e5 g1f3 b8c6';
    const parsed = parseUciInfoLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.depth).toBe(18);
    expect(parsed?.seldepth).toBe(25);
    expect(parsed?.multipv).toBe(1);
    expect(parsed?.scoreCp).toBe(42);
    expect(parsed?.scoreMate).toBeUndefined();
    expect(parsed?.nodes).toBe(235120);
    expect(parsed?.nps).toBe(480100);
    expect(parsed?.time).toBe(489);
    expect(parsed?.pv).toEqual(['e2e4', 'e7e5', 'g1f3', 'b8c6']);
  });

  it('parses mate score from UCI info line', () => {
    const line = 'info depth 14 multipv 2 score mate -3 nodes 45000 nps 300000 time 150 pv f7f8q e8f8';
    const parsed = parseUciInfoLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.depth).toBe(14);
    expect(parsed?.multipv).toBe(2);
    expect(parsed?.scoreMate).toBe(-3);
    expect(parsed?.scoreCp).toBeUndefined();
    expect(parsed?.pv).toEqual(['f7f8q', 'e8f8']);
  });

  it('ignores non-info lines or string info lines', () => {
    expect(parseUciInfoLine('id name Stockfish 19 Lite WASM')).toBeNull();
    expect(parseUciInfoLine('uciok')).toBeNull();
    expect(parseUciInfoLine('info string NNUE evaluation enabled')).toBeNull();
  });

  it('parses bestmove line with and without ponder', () => {
    const withPonder = parseBestMoveLine('bestmove e2e4 ponder e7e5');
    expect(withPonder).toEqual({ bestMove: 'e2e4', ponder: 'e7e5' });

    const withoutPonder = parseBestMoveLine('bestmove g8f6');
    expect(withoutPonder).toEqual({ bestMove: 'g8f6', ponder: undefined });

    expect(parseBestMoveLine('info depth 10')).toBeNull();
  });

  it('correctly converts side-to-move score to White-relative score for White to move', () => {
    // White to move: score +50 (White advantage)
    const { scoreCpSideToMove, scoreCpWhite } = convertScoreToPerspectives(50, undefined, 'w');
    expect(scoreCpSideToMove).toBe(50);
    expect(scoreCpWhite).toBe(50);
  });

  it('correctly inverts score for Black to move to maintain White-relative standard', () => {
    // Black to move: UCI reports +120 (means Black is +120 ahead)
    const { scoreCpSideToMove, scoreCpWhite } = convertScoreToPerspectives(120, undefined, 'b');
    expect(scoreCpSideToMove).toBe(120);
    expect(scoreCpWhite).toBe(-120); // From White's perspective, it's -120

    // Black to move: UCI reports -200 (means Black is losing, White is +200 ahead)
    const inverted = convertScoreToPerspectives(-200, undefined, 'b');
    expect(inverted.scoreCpWhite).toBe(200);
  });

  it('correctly inverts mate scores for Black to move', () => {
    // Black to move: UCI says "mate 2" (Black delivers mate in 2)
    const { mateSideToMove, mateWhite } = convertScoreToPerspectives(undefined, 2, 'b');
    expect(mateSideToMove).toBe(2);
    expect(mateWhite).toBe(-2); // From White's perspective, it is -2 (Black wins)

    // White to move: UCI says "mate 3" (White delivers mate in 3)
    const whiteMate = convertScoreToPerspectives(undefined, 3, 'w');
    expect(whiteMate.mateSideToMove).toBe(3);
    expect(whiteMate.mateWhite).toBe(3);
  });

  it('converts centipawns to win percentage accurately', () => {
    expect(scoreToWinPercentage(0)).toBe(50); // Equal position = 50%
    expect(scoreToWinPercentage(400)).toBeCloseTo(90.9, 1); // +4.00 is ~90.9%
    expect(scoreToWinPercentage(-400)).toBeCloseTo(9.1, 1); // -4.00 is ~9.1%
    expect(scoreToWinPercentage(0, 1)).toBe(100); // White mate in 1 = 100%
    expect(scoreToWinPercentage(0, -2)).toBe(0); // Black mate in 2 = 0%
  });

  it('extracts active player color from FEN correctly', () => {
    expect(getActiveColorFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')).toBe('b');
    expect(getActiveColorFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe('w');
  });

  it('creates MultiPvEvaluation structure correctly', () => {
    const info = parseUciInfoLine('info depth 15 multipv 2 score cp 30 pv d2d4 d7d5')!;
    const multiPv = createMultiPvEvaluation(info, 'w');

    expect(multiPv).not.toBeNull();
    expect(multiPv?.id).toBe(2);
    expect(multiPv?.depth).toBe(15);
    expect(multiPv?.score).toBe(30);
    expect(multiPv?.bestMove).toBe('d2d4');
    expect(multiPv?.pv).toEqual(['d2d4', 'd7d5']);
  });
});
