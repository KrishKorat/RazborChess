/**
 * Opening Recognition Engine for BoardScope
 * 
 * Provides fast, offline, progressive chess opening identification based on ECO database.
 * Supports exact move sequence matching, transposition detection via normalized FEN,
 * and deepest-prefix book line resolution.
 */

import { Chess } from 'chess.js';
import { ECO_OPENINGS } from './ecoDatabase';

export interface OpeningInfo {
  eco?: string;
  name: string;
  variation?: string;
  fullName: string;
  movesCount: number;
}

export interface OpeningEntry extends OpeningInfo {
  sanMoves: string[];
  uciMoves: string[];
  normalizedFen: string;
}

/**
 * Normalizes a FEN string by extracting piece placement, active side,
 * castling rights, and en passant target. Drops halfmove and fullmove counts.
 */
export function normalizeFen(fen: string): string {
  if (!fen) return '';
  const parts = fen.trim().split(/\s+/);
  if (parts.length >= 4) {
    return parts.slice(0, 4).join(' ');
  }
  return fen.trim();
}

// In-memory index structures
const fenMap = new Map<string, OpeningEntry>();
const sanLineMap = new Map<string, OpeningEntry>();
const uciLineMap = new Map<string, OpeningEntry>();

let databaseInitialized = false;

export function initializeOpeningDatabase(): void {
  if (databaseInitialized) return;

  for (const record of ECO_OPENINGS) {
    const rawMoves = record.moves.trim().split(/\s+/).filter(Boolean);
    if (rawMoves.length === 0) continue;

    const chess = new Chess();
    const sanMoves: string[] = [];
    const uciMoves: string[] = [];
    let valid = true;

    for (const m of rawMoves) {
      try {
        const res = chess.move(m);
        if (!res) {
          valid = false;
          break;
        }
        sanMoves.push(res.san);
        uciMoves.push(res.from + res.to + (res.promotion || ''));
      } catch {
        valid = false;
        break;
      }
    }

    if (!valid) continue;

    const normFen = normalizeFen(chess.fen());
    const fullName = record.variation ? `${record.name}: ${record.variation}` : record.name;

    const entry: OpeningEntry = {
      eco: record.eco,
      name: record.name,
      variation: record.variation,
      fullName,
      movesCount: sanMoves.length,
      sanMoves,
      uciMoves,
      normalizedFen: normFen,
    };

    // Store in SAN sequence map
    const sanKey = sanMoves.join(' ');
    sanLineMap.set(sanKey, entry);

    // Store in UCI sequence map
    const uciKey = uciMoves.join(' ');
    uciLineMap.set(uciKey, entry);

    // Store in FEN map: if already present, prefer more specific entry (has variation or longer)
    const existing = fenMap.get(normFen);
    if (!existing || (entry.variation && !existing.variation) || entry.movesCount > existing.movesCount) {
      fenMap.set(normFen, entry);
    }
  }

  databaseInitialized = true;
}

// Eager initialization on import
initializeOpeningDatabase();

/**
 * Identifies the opening for a given move path (array of nodes or objects with fen/san/uci).
 * Searches from the current (deepest) position backwards to root, returning the deepest
 * matched book opening.
 */
export function identifyOpeningFromPath(
  path: Array<{ fen: string; san?: string; uci?: string; id?: string }>
): OpeningInfo {
  initializeOpeningDatabase();

  // Filter out root node (empty move)
  const moves = path.filter((n) => n.id !== 'root' && (n.san || n.uci || n.fen));

  if (moves.length === 0) {
    return {
      name: 'Starting Position',
      fullName: 'Starting Position',
      movesCount: 0,
    };
  }

  // 1. Try deepest FEN match backwards (handles moves and transpositions)
  for (let i = moves.length - 1; i >= 0; i--) {
    const fen = moves[i].fen;
    if (fen) {
      const norm = normalizeFen(fen);
      const match = fenMap.get(norm);
      if (match) {
        return {
          eco: match.eco,
          name: match.name,
          variation: match.variation,
          fullName: match.fullName,
          movesCount: match.movesCount,
        };
      }
    }
  }

  // 2. Try SAN line prefix backwards
  const sanList = moves.map((m) => m.san).filter((s): s is string => Boolean(s));
  for (let len = sanList.length; len > 0; len--) {
    const prefix = sanList.slice(0, len).join(' ');
    const match = sanLineMap.get(prefix);
    if (match) {
      return {
        eco: match.eco,
        name: match.name,
        variation: match.variation,
        fullName: match.fullName,
        movesCount: match.movesCount,
      };
    }
  }

  // 3. Try UCI line prefix backwards
  const uciList = moves.map((m) => m.uci).filter((u): u is string => Boolean(u));
  for (let len = uciList.length; len > 0; len--) {
    const prefix = uciList.slice(0, len).join(' ');
    const match = uciLineMap.get(prefix);
    if (match) {
      return {
        eco: match.eco,
        name: match.name,
        variation: match.variation,
        fullName: match.fullName,
        movesCount: match.movesCount,
      };
    }
  }

  // If moves have been played but none match any book opening
  return {
    name: 'Unclassified Opening',
    fullName: 'Unclassified Opening',
    movesCount: 0,
  };
}

/**
 * Helper to identify opening from a sequence of SAN or UCI moves (string or array).
 */
export function identifyOpeningFromMoves(
  moves: string[] | string
): OpeningInfo {
  initializeOpeningDatabase();

  const moveList = Array.isArray(moves)
    ? moves
    : moves.trim().split(/\s+/).filter(Boolean);

  if (moveList.length === 0) {
    return {
      name: 'Starting Position',
      fullName: 'Starting Position',
      movesCount: 0,
    };
  }

  // Clean move numbers like "1." or "1..."
  const cleanMoves = moveList.filter((m) => !/^\d+\.+$/.test(m));

  // Play moves on board to get FENs
  const chess = new Chess();
  const path: Array<{ fen: string; san: string; uci: string }> = [];

  for (const m of cleanMoves) {
    try {
      const res = chess.move(m);
      if (res) {
        path.push({
          fen: chess.fen(),
          san: res.san,
          uci: res.from + res.to + (res.promotion || ''),
        });
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return identifyOpeningFromPath(path);
}
