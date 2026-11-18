import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDbService, isAnalyzedGame, MAX_ANALYZED_GAMES } from './indexedDbService';
import { SavedGame } from '../../types/storage';
import { GameReviewReport, CURRENT_REVIEW_SCHEMA_VERSION } from '../../types/chess';

const mockReport: GameReviewReport = {
  schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
  whiteAccuracy: 85,
  blackAccuracy: 80,
  whiteAcpl: 25,
  blackAcpl: 35,
  whitePhaseAccuracy: { opening: 90, middlegame: 80, endgame: 85 },
  blackPhaseAccuracy: { opening: 85, middlegame: 75, endgame: 80 },
  classificationCounts: {
    white: { book: 1, forced: 0, brilliant: 0, great: 0, best: 5, excellent: 2, good: 1, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 },
    black: { book: 1, forced: 0, brilliant: 0, great: 0, best: 4, excellent: 3, good: 1, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 },
  },
  estimatedElo: {
    white: { min: 1400, max: 1600, estimate: 1500, confidence: 'high' },
    black: { min: 1350, max: 1550, estimate: 1450, confidence: 'high' },
  },
  moves: [],
  criticalPositions: [],
};

describe('Razbor: Limit Saved Analyzed Games to 10', () => {
  let service: IndexedDbService;

  beforeEach(async () => {
    service = new IndexedDbService();
    await service.clearAllData();
  });

  it('10 analyzed games remain after saving 10 games', async () => {
    for (let i = 1; i <= 10; i++) {
      const game: SavedGame = {
        id: `game_${i}`,
        title: `Analyzed Game ${i}`,
        pgn: `1. e4 e5 ${i}`,
        startingFen: 'startpos',
        currentFen: 'fen',
        treeNodes: [],
        currentNodeId: 'root',
        metadata: { white: `W${i}`, black: `B${i}` },
        createdAt: 1000 + i * 10,
        updatedAt: 1000 + i * 10,
        analyzedAt: 1000 + i * 10,
        reviewReport: { ...mockReport },
        source: 'review',
      };
      await service.saveGame(game);
    }

    const all = await service.getAllGames();
    const analyzed = all.filter(isAnalyzedGame);
    expect(analyzed.length).toBe(10);
    expect(all.length).toBe(10);
    for (let i = 1; i <= 10; i++) {
      expect(all.some((g) => g.id === `game_${i}`)).toBe(true);
    }
  });

  it('saving an 11th game removes the oldest and retains the newest 10', async () => {
    // Save 10 games
    for (let i = 1; i <= 10; i++) {
      await service.saveGame({
        id: `game_${i}`,
        title: `Analyzed Game ${i}`,
        pgn: `1. e4 e5 ${i}`,
        startingFen: 'startpos',
        currentFen: 'fen',
        treeNodes: [],
        currentNodeId: 'root',
        metadata: { white: `W${i}`, black: `B${i}` },
        createdAt: 1000 + i * 10,
        updatedAt: 1000 + i * 10,
        analyzedAt: 1000 + i * 10,
        reviewReport: { ...mockReport },
        source: 'review',
      });
    }

    // Save the 11th game with a higher timestamp
    await service.saveGame({
      id: 'game_11',
      title: 'Analyzed Game 11',
      pgn: '1. e4 e5 11',
      startingFen: 'startpos',
      currentFen: 'fen',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: { white: 'W11', black: 'B11' },
      createdAt: 2000,
      updatedAt: 2000,
      analyzedAt: 2000,
      reviewReport: { ...mockReport },
      source: 'review',
    });

    const all = await service.getAllGames();
    expect(all.length).toBe(10);
    // Oldest game (game_1 with timestamp 1010) must be deleted from IndexedDB
    expect(all.find((g) => g.id === 'game_1')).toBeUndefined();
    const directGet = await service.getGame('game_1');
    expect(directGet).toBeUndefined();

    // Newest 10 games (game_2 through game_11) must be retained
    for (let i = 2; i <= 11; i++) {
      expect(all.some((g) => g.id === `game_${i}`)).toBe(true);
    }
  });

  it('reanalyzing an existing game does not create a duplicate', async () => {
    // Save 10 games
    for (let i = 1; i <= 10; i++) {
      await service.saveGame({
        id: `game_${i}`,
        title: `Analyzed Game ${i}`,
        pgn: `1. e4 e5 ${i}`,
        startingFen: 'startpos',
        currentFen: 'fen',
        treeNodes: [],
        currentNodeId: 'root',
        metadata: { white: `W${i}`, black: `B${i}` },
        createdAt: 1000 + i * 10,
        updatedAt: 1000 + i * 10,
        analyzedAt: 1000 + i * 10,
        reviewReport: { ...mockReport, whiteAccuracy: 70 },
        source: 'review',
      });
    }

    // Reanalyze the oldest game (game_1), giving it a new reviewReport and recent timestamp
    const reanalyzedGame: SavedGame = {
      id: 'game_1',
      title: 'Analyzed Game 1 (Reanalyzed)',
      pgn: '1. e4 e5 1',
      startingFen: 'startpos',
      currentFen: 'fen',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: { white: 'W1', black: 'B1' },
      createdAt: 1010,
      updatedAt: 3000,
      analyzedAt: 3000,
      reviewReport: { ...mockReport, whiteAccuracy: 98 },
      source: 'review',
    };

    await service.saveGame(reanalyzedGame);

    const all = await service.getAllGames();
    // Must NOT create a duplicate: still 10 games
    expect(all.length).toBe(MAX_ANALYZED_GAMES);
    const updatedGame1 = await service.getGame('game_1');
    expect(updatedGame1).toBeDefined();
    expect(updatedGame1?.title).toBe('Analyzed Game 1 (Reanalyzed)');
    expect(updatedGame1?.reviewReport?.whiteAccuracy).toBe(98);
    expect(updatedGame1?.analyzedAt).toBe(3000);

    // Saving an 11th game now should delete game_2 (now the oldest), NOT game_1!
    await service.saveGame({
      id: 'game_new',
      title: 'New Game',
      pgn: '1. d4 d5',
      startingFen: 'startpos',
      currentFen: 'fen',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: {},
      createdAt: 4000,
      updatedAt: 4000,
      analyzedAt: 4000,
      reviewReport: { ...mockReport },
      source: 'review',
    });

    const allAfterNew = await service.getAllGames();
    expect(allAfterNew.length).toBe(10);
    // game_1 was recently reanalyzed with timestamp 3000, so it is retained
    expect(allAfterNew.some((g) => g.id === 'game_1')).toBe(true);
    // game_2 was the oldest remaining (timestamp 1020), so it is deleted
    expect(allAfterNew.some((g) => g.id === 'game_2')).toBe(false);
  });

  it('existing libraries containing more than 10 analyzed games are trimmed correctly', async () => {
    const db = await service.getDb();
    // Directly insert 15 analyzed games into IndexedDB (simulating existing database before limit)
    const tx = db.transaction('games', 'readwrite');
    for (let i = 1; i <= 15; i++) {
      const game: SavedGame = {
        id: `legacy_game_${i}`,
        title: `Legacy Game ${i}`,
        pgn: `1. e4 e5 ${i}`,
        startingFen: 'startpos',
        currentFen: 'fen',
        treeNodes: [],
        currentNodeId: 'root',
        metadata: { white: `W${i}`, black: `B${i}` },
        createdAt: 1000 + i * 10,
        updatedAt: 1000 + i * 10,
        analyzedAt: 1000 + i * 10,
        reviewReport: { ...mockReport },
        source: 'review',
      };
      await tx.store.put(game);
    }
    await tx.done;

    // Verify before trimming there are 15 games
    const directAllBefore = await db.getAll('games');
    expect(directAllBefore.length).toBe(15);

    // Calling enforceAnalyzedGamesLimit trims the 5 oldest games
    const deletedIds = await service.enforceAnalyzedGamesLimit(10);
    expect(deletedIds.length).toBe(5);
    expect([...deletedIds].sort()).toEqual(['legacy_game_1', 'legacy_game_2', 'legacy_game_3', 'legacy_game_4', 'legacy_game_5']);

    // Verify in persistence: exactly 10 newest remain
    const directAllAfter = await db.getAll('games');
    expect(directAllAfter.length).toBe(10);
    for (let i = 6; i <= 15; i++) {
      expect(directAllAfter.some((g) => g.id === `legacy_game_${i}`)).toBe(true);
    }

    // getAllGames also returns the 10 games
    const all = await service.getAllGames();
    expect(all.length).toBe(10);
  });

  it('other stored application data remains untouched', async () => {
    // 1. Save user settings
    await service.saveSettings({
      targetDepth: 22,
      multiPv: 3,
      hashSizeMb: 64,
      showArrows: true,
      maxArrows: 2,
      autoSave: true,
    });

    // 2. Save workspace state
    await service.saveWorkspace({
      activeGameId: 'active_session',
      treeNodes: [],
      currentNodeId: 'root',
      initialFen: 'startpos',
      metadata: { white: 'Me', black: 'Friend' },
      isFlipped: true,
      activeTab: 'review',
      timestamp: 9999,
    });

    // 3. Save 4 unanalyzed games (no reviewReport)
    for (let u = 1; u <= 4; u++) {
      await service.saveGame({
        id: `unanalyzed_${u}`,
        title: `Unanalyzed Game ${u}`,
        pgn: `1. c4 c5 ${u}`,
        startingFen: 'startpos',
        currentFen: 'fen',
        treeNodes: [],
        currentNodeId: 'root',
        metadata: {},
        createdAt: 500 + u * 10,
        updatedAt: 500 + u * 10,
        source: 'imported',
      });
    }

    // 4. Directly put 14 analyzed games into IndexedDB
    const db = await service.getDb();
    const tx = db.transaction('games', 'readwrite');
    for (let a = 1; a <= 14; a++) {
      await tx.store.put({
        id: `analyzed_${a}`,
        title: `Analyzed Game ${a}`,
        pgn: `1. d4 d5 ${a}`,
        startingFen: 'startpos',
        currentFen: 'fen',
        treeNodes: [],
        currentNodeId: 'root',
        metadata: {},
        createdAt: 1000 + a * 10,
        updatedAt: 1000 + a * 10,
        analyzedAt: 1000 + a * 10,
        reviewReport: { ...mockReport },
        source: 'review',
      });
    }
    await tx.done;

    // Enforce limit
    await service.enforceAnalyzedGamesLimit(10);

    // Verify:
    // - Exactly 10 analyzed games remain
    const allGames = await db.getAll('games');
    const analyzedGames = allGames.filter(isAnalyzedGame);
    const unanalyzedGames = allGames.filter((g) => !isAnalyzedGame(g));

    expect(analyzedGames.length).toBe(10);
    // Oldest 4 analyzed games (1, 2, 3, 4) deleted, 5-14 kept
    for (let a = 5; a <= 14; a++) {
      expect(analyzedGames.some((g) => g.id === `analyzed_${a}`)).toBe(true);
    }

    // - All 4 unanalyzed games must remain untouched
    expect(unanalyzedGames.length).toBe(4);
    for (let u = 1; u <= 4; u++) {
      expect(unanalyzedGames.some((g) => g.id === `unanalyzed_${u}`)).toBe(true);
    }

    // - User settings remain untouched
    const settings = await service.getSettings();
    expect(settings.targetDepth).toBe(22);
    expect(settings.multiPv).toBe(3);
    expect(settings.hashSizeMb).toBe(64);

    // - Workspace state remains untouched
    const workspace = await service.getWorkspace();
    expect(workspace?.activeGameId).toBe('active_session');
    expect(workspace?.isFlipped).toBe(true);
    expect(workspace?.metadata.white).toBe('Me');
  });

  it('finds existing game by id or PGN to prevent duplicates on repeated analysis', async () => {
    const game: SavedGame = {
      id: 'game_xyz',
      title: 'Game XYZ',
      pgn: '[Event "Test"]\n[White "Kasparov"]\n[Black "Deep Blue"]\n\n1. e4 e5 2. Nf3 Nc6 1-0',
      startingFen: 'startpos',
      currentFen: 'fen',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: { white: 'Kasparov', black: 'Deep Blue' },
      createdAt: 1000,
      updatedAt: 1000,
      source: 'manual',
    };
    await service.saveGame(game);

    // Find by ID
    const foundById = await service.findMatchingGame({ id: 'game_xyz' });
    expect(foundById?.id).toBe('game_xyz');

    // Find by matching moves in PGN even with different header date/event
    const diffHeaderPgn = '[Event "Different Event"]\n[Date "2026.11.14"]\n\n1. e4 e5 2. Nf3 Nc6 1-0';
    const foundByPgn = await service.findMatchingGame({ pgn: diffHeaderPgn });
    expect(foundByPgn?.id).toBe('game_xyz');
  });
});
