import { PieceColor, MoveEvaluation, MultiPvEvaluation } from '../../types/chess';

export interface ParsedUciInfo {
  depth?: number;
  seldepth?: number;
  multipv?: number;
  scoreCp?: number; // centipawns relative to side to move
  scoreMate?: number; // moves to mate relative to side to move
  nodes?: number;
  nps?: number;
  time?: number;
  pv?: string[]; // uci move strings
}

export interface ParsedBestMove {
  bestMove: string;
  ponder?: string;
}

/**
 * Parses an "info ..." line from Stockfish UCI output.
 * Example:
 * "info depth 16 seldepth 22 multipv 1 score cp 35 nodes 182743 nps 450000 time 406 pv e2e4 e7e5 g1f3 b8c6"
 * "info depth 12 score mate -2 nodes 12000 nps 300000 time 40 pv f7f8q"
 */
export function parseUciInfoLine(line: string): ParsedUciInfo | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('info ') || trimmed.includes(' string ')) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  const result: ParsedUciInfo = {};

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === 'depth' && i + 1 < tokens.length) {
      result.depth = parseInt(tokens[++i], 10);
    } else if (token === 'seldepth' && i + 1 < tokens.length) {
      result.seldepth = parseInt(tokens[++i], 10);
    } else if (token === 'multipv' && i + 1 < tokens.length) {
      result.multipv = parseInt(tokens[++i], 10);
    } else if (token === 'nodes' && i + 1 < tokens.length) {
      result.nodes = parseInt(tokens[++i], 10);
    } else if (token === 'nps' && i + 1 < tokens.length) {
      result.nps = parseInt(tokens[++i], 10);
    } else if (token === 'time' && i + 1 < tokens.length) {
      result.time = parseInt(tokens[++i], 10);
    } else if (token === 'score' && i + 2 < tokens.length) {
      const scoreType = tokens[++i];
      const scoreVal = parseInt(tokens[++i], 10);
      if (scoreType === 'cp') {
        result.scoreCp = scoreVal;
      } else if (scoreType === 'mate') {
        result.scoreMate = scoreVal;
      }
    } else if (token === 'pv') {
      // Everything following 'pv' up to the end is the principal variation moves
      result.pv = tokens.slice(i + 1);
      break;
    }
  }

  return result;
}

/**
 * Parses a "bestmove ..." line from UCI.
 * Example: "bestmove e2e4 ponder e7e5" or "bestmove e7e8q"
 */
export function parseBestMoveLine(line: string): ParsedBestMove | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('bestmove ')) {
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  const bestMove = tokens[1];
  let ponder: string | undefined;

  const ponderIdx = tokens.indexOf('ponder');
  if (ponderIdx !== -1 && ponderIdx + 1 < tokens.length) {
    ponder = tokens[ponderIdx + 1];
  }

  return { bestMove, ponder };
}

/**
 * UCI engines output scores relative to the side whose turn it is to move.
 * For consistent UI, evaluation bars and review graphs, we normalize scores:
 * - White's perspective: positive = advantage for White, negative = advantage for Black.
 * - Side-to-move perspective: positive = advantage for the player to move.
 */
export function convertScoreToPerspectives(
  scoreCp: number | undefined,
  scoreMate: number | undefined,
  activeColor: PieceColor
): {
  scoreCpSideToMove: number;
  scoreCpWhite: number;
  mateSideToMove?: number;
  mateWhite?: number;
} {
  const isWhiteToMove = activeColor === 'w';

  // Mate
  let mateSide: number | undefined = undefined;
  let mateWhite: number | undefined = undefined;

  if (typeof scoreMate === 'number') {
    mateSide = scoreMate;
    mateWhite = isWhiteToMove ? scoreMate : -scoreMate;
  }

  // Centipawns: when Stockfish reports mate, scoreCp is undefined in UCI output.
  // Normalize to an extreme score (+/- 10000) so downstream evaluations and CPL
  // correctly recognize checkmate and do not treat a forced mate as 0 centipawns (equal).
  let cpSide: number;
  if (typeof scoreCp === 'number') {
    cpSide = scoreCp;
  } else if (typeof mateSide === 'number') {
    const mateDistancePenalty = Math.min(1000, Math.abs(mateSide) * 10);
    cpSide = mateSide > 0 ? (10000 - mateDistancePenalty) : (-10000 + mateDistancePenalty);
  } else {
    cpSide = 0;
  }

  const cpWhite = isWhiteToMove ? cpSide : -cpSide;

  return {
    scoreCpSideToMove: cpSide,
    scoreCpWhite: cpWhite,
    mateSideToMove: mateSide,
    mateWhite,
  };
}

/**
 * Converts a centipawn or mate score (from White's perspective)
 * into a winning probability percentage (0 to 100) for White.
 * Uses standard chess winning expectancy logistic model:
 * W = 100 / (1 + 10^(-score / 400))
 */
export function scoreToWinPercentage(scoreCpWhite: number, mateWhite?: number): number {
  if (typeof mateWhite === 'number') {
    if (mateWhite > 0) return 100;
    if (mateWhite < 0) return 0;
    return 50;
  }

  const winRate = 100 / (1 + Math.pow(10, -scoreCpWhite / 400));
  return Math.min(100, Math.max(0, Math.round(winRate * 10) / 10));
}

/**
 * Combines parsed UCI info into a normalized MultiPvEvaluation
 */
export function createMultiPvEvaluation(
  info: ParsedUciInfo,
  activeColor: PieceColor,
  fen?: string
): MultiPvEvaluation | null {
  if (!info.pv || info.pv.length === 0) {
    return null;
  }

  const { scoreCpWhite, mateWhite } = convertScoreToPerspectives(
    info.scoreCp,
    info.scoreMate,
    activeColor
  );

  return {
    id: info.multipv || 1,
    depth: info.depth || 0,
    score: scoreCpWhite,
    mate: mateWhite,
    pv: info.pv,
    bestMove: info.pv[0],
    fen,
  };
}

/**
 * Converts top MultiPv candidate into the primary MoveEvaluation
 */
export function toPrimaryMoveEvaluation(
  info: ParsedUciInfo,
  activeColor: PieceColor,
  fen?: string
): MoveEvaluation | null {
  if (!info.pv || info.pv.length === 0) {
    return null;
  }

  const { scoreCpWhite, mateWhite } = convertScoreToPerspectives(
    info.scoreCp,
    info.scoreMate,
    activeColor
  );

  return {
    depth: info.depth || 0,
    score: scoreCpWhite,
    mate: mateWhite,
    pv: info.pv,
    bestMove: info.pv[0],
    nodes: info.nodes,
    nps: info.nps,
    time: info.time,
    fen,
  };
}

/**
 * Helper to extract active color ('w' | 'b') from a FEN string safely.
 */
export function getActiveColorFromFen(fen: string): PieceColor {
  const parts = fen.trim().split(/\s+/);
  return parts.length > 1 && parts[1] === 'b' ? 'b' : 'w';
}
