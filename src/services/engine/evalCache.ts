import { MoveEvaluation, MultiPvEvaluation, GameReviewReport } from '../../types/chess';
import { Chess } from 'chess.js';
import type { VariationTree } from '../tree/variationTree';

export interface PositionAnalysis {
  fen: string;
  evaluation: MoveEvaluation;
  multiPv: MultiPvEvaluation[];
  timestamp: number;
  isFromReview?: boolean;
}

/**
 * Normalizes a FEN string to ignore halfmove clock and fullmove number
 * so identical piece setups with same turn, castling, and en passant match the same cache key.
 */
export function normalizeFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length >= 4) {
    return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
  }
  return fen.trim();
}

/**
 * Converts an array of UCI moves (e.g. ["e2e4", "e7e5", "g1f3"])
 * into Standard Algebraic Notation (SAN) moves (e.g. ["e4", "e5", "Nf3"])
 * using the given starting position FEN.
 */
export function convertUciPvToSan(fen: string, uciPv: string[]): string[] {
  if (!uciPv || uciPv.length === 0) return [];

  try {
    const chess = new Chess(fen);
    const sanList: string[] = [];

    for (const uci of uciPv) {
      if (uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;

      const move = chess.move({ from, to, promotion });
      if (!move) break;
      sanList.push(move.san);
    }

    return sanList;
  } catch (e) {
    return [];
  }
}

/**
 * In-memory evaluation cache to prevent repeatedly analyzing identical positions.
 * Stores up to maxEntries with LRU eviction to prevent memory growth on 8GB RAM hardware.
 */
export class EvalCache {
  private cache: Map<string, PositionAnalysis> = new Map();
  private maxEntries: number;
  private version: number = 0;
  private listeners: Set<() => void> = new Set();

  constructor(maxEntries: number = 2000) {
    this.maxEntries = maxEntries;
  }

  public getVersion(): number {
    return this.version;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.version++;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        // ignore subscriber errors
      }
    }
  }

  public get(fen: string, minDepth?: number): PositionAnalysis | undefined {
    const key = normalizeFen(fen);
    const item = this.cache.get(key);
    if (item) {
      // 1. Strict FEN match validation
      if (item.evaluation.fen && normalizeFen(item.evaluation.fen) !== key) {
        this.cache.delete(key);
        return undefined;
      }

      // 2. Must have valid score and bestMove
      if (typeof item.evaluation.score !== 'number' && typeof item.evaluation.mate !== 'number') {
        return undefined;
      }
      if (!item.evaluation.bestMove && typeof item.evaluation.mate !== 'number') {
        return undefined;
      }

      // 3. Minimum depth validation
      if (typeof minDepth === 'number' && item.evaluation.depth < minDepth) {
        return undefined; // Shallow evaluation not sufficient
      }

      // Re-insert to refresh LRU order
      this.cache.delete(key);
      this.cache.set(key, item);
      return item;
    }
    return undefined;
  }

  public set(
    fen: string, 
    evaluation: MoveEvaluation, 
    multiPv: MultiPvEvaluation[] = [],
    isFromReview: boolean = false
  ): void {
    const key = normalizeFen(fen);

    // 1. Never cache an evaluation from a different FEN
    if (evaluation.fen && normalizeFen(evaluation.fen) !== key) {
      return;
    }

    // 2. Do not use an evaluation without a valid score
    if (typeof evaluation.score !== 'number' && typeof evaluation.mate !== 'number') {
      return;
    }

    // 3. Do not treat an empty bestMove as a valid engine result
    if (!evaluation.bestMove && typeof evaluation.mate !== 'number') {
      return;
    }

    const existing = this.cache.get(key);

    // 4. Do not let live analysis overwrite a deeper review evaluation
    if (existing && existing.isFromReview && !isFromReview && existing.evaluation.depth >= evaluation.depth) {
      return;
    }

    // 5. If an existing evaluation is deeper, do not overwrite with shallower result
    if (existing && existing.evaluation.depth > evaluation.depth) {
      return;
    }

    // 6. Do not overwrite an existing evaluation having a bestMove with one that has no bestMove
    if (existing && existing.evaluation.bestMove && !evaluation.bestMove) {
      return;
    }

    if (existing) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict oldest (first key in map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      fen: key,
      evaluation: { ...evaluation, fen: key },
      multiPv,
      timestamp: Date.now(),
      isFromReview: isFromReview || existing?.isFromReview,
    });
    this.notify();
  }

  public has(fen: string): boolean {
    return this.cache.has(normalizeFen(fen));
  }

  public clear(): void {
    this.cache.clear();
    this.notify();
  }

  public size(): number {
    return this.cache.size;
  }
}

/**
 * Populates the EvalCache with existing evaluations from a GameReviewReport
 * and/or a VariationTree so that evaluation graph and evaluation bar
 * immediately reflect the game's actual analysis without re-running Stockfish.
 */
export function populateEvalCacheFromReview(
  cache: EvalCache,
  report?: GameReviewReport | null,
  tree?: VariationTree | null
): void {
  if (report?.moves && report.moves.length > 0) {
    // 1. Root position evaluation (before ply 1)
    const firstStep = report.moves[0];
    if (firstStep?.fenBefore && firstStep.bestMoveEval && typeof firstStep.bestMoveEval.score === 'number') {
      cache.set(firstStep.fenBefore, firstStep.bestMoveEval, [], true);
    }

    // 2. Every move's resulting position evaluation
    for (const step of report.moves) {
      if (step.fenAfter && step.playedMoveEval && typeof step.playedMoveEval.score === 'number') {
        cache.set(step.fenAfter, step.playedMoveEval, [], true);
      }
      if (step.fenBefore && step.bestMoveEval && typeof step.bestMoveEval.score === 'number' && !cache.has(step.fenBefore)) {
        cache.set(step.fenBefore, step.bestMoveEval, [], true);
      }
    }
  }

  // 3. Harvest any review evaluations attached to tree nodes
  if (tree) {
    for (const node of tree.getAllNodes().values()) {
      if (node.review?.playedMoveEval && node.fen && typeof node.review.playedMoveEval.score === 'number') {
        if (!cache.has(node.fen)) {
          cache.set(node.fen, node.review.playedMoveEval, [], true);
        }
      }
      if (node.id === 'root' && node.review?.bestMoveEval && node.fen && typeof node.review.bestMoveEval.score === 'number') {
        if (!cache.has(node.fen)) {
          cache.set(node.fen, node.review.bestMoveEval, [], true);
        }
      }
    }
  }
}

// Global Singleton Cache Instance
let globalEvalCache: EvalCache | null = null;

export function getEvalCache(): EvalCache {
  if (!globalEvalCache) {
    globalEvalCache = new EvalCache(2000);
  }
  return globalEvalCache;
}
