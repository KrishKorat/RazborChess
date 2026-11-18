import { describe, it, expect, beforeEach } from 'vitest';
import { GameManager } from './gameManager';

describe('GameManager', () => {
  let gm: GameManager;

  beforeEach(() => {
    gm = new GameManager();
  });

  it('initializes with standard starting position', () => {
    expect(gm.getFen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(gm.getMoves().length).toBe(0);
    expect(gm.getCurrentPly()).toBe(0);
    expect(gm.isCheck()).toBe(false);
  });

  it('plays legal moves and updates FEN and ply correctly', () => {
    const move1 = gm.makeMove('e2', 'e4');
    expect(move1).not.toBeNull();
    expect(move1?.san).toBe('e4');
    expect(move1?.color).toBe('w');
    expect(gm.getCurrentPly()).toBe(1);

    const move2 = gm.makeMove('e7', 'e5');
    expect(move2).not.toBeNull();
    expect(move2?.san).toBe('e5');
    expect(move2?.color).toBe('b');
    expect(gm.getCurrentPly()).toBe(2);
  });

  it('rejects illegal moves', () => {
    const illegalMove = gm.makeMove('e2', 'e5'); // pawn cannot jump 3 squares
    expect(illegalMove).toBeNull();
    expect(gm.getCurrentPly()).toBe(0);
  });

  it('executes castling correctly (kingside & queenside)', () => {
    // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O
    gm.makeMove('e2', 'e4');
    gm.makeMove('e7', 'e5');
    gm.makeMove('g1', 'f3');
    gm.makeMove('b8', 'c6');
    gm.makeMove('f1', 'c4');
    gm.makeMove('f8', 'c5');

    const castling = gm.makeMove('e1', 'g1');
    expect(castling).not.toBeNull();
    expect(castling?.san).toBe('O-O');
  });

  it('executes en passant capture correctly', () => {
    // 1. e4 a6 2. e5 d5 3. exd6 (en passant)
    gm.makeMove('e2', 'e4');
    gm.makeMove('a7', 'a6');
    gm.makeMove('e4', 'e5');
    gm.makeMove('d7', 'd5');

    const epMove = gm.makeMove('e5', 'd6');
    expect(epMove).not.toBeNull();
    expect(epMove?.captured).toBe('p');
    expect(epMove?.san).toBe('exd6');
  });

  it('handles pawn promotion correctly', () => {
    // Custom promotion position: White pawn on e7, Black King on a8
    gm.importFen('k7/4P3/8/8/8/8/8/4K3 w - - 0 1');
    expect(gm.isPromotionMove('e7', 'e8')).toBe(true);

    const promoMove = gm.makeMove('e7', 'e8', 'q');
    expect(promoMove).not.toBeNull();
    expect(promoMove?.san).toBe('e8=Q+');
    expect(promoMove?.promotion).toBe('q');
  });

  it('detects checkmate (Scholar’s Mate)', () => {
    // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#
    gm.makeMove('e2', 'e4');
    gm.makeMove('e7', 'e5');
    gm.makeMove('d1', 'h5');
    gm.makeMove('b8', 'c6');
    gm.makeMove('f1', 'c4');
    gm.makeMove('g8', 'f6');
    const mate = gm.makeMove('h5', 'f7');

    expect(mate).not.toBeNull();
    expect(mate?.san).toBe('Qxf7#');
    expect(gm.isCheckmate()).toBe(true);
    expect(gm.isCheck()).toBe(true);
  });

  it('navigates through moves (first, prev, next, last) preserving game history', () => {
    gm.makeMove('e2', 'e4');
    gm.makeMove('e7', 'e5');
    gm.makeMove('g1', 'f3');

    expect(gm.getCurrentPly()).toBe(3);

    gm.goToFirst();
    expect(gm.getCurrentPly()).toBe(0);
    expect(gm.getFen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    gm.goToNext();
    expect(gm.getCurrentPly()).toBe(1);

    gm.goToLast();
    expect(gm.getCurrentPly()).toBe(3);

    gm.goToPrev();
    expect(gm.getCurrentPly()).toBe(2);
    expect(gm.getMoves().length).toBe(3); // History is preserved
  });

  it('imports and exports PGN accurately with headers', () => {
    const pgnSample = `[Event "World Championship"]
[Site "Reykjavik"]
[Date "1972.07.11"]
[White "Spassky, Boris V"]
[Black "Fischer, Robert J"]
[Result "0-1"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 0-1`;

    const res = gm.importPgn(pgnSample);
    expect(res.success).toBe(true);
    expect(gm.getMoves().length).toBe(6);
    expect(gm.getMetadata().white).toBe('Spassky, Boris V');
    expect(gm.getMetadata().black).toBe('Fischer, Robert J');

    const exported = gm.exportPgn();
    expect(exported).toContain('Spassky, Boris V');
    expect(exported).toContain('Fischer, Robert J');
    expect(exported).toContain('1. d4 Nf6 2. c4 e6 3. Nf3 d5');
  });

  it('returns useful error message for invalid PGN', () => {
    const res = gm.importPgn('1. e4 e5 2. INVALIDMOVE 1-0');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('returns legal destination moves for a square', () => {
    const legalE2 = gm.getLegalMovesForSquare('e2');
    expect(legalE2).toContain('e3');
    expect(legalE2).toContain('e4');
    expect(legalE2.length).toBe(2);
  });
});
