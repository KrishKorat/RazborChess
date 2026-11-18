import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SavedGame, WorkspaceState, UserSettings, BackupData } from '../../types/storage';

export const DB_NAME = 'chesslab_db';
export const DB_VERSION = 1;
export const MAX_ANALYZED_GAMES = 10;

let lastMonotonicTime = 0;
export function getMonotonicTimestamp(): number {
  const now = Date.now();
  if (now <= lastMonotonicTime) {
    lastMonotonicTime += 1;
    return lastMonotonicTime;
  }
  lastMonotonicTime = now;
  return now;
}

export function isAnalyzedGame(game: SavedGame): boolean {
  return Boolean(game.reviewReport);
}

export function getAnalyzedGameTimestamp(game: SavedGame): number {
  return Math.max(game.analyzedAt || 0, game.updatedAt || 0, game.createdAt || 0);
}

export interface ChessLabDB extends DBSchema {
  games: {
    key: string;
    value: SavedGame;
    indexes: {
      'by-updated': number;
      'by-created': number;
      'by-result': string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
  workspace: {
    key: string;
    value: WorkspaceState;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  targetDepth: 16,
  multiPv: 1,
  hashSizeMb: 16,
  showArrows: true,
  maxArrows: 1,
  autoSave: true,
};

export class IndexedDbService {
  private dbPromise: Promise<IDBPDatabase<ChessLabDB>> | null = null;

  public async getDb(): Promise<IDBPDatabase<ChessLabDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<ChessLabDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, _newVersion, _transaction) {
          // Version 1 setup
          if (oldVersion < 1) {
            const gameStore = db.createObjectStore('games', { keyPath: 'id' });
            gameStore.createIndex('by-updated', 'updatedAt');
            gameStore.createIndex('by-created', 'createdAt');
            gameStore.createIndex('by-result', 'metadata.result');

            db.createObjectStore('settings');
            db.createObjectStore('workspace');
          }
          // Future migrations can be placed here with if (oldVersion < 2) etc.
        },
        blocked() {
          console.warn('ChessLab IndexedDB upgrade blocked by open tabs.');
        },
        blocking() {
          console.warn('ChessLab IndexedDB blocking an upgrade in another tab.');
        },
        terminated() {
          console.error('ChessLab IndexedDB connection terminated unexpectedly.');
        },
      });
    }
    return this.dbPromise;
  }

  // --- Game CRUD Operations ---

  public async saveGame(game: SavedGame): Promise<string> {
    try {
      const db = await this.getDb();
      const now = getMonotonicTimestamp();
      const toSave: SavedGame = {
        ...game,
        updatedAt: game.updatedAt ?? now,
      };

      if (isAnalyzedGame(toSave)) {
        if (!toSave.analyzedAt) {
          toSave.analyzedAt = toSave.updatedAt;
        }
      }

      await db.put('games', toSave);

      if (isAnalyzedGame(toSave)) {
        await this.enforceAnalyzedGamesLimit(MAX_ANALYZED_GAMES);
      }

      return toSave.id;
    } catch (err) {
      console.error('Failed to save game to IndexedDB:', err);
      throw err;
    }
  }

  public async getGame(id: string): Promise<SavedGame | undefined> {
    try {
      const db = await this.getDb();
      return await db.get('games', id);
    } catch (err) {
      console.error(`Failed to get game ${id} from IndexedDB:`, err);
      return undefined;
    }
  }

  public async getAllGames(): Promise<SavedGame[]> {
    try {
      const db = await this.getDb();
      // Ensure limit is strictly enforced on existing library data in IndexedDB
      await this.enforceAnalyzedGamesLimit(MAX_ANALYZED_GAMES);
      const games = await db.getAllFromIndex('games', 'by-updated');
      // Return sorted descending by updatedAt
      return games.reverse();
    } catch (err) {
      console.error('Failed to get all games from IndexedDB:', err);
      return [];
    }
  }

  public async deleteGame(id: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      await db.delete('games', id);
      return true;
    } catch (err) {
      console.error(`Failed to delete game ${id} from IndexedDB:`, err);
      return false;
    }
  }

  /**
   * Enforces a maximum limit of analyzed games stored in IndexedDB.
   * Analyzed games are identified by having a valid `reviewReport`.
   * Games are sorted by their analysis/save timestamp, newest first.
   * If there are more than `maxAnalyzedGames` (default 10), the oldest analyzed games are permanently deleted.
   * Unanalyzed games and unrelated application data are left untouched.
   * Returns the IDs of any games that were deleted.
   */
  public async enforceAnalyzedGamesLimit(maxAnalyzedGames: number = MAX_ANALYZED_GAMES): Promise<string[]> {
    try {
      const db = await this.getDb();
      const allGames = await db.getAll('games');

      const analyzedGames = allGames.filter(isAnalyzedGame);
      if (analyzedGames.length <= maxAnalyzedGames) {
        return [];
      }

      // Sort analyzed games newest first based on analysis/save timestamp
      analyzedGames.sort((a, b) => {
        const timeDiff = getAnalyzedGameTimestamp(b) - getAnalyzedGameTimestamp(a);
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });

      // Keep the newest maxAnalyzedGames; delete the oldest
      const gamesToDelete = analyzedGames.slice(maxAnalyzedGames);
      const deletedIds: string[] = [];

      const tx = db.transaction('games', 'readwrite');
      for (const game of gamesToDelete) {
        await tx.store.delete(game.id);
        deletedIds.push(game.id);
      }
      await tx.done;

      return deletedIds;
    } catch (err) {
      console.error('Failed to enforce analyzed games limit in IndexedDB:', err);
      return [];
    }
  }

  /**
   * Finds an existing game matching either the given ID or the move sequence from the PGN.
   * Used to prevent duplicate library entries when a game is analyzed again.
   */
  public async findMatchingGame(query: { id?: string | null; pgn?: string }): Promise<SavedGame | undefined> {
    try {
      const db = await this.getDb();
      if (query.id) {
        const byId = await db.get('games', query.id);
        if (byId) return byId;
      }
      if (query.pgn && query.pgn.trim()) {
        const allGames = await db.getAll('games');
        const targetNormalized = this.normalizePgnMovesOnly(query.pgn);
        if (targetNormalized) {
          const matched = allGames.find((g) => {
            if (!g.pgn) return false;
            return this.normalizePgnMovesOnly(g.pgn) === targetNormalized;
          });
          if (matched) return matched;
        }
      }
      return undefined;
    } catch (err) {
      console.error('Failed to find matching game:', err);
      return undefined;
    }
  }

  private normalizePgnMovesOnly(pgn: string): string {
    const body = pgn.replace(/\[[^\]]*\]/g, ' ');
    const noComments = body.replace(/\{[^}]*\}/g, ' ');
    const noRav = noComments.replace(/\([^)]*\)/g, ' ');
    return noRav.replace(/\s+/g, ' ').trim();
  }

  // --- Workspace Persistence ---

  public async saveWorkspace(state: WorkspaceState): Promise<void> {
    try {
      const db = await this.getDb();
      await db.put('workspace', { ...state, timestamp: Date.now() }, 'current' as any);
    } catch (err) {
      console.error('Failed to save workspace state to IndexedDB:', err);
    }
  }

  public async getWorkspace(): Promise<WorkspaceState | undefined> {
    try {
      const db = await this.getDb();
      return await db.get('workspace', 'current' as any);
    } catch (err) {
      console.error('Failed to load workspace state from IndexedDB:', err);
      return undefined;
    }
  }

  // --- Settings Persistence ---

  public async saveSettings(settings: UserSettings): Promise<void> {
    try {
      const db = await this.getDb();
      await db.put('settings', settings, 'user_settings' as any);
    } catch (err) {
      console.error('Failed to save user settings to IndexedDB:', err);
    }
  }

  public async getSettings(): Promise<UserSettings> {
    try {
      const db = await this.getDb();
      const settings = await db.get('settings', 'user_settings' as any);
      return { ...DEFAULT_SETTINGS, ...(settings || {}) };
    } catch (err) {
      console.error('Failed to load settings from IndexedDB, using defaults:', err);
      return DEFAULT_SETTINGS;
    }
  }

  // --- Backup & Restore ---

  public async exportBackup(): Promise<BackupData> {
    const games = await this.getAllGames();
    const settings = await this.getSettings();
    const workspace = await this.getWorkspace();

    return {
      version: 1,
      appName: 'RazborChess',
      exportDate: new Date().toISOString(),
      games,
      settings,
      workspace,
    };
  }

  public async importBackup(
    backup: BackupData,
    mode: 'overwrite' | 'merge' = 'merge'
  ): Promise<{ importedCount: number; skippedCount: number }> {
    if (!backup || typeof backup !== 'object' || (backup.appName !== 'RazborChess' && backup.appName !== 'Razbor' && backup.appName !== 'BoardScope' && backup.appName !== 'ChessLab') || !Array.isArray(backup.games)) {
      throw new Error('Invalid RazborChess backup format: missing RazborChess/Razbor/BoardScope/ChessLab appName or games array.');
    }

    if (typeof backup.version !== 'number' || backup.version > 10 || backup.version < 1) {
      throw new Error(`Incompatible backup version (${(backup as any).version || 'unknown'}). This application supports version 1.`);
    }

    if (backup.games.length > 5000) {
      throw new Error(`Backup archive contains too many games (${backup.games.length} > 5,000 maximum).`);
    }

    const sanitizeGame = (g: any): SavedGame | null => {
      if (!g || typeof g !== 'object' || typeof g.id !== 'string' || !g.id.trim()) {
        return null;
      }
      return {
        id: String(g.id).replace(/[^a-zA-Z0-9_-]/g, ''),
        title: String(g.title || 'Untitled Game').slice(0, 150),
        pgn: String(g.pgn || ''),
        startingFen: String(g.startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
        currentFen: String(g.currentFen || g.startingFen || ''),
        treeNodes: Array.isArray(g.treeNodes) ? g.treeNodes : [],
        currentNodeId: String(g.currentNodeId || 'root'),
        metadata: typeof g.metadata === 'object' && g.metadata !== null ? g.metadata : {},
        eco: typeof g.eco === 'string' ? g.eco.slice(0, 10) : undefined,
        openingName: typeof g.openingName === 'string' ? g.openingName.slice(0, 100) : undefined,
        reviewReport: typeof g.reviewReport === 'object' && g.reviewReport !== null ? g.reviewReport : undefined,
        createdAt: typeof g.createdAt === 'number' ? g.createdAt : Date.now(),
        updatedAt: typeof g.updatedAt === 'number' ? g.updatedAt : Date.now(),
        analyzedAt: typeof g.analyzedAt === 'number' ? g.analyzedAt : (g.reviewReport ? g.updatedAt || Date.now() : undefined),
        source: g.source === 'imported' || g.source === 'review' ? g.source : 'manual',
      };
    };

    try {
      const db = await this.getDb();
      let importedCount = 0;
      let skippedCount = 0;

      const tx = db.transaction(['games', 'settings'], 'readwrite');
      const gameStore = tx.objectStore('games');
      const settingsStore = tx.objectStore('settings');

      if (mode === 'overwrite') {
        await gameStore.clear();
        if (backup.settings) {
          await settingsStore.put(backup.settings, 'user_settings' as any);
        }
        for (const rawGame of backup.games) {
          const game = sanitizeGame(rawGame);
          if (game) {
            await gameStore.put(game);
            importedCount++;
          }
        }
      } else {
        // Merge: keep existing games, add or update new ones
        for (const rawGame of backup.games) {
          const game = sanitizeGame(rawGame);
          if (!game) continue;
          const existing = await gameStore.get(game.id);
          if (existing) {
            if (existing.updatedAt >= (game.updatedAt || 0)) {
              skippedCount++;
              continue;
            }
          }
          await gameStore.put(game);
          importedCount++;
        }
      }

      await tx.done;
      await this.enforceAnalyzedGamesLimit(MAX_ANALYZED_GAMES);
      return { importedCount, skippedCount };
    } catch (err: any) {
      if (err.name === 'QuotaExceededError') {
        throw new Error('Browser storage quota exceeded. Please free up disk space or reduce backup size.');
      }
      throw err;
    }
  }

  public async clearAllData(): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['games', 'settings', 'workspace'], 'readwrite');
    await tx.objectStore('games').clear();
    await tx.objectStore('settings').clear();
    await tx.objectStore('workspace').clear();
    await tx.done;
  }

  /**
   * Estimates browser storage usage if supported by the browser.
   */
  public async getStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number; percentage: number }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 0;
        const percentage = quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 1000) / 10 : 0;
        return { usedBytes, quotaBytes, percentage };
      } catch (e) {
        // Fallback
      }
    }
    return { usedBytes: 0, quotaBytes: 0, percentage: 0 };
  }
}

let globalStorageInstance: IndexedDbService | null = null;

export function getIndexedDbService(): IndexedDbService {
  if (!globalStorageInstance) {
    globalStorageInstance = new IndexedDbService();
  }
  return globalStorageInstance;
}
