import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDbService } from './indexedDbService';
import { SavedGame, WorkspaceState, UserSettings, BackupData } from '../../types/storage';

describe('IndexedDbService', () => {
  let service: IndexedDbService;

  beforeEach(async () => {
    service = new IndexedDbService();
    await service.clearAllData();
  });

  it('saves and retrieves a game by ID', async () => {
    const mockGame: SavedGame = {
      id: 'game_test_1',
      title: 'Carlsen vs Nakamura',
      pgn: '1. e4 e5 2. Nf3 Nc6',
      startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      currentFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: { white: 'Carlsen', black: 'Nakamura', result: '1-0' },
      createdAt: 1000,
      updatedAt: 1000,
      source: 'manual',
    };

    const savedId = await service.saveGame(mockGame);
    expect(savedId).toBe('game_test_1');

    const retrieved = await service.getGame('game_test_1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Carlsen vs Nakamura');
    expect(retrieved?.metadata.result).toBe('1-0');
  });

  it('retrieves all games sorted by updatedAt descending', async () => {
    const game1: SavedGame = {
      id: 'game_1',
      title: 'Game One',
      pgn: '1. d4 d5',
      startingFen: 'startpos',
      currentFen: 'fen1',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: { white: 'W1', black: 'B1' },
      createdAt: 100,
      updatedAt: 100,
      source: 'manual',
    };

    const game2: SavedGame = {
      id: 'game_2',
      title: 'Game Two',
      pgn: '1. e4 c5',
      startingFen: 'startpos',
      currentFen: 'fen2',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: { white: 'W2', black: 'B2' },
      createdAt: 200,
      updatedAt: 200,
      source: 'manual',
    };

    await service.saveGame(game1);
    await service.saveGame(game2);

    const all = await service.getAllGames();
    expect(all.length).toBe(2);
    expect(all[0].id).toBe('game_2');
    expect(all[1].id).toBe('game_1');
  });

  it('deletes a game by ID', async () => {
    const mockGame: SavedGame = {
      id: 'game_delete_me',
      title: 'To Delete',
      pgn: '1. e4',
      startingFen: 'startpos',
      currentFen: 'fen',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: {},
      createdAt: 100,
      updatedAt: 100,
      source: 'manual',
    };

    await service.saveGame(mockGame);
    const before = await service.getGame('game_delete_me');
    expect(before).toBeDefined();

    const deleted = await service.deleteGame('game_delete_me');
    expect(deleted).toBe(true);

    const after = await service.getGame('game_delete_me');
    expect(after).toBeUndefined();
  });

  it('saves and restores workspace state', async () => {
    const workspace: WorkspaceState = {
      activeGameId: 'active_1',
      treeNodes: [],
      currentNodeId: 'node_5',
      initialFen: 'startpos',
      metadata: { white: 'Kasparov', black: 'Karpov' },
      isFlipped: true,
      activeTab: 'variations',
      timestamp: 5000,
    };

    await service.saveWorkspace(workspace);
    const loaded = await service.getWorkspace();
    expect(loaded).toBeDefined();
    expect(loaded?.activeGameId).toBe('active_1');
    expect(loaded?.isFlipped).toBe(true);
    expect(loaded?.metadata.white).toBe('Kasparov');
  });

  it('saves and loads user settings', async () => {
    const customSettings: UserSettings = {
      targetDepth: 20,
      multiPv: 3,
      hashSizeMb: 32,
      showArrows: false,
      maxArrows: 2,
      autoSave: true,
    };

    await service.saveSettings(customSettings);
    const loaded = await service.getSettings();
    expect(loaded.targetDepth).toBe(20);
    expect(loaded.multiPv).toBe(3);
    expect(loaded.showArrows).toBe(false);
  });

  it('exports and restores backups in merge and overwrite modes', async () => {
    const gameA: SavedGame = {
      id: 'gA',
      title: 'Game A',
      pgn: '1. e4',
      startingFen: 'startpos',
      currentFen: 'fenA',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: {},
      createdAt: 100,
      updatedAt: 100,
      source: 'manual',
    };

    await service.saveGame(gameA);
    const backup = await service.exportBackup();
    expect(backup.appName).toBe('RazborChess');
    expect(backup.games.length).toBe(1);

    // Create a new backup to restore with gameB
    const gameB: SavedGame = {
      id: 'gB',
      title: 'Game B',
      pgn: '1. d4',
      startingFen: 'startpos',
      currentFen: 'fenB',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: {},
      createdAt: 200,
      updatedAt: 200,
      source: 'manual',
    };

    const newBackup: BackupData = {
      version: 1,
      appName: 'RazborChess',
      exportDate: new Date().toISOString(),
      games: [gameB],
      settings: backup.settings,
    };

    // Test Merge Mode
    const mergeRes = await service.importBackup(newBackup, 'merge');
    expect(mergeRes.importedCount).toBe(1);
    const allAfterMerge = await service.getAllGames();
    expect(allAfterMerge.length).toBe(2);

    // Test Overwrite Mode
    const overwriteRes = await service.importBackup(newBackup, 'overwrite');
    expect(overwriteRes.importedCount).toBe(1);
    const allAfterOverwrite = await service.getAllGames();
    expect(allAfterOverwrite.length).toBe(1);
    expect(allAfterOverwrite[0].id).toBe('gB');
  });
});
