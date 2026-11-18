import { Chess } from 'chess.js';
import { GameMetadata } from '../../types/chess';
import { SavedGame } from '../../types/storage';
import { VariationTree } from '../tree/variationTree';

export interface ParsedPgnGame {
  metadata: GameMetadata;
  pgn: string;
  moveCount: number;
  startingFen: string;
  currentFen: string;
  eco?: string;
  openingName?: string;
  tree: VariationTree;
}

/**
 * Common opening signatures for auto-detection when ECO headers are missing.
 */
const COMMON_OPENINGS: Array<{ moves: string[]; eco: string; name: string }> = [
  { moves: ['e4', 'c5'], eco: 'B20', name: 'Sicilian Defense' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], eco: 'C60', name: 'Ruy Lopez' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], eco: 'C50', name: 'Italian Game' },
  { moves: ['e4', 'e5', 'Nf3', 'Nf6'], eco: 'C42', name: 'Petrov Defense' },
  { moves: ['e4', 'e6'], eco: 'C00', name: 'French Defense' },
  { moves: ['e4', 'c6'], eco: 'B10', name: 'Caro-Kann Defense' },
  { moves: ['e4', 'd5'], eco: 'B01', name: 'Scandinavian Defense' },
  { moves: ['e4', 'd6'], eco: 'B07', name: 'Pirc Defense' },
  { moves: ['d4', 'd5', 'c4'], eco: 'D06', name: "Queen's Gambit" },
  { moves: ['d4', 'Nf6', 'c4', 'g6'], eco: 'E60', name: "King's Indian Defense" },
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'], eco: 'E12', name: "Queen's Indian Defense" },
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], eco: 'E20', name: 'Nimzo-Indian Defense' },
  { moves: ['d4', 'f5'], eco: 'A80', name: 'Dutch Defense' },
  { moves: ['c4'], eco: 'A10', name: 'English Opening' },
  { moves: ['Nf3'], eco: 'A04', name: 'Réti Opening' },
  { moves: ['e4', 'e5'], eco: 'C20', name: "King's Pawn Game" },
  { moves: ['d4', 'd5'], eco: 'D00', name: "Queen's Pawn Game" },
];

export const MAX_PGN_IMPORT_BYTES = 15 * 1024 * 1024; // 15MB limit
export const MAX_GAMES_PER_IMPORT = 1000;

/**
 * Splits a raw PGN text containing one or more games into individual game PGN blocks.
 */
export function splitPgnGames(pgnText: string): string[] {
  if (pgnText.length > MAX_PGN_IMPORT_BYTES) {
    throw new Error(`PGN import exceeds size limit (${Math.round(pgnText.length / (1024 * 1024))}MB > 15MB). Please import smaller files.`);
  }

  const normalized = pgnText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const rawGames: string[] = [];
  // Split along occurrences of [Event at start of line
  const regex = /(?:^|\n)(?=\[Event\s)/g;
  const parts = normalized.split(regex);

  for (const part of parts) {
    if (rawGames.length >= MAX_GAMES_PER_IMPORT) break;
    const trimmed = part.trim();
    if (trimmed && (trimmed.includes('[') || trimmed.includes('1.'))) {
      rawGames.push(trimmed);
    }
  }

  // Fallback: if no [Event tags were found, treat entire text as single game
  if (rawGames.length === 0 && normalized) {
    rawGames.push(normalized);
  }

  return rawGames;
}

/**
 * Parses multiple PGN games from a single file or text block.
 * Tolerates individual malformed games without failing other valid games.
 */
export function parseMultiGamePgn(pgnText: string): ParsedPgnGame[] {
  const gameBlocks = splitPgnGames(pgnText);
  const parsedGames: ParsedPgnGame[] = [];

  for (const block of gameBlocks) {
    try {
      const chess = new Chess();
      chess.loadPgn(block, { strict: false });

      const header = chess.header();
      const metadata: GameMetadata = {
        white: header['White'] || 'White',
        black: header['Black'] || 'Black',
        event: header['Event'] || 'RazborChess Game',
        site: header['Site'] || undefined,
        date: header['Date'] || new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
        round: header['Round'] || undefined,
        result: header['Result'] || '*',
        whiteElo: header['WhiteElo'] || undefined,
        blackElo: header['BlackElo'] || undefined,
      };

      const tree = new VariationTree();
      tree.importPgn(block);

      const history = chess.history();
      const moveCount = Math.ceil(history.length / 2);

      // Detect opening
      let eco: string | undefined = header['ECO'] || undefined;
      let openingName: string | undefined = header['Opening'] || undefined;

      if (!eco || !openingName) {
        const detected = detectOpening(history);
        if (detected) {
          eco = eco || detected.eco;
          openingName = openingName || detected.name;
        }
      }

      parsedGames.push({
        metadata,
        pgn: block,
        moveCount,
        startingFen: tree.getRootNode().fen,
        currentFen: tree.getFen(),
        eco,
        openingName,
        tree,
      });
    } catch (err) {
      // Skip completely invalid game block
      console.warn('Skipping malformed PGN block in multi-game import:', err);
    }
  }

  return parsedGames;
}

/**
 * Converts a ParsedPgnGame into a SavedGame object ready for IndexedDB.
 */
export function parsedGameToSavedGame(
  parsed: ParsedPgnGame,
  source: 'manual' | 'imported' | 'review' = 'imported'
): SavedGame {
  const id = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const title = generateGameTitle(parsed.metadata, parsed.moveCount, parsed.openingName);

  return {
    id,
    title,
    pgn: parsed.pgn,
    startingFen: parsed.startingFen,
    currentFen: parsed.currentFen,
    treeNodes: Array.from(parsed.tree.getAllNodes().values()),
    currentNodeId: parsed.tree.getCurrentNodeId(),
    metadata: parsed.metadata,
    eco: parsed.eco,
    openingName: parsed.openingName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source,
  };
}

/**
 * Generates an informative display title for a chess game.
 */
export function generateGameTitle(
  meta: GameMetadata,
  moveCount?: number,
  openingName?: string
): string {
  const white = meta.white || 'White';
  const black = meta.black || 'Black';
  const result = meta.result && meta.result !== '*' ? ` (${meta.result})` : '';

  if (openingName) {
    return `${white} vs ${black}${result} • ${openingName}`;
  }

  if (meta.event && meta.event !== 'RazborChess Game' && meta.event !== 'Razbor Game' && meta.event !== 'BoardScope Game' && meta.event !== 'ChessLab Game' && meta.event !== '?') {
    return `${white} vs ${black}${result} • ${meta.event}`;
  }

  const movesStr = moveCount ? ` (${moveCount} moves)` : '';
  return `${white} vs ${black}${result}${movesStr}`;
}

/**
 * Matches SAN move history against common opening patterns.
 */
function detectOpening(sanMoves: string[]): { eco: string; name: string } | null {
  for (const op of COMMON_OPENINGS) {
    if (sanMoves.length >= op.moves.length) {
      const match = op.moves.every((m, idx) => sanMoves[idx] === m);
      if (match) {
        return { eco: op.eco, name: op.name };
      }
    }
  }
  return null;
}

/**
 * Exports multiple games into a single formatted multi-game PGN string.
 */
export function exportMultiGamePgn(games: SavedGame[]): string {
  return games.map((g) => g.pgn.trim()).join('\n\n\n');
}
