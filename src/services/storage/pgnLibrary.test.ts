import { describe, it, expect } from 'vitest';
import { 
  splitPgnGames, 
  parseMultiGamePgn, 
  parsedGameToSavedGame, 
  exportMultiGamePgn, 
  generateGameTitle 
} from './pgnLibrary';

const MULTI_PGN_SAMPLE = `
[Event "FIDE World Cup 2023"]
[Site "Baku AZE"]
[Date "2023.08.24"]
[Round "8.3"]
[White "Carlsen, Magnus"]
[Black "Praggnanandhaa, R"]
[Result "1-0"]
[ECO "B20"]
[Opening "Sicilian Defense"]

1. e4 c5 2. Nf3 d6 3. Bb5+ Bd7 4. Bxd7+ Qxd7 1-0

[Event "Candidates Tournament 2024"]
[Site "Toronto CAN"]
[Date "2024.04.14"]
[Round "10"]
[White "Nakamura, Hikaru"]
[Black "Gukesh, D"]
[Result "1/2-1/2"]
[ECO "C50"]
[Opening "Italian Game"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 1/2-1/2
`;

describe('pgnLibrary', () => {
  describe('splitPgnGames', () => {
    it('splits a multi-game PGN string into individual game blocks', () => {
      const blocks = splitPgnGames(MULTI_PGN_SAMPLE);
      expect(blocks.length).toBe(2);
      expect(blocks[0]).toContain('Carlsen, Magnus');
      expect(blocks[1]).toContain('Nakamura, Hikaru');
    });

    it('returns empty array for empty string', () => {
      expect(splitPgnGames('')).toEqual([]);
      expect(splitPgnGames('   \n\n  ')).toEqual([]);
    });

    it('returns single element if text does not contain multiple [Event tags', () => {
      const single = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *';
      const blocks = splitPgnGames(single);
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toBe(single);
    });
  });

  describe('parseMultiGamePgn', () => {
    it('parses multi-game PGN into structured game objects with metadata and variation trees', () => {
      const parsed = parseMultiGamePgn(MULTI_PGN_SAMPLE);
      expect(parsed.length).toBe(2);

      const g1 = parsed[0];
      expect(g1.metadata.white).toBe('Carlsen, Magnus');
      expect(g1.metadata.black).toBe('Praggnanandhaa, R');
      expect(g1.metadata.result).toBe('1-0');
      expect(g1.eco).toBe('B20');
      expect(g1.openingName).toBe('Sicilian Defense');
      expect(g1.moveCount).toBeGreaterThan(0);
      expect(g1.tree.getAllNodes().size).toBeGreaterThan(1);

      const g2 = parsed[1];
      expect(g2.metadata.white).toBe('Nakamura, Hikaru');
      expect(g2.metadata.black).toBe('Gukesh, D');
      expect(g2.metadata.result).toBe('1/2-1/2');
    });

    it('auto-detects opening when opening headers are omitted', () => {
      const pgnWithoutOpeningHeader = `
[Event "Casual Match"]
[White "Player1"]
[Black "Player2"]
[Result "*"]

1. e4 c5 2. Nf3 *
`;
      const parsed = parseMultiGamePgn(pgnWithoutOpeningHeader);
      expect(parsed.length).toBe(1);
      expect(parsed[0].eco).toBe('B20');
      expect(parsed[0].openingName).toBe('Sicilian Defense');
    });
  });

  describe('parsedGameToSavedGame', () => {
    it('converts a ParsedPgnGame into a SavedGame with unique ID and title', () => {
      const parsed = parseMultiGamePgn(MULTI_PGN_SAMPLE)[0];
      const saved = parsedGameToSavedGame(parsed, 'imported');

      expect(saved.id).toMatch(/^game_/);
      expect(saved.title).toContain('Carlsen, Magnus vs Praggnanandhaa, R');
      expect(saved.source).toBe('imported');
      expect(saved.treeNodes.length).toBeGreaterThan(0);
      expect(saved.createdAt).toBeGreaterThan(0);
    });
  });

  describe('generateGameTitle', () => {
    it('generates title with opening if available', () => {
      const title = generateGameTitle({ white: 'Kasparov', black: 'Karpov', result: '1-0' }, 40, "Queen's Gambit");
      expect(title).toBe("Kasparov vs Karpov (1-0) • Queen's Gambit");
    });

    it('generates title with move count if opening is missing', () => {
      const title = generateGameTitle({ white: 'Alice', black: 'Bob', result: '*' }, 25);
      expect(title).toBe('Alice vs Bob (25 moves)');
    });
  });

  describe('exportMultiGamePgn', () => {
    it('joins multiple games into a formatted PGN string', () => {
      const parsed = parseMultiGamePgn(MULTI_PGN_SAMPLE);
      const savedGames = parsed.map((p) => parsedGameToSavedGame(p));

      const exported = exportMultiGamePgn(savedGames);
      expect(exported).toContain('Carlsen, Magnus');
      expect(exported).toContain('Nakamura, Hikaru');
      expect(exported).toContain('1-0');
      expect(exported).toContain('1/2-1/2');
    });
  });
});
