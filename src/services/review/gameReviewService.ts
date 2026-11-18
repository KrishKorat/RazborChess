import { VariationTree } from '../tree/variationTree';
import { StockfishService } from '../engine/stockfishService';
import { EvalCache } from '../engine/evalCache';
import { GameReviewStep, GameReviewReport, MoveEvaluation, MultiPvEvaluation } from '../../types/chess';
import { calculateMoveDeltas, classifyMove, compileGameReviewReport } from './moveClassifier';
import { detectGamePhase } from './phaseDetector';
import { logClassificationDetails } from './classificationLogger';
import { convertUciPvToSan } from '../engine/evalCache';

export interface ReviewProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  currentMoveSan: string;
  isCompleted: boolean;
  isCancelled: boolean;
}

export type ProgressCallback = (progress: ReviewProgress, partialReport?: GameReviewReport) => void;

export class GameReviewService {
  private engine: StockfishService;
  private cache: EvalCache;
  private isCancelled: boolean = false;
  private isRunning: boolean = false;

  constructor(engine: StockfishService, cache: EvalCache) {
    this.engine = engine;
    this.cache = cache;
  }

  public isBusy(): boolean {
    return this.isRunning;
  }

  public cancel(): void {
    if (this.isRunning) {
      this.isCancelled = true;
      this.engine.stopSearch();
    }
  }

  /**
   * Reviews all moves in the given game path sequentially using Stockfish 19.
   * Ensures high-quality analysis by validating cache depths and avoiding shallow fixed depth reuse.
   * Supports forceFresh to completely bypass cache and re-evaluate every position with fresh engine searches.
   */
  public async runReview(
    tree: VariationTree,
    targetDepth: number = 14,
    onProgress?: ProgressCallback,
    forceFresh: boolean = false
  ): Promise<GameReviewReport> {
    this.isRunning = true;
    this.isCancelled = false;

    // Get full active mainline from root down to leaf
    const fullLine = tree.getMainlinePath();

    // Filter out root (ply 0)
    const moves = fullLine.filter((n) => n.id !== 'root');
    const reviewSteps: GameReviewStep[] = [];
    const totalSteps = moves.length;

    try {
      for (let i = 0; i < totalSteps; i++) {
        if (this.isCancelled) {
          break;
        }

        const moveNode = moves[i];
        const parentNode = moveNode.parentId ? tree.getNode(moveNode.parentId) : null;
        const fenBefore = parentNode ? parentNode.fen : tree.getRootNode().fen;
        const fenAfter = moveNode.fen;

        // Progress notification
        if (onProgress) {
          onProgress({
            currentStep: i + 1,
            totalSteps,
            percentage: Math.round(((i + 1) / totalSteps) * 100),
            currentMoveSan: moveNode.san,
            isCompleted: false,
            isCancelled: false,
          });
        }

        // 1. Get or compute evaluation before move (best move evaluation at target depth with MultiPV 2 for alternatives)
        const { evaluation: evalBefore, multiPv: multiPvBefore, fromCache: evalBeforeCached } = 
          await this.getPositionEvaluation(fenBefore, targetDepth, forceFresh, 2);
        if (this.isCancelled) break;

        // 2. Get or compute evaluation after move at target depth
        const { evaluation: evalAfter, fromCache: evalAfterCached } = 
          await this.getPositionEvaluation(fenAfter, targetDepth, forceFresh, 1);
        if (this.isCancelled) break;

        // 3. Calculate CPL and win rate deltas with mover perspective conversion
        const deltas = calculateMoveDeltas(
          evalBefore,
          evalAfter,
          moveNode.color
        );

        // 4. Classify move using comprehensive heuristics (Book, Forced, Tactical Sacrifices, etc.)
        const classification = classifyMove(
          moveNode.uci,
          evalBefore.bestMove,
          deltas.centipawnLoss,
          deltas.winRateBefore,
          deltas.winRateAfter,
          deltas.winRateDelta,
          fenBefore,
          fenAfter,
          moveNode.san,
          multiPvBefore,
          deltas.mateBefore,
          deltas.mateAfter,
          deltas.scoreBefore,
          deltas.scoreAfter
        );

        // Convert engine best move to SAN for clean display
        const bestSanList = convertUciPvToSan(fenBefore, [evalBefore.bestMove]);
        const bestMoveSan = bestSanList[0] || evalBefore.bestMove;

        const phase = detectGamePhase(fenBefore);

        const step: GameReviewStep = {
          ply: moveNode.ply,
          moveNumber: moveNode.moveNumber,
          color: moveNode.color,
          san: moveNode.san,
          uci: moveNode.uci,
          fenBefore,
          fenAfter,
          playedMoveEval: evalAfter,
          bestMoveEval: evalBefore,
          centipawnLoss: deltas.centipawnLoss,
          winRateBefore: deltas.winRateBefore,
          winRateAfter: deltas.winRateAfter,
          winRateDelta: deltas.winRateDelta,
          classification,
          phase,
          bestMoveSan,
        };

        // Attach review record directly to the tree node
        moveNode.review = step;
        moveNode.classification = classification;
        reviewSteps.push(step);

        // Console instrumentation for diagnostic auditing
        logClassificationDetails({
          fenBefore,
          fenAfter,
          playedUci: moveNode.uci,
          playedSan: moveNode.san,
          bestUci: evalBefore.bestMove,
          bestSan: bestMoveSan,
          activeColor: moveNode.color,
          evalBefore: {
            scoreWhiteCp: evalBefore.score,
            scoreSideToMoveCp: moveNode.color === 'w' ? evalBefore.score : -evalBefore.score,
            mateWhite: evalBefore.mate,
            mateSideToMove: moveNode.color === 'w' ? evalBefore.mate : (evalBefore.mate ? -evalBefore.mate : undefined),
            depth: evalBefore.depth,
            isFromCache: evalBeforeCached,
          },
          evalAfter: {
            scoreWhiteCp: evalAfter.score,
            scoreSideToMoveCp: (moveNode.color === 'w' ? 'b' : 'w') === 'w' ? evalAfter.score : -evalAfter.score,
            mateWhite: evalAfter.mate,
            mateSideToMove: (moveNode.color === 'w' ? 'b' : 'w') === 'w' ? evalAfter.mate : (evalAfter.mate ? -evalAfter.mate : undefined),
            depth: evalAfter.depth,
            isFromCache: evalAfterCached,
          },
          deltas: {
            centipawnLoss: deltas.centipawnLoss,
            winRateBefore: deltas.winRateBefore,
            winRateAfter: deltas.winRateAfter,
            winRateDelta: deltas.winRateDelta,
            scoreBeforeMover: deltas.scoreBefore,
            scoreAfterMover: deltas.scoreAfter,
          },
          classification,
          source: 'review',
        });
      }
    } finally {
      this.isRunning = false;
    }

    const report = compileGameReviewReport(reviewSteps);

    if (onProgress) {
      onProgress(
        {
          currentStep: reviewSteps.length,
          totalSteps,
          percentage: totalSteps > 0 ? Math.round((reviewSteps.length / totalSteps) * 100) : 100,
          currentMoveSan: '',
          isCompleted: !this.isCancelled,
          isCancelled: this.isCancelled,
        },
        report
      );
    }

    return report;
  }

  /**
   * Evaluates a single position at the requested targetDepth.
   * Only reuses cache if forceFresh is false and cached analysis has depth >= targetDepth and sufficient MultiPV lines.
   * Leverages isolated evaluatePositionAsync to guarantee reliable sequential execution.
   */
  public async getPositionEvaluation(
    fen: string,
    targetDepth: number,
    forceFresh: boolean = false,
    multiPv: number = 1
  ): Promise<{ evaluation: MoveEvaluation; multiPv: MultiPvEvaluation[]; fromCache: boolean }> {
    if (!forceFresh) {
      const cached = this.cache.get(fen, targetDepth);
      if (cached && cached.evaluation.depth >= targetDepth && (multiPv <= 1 || (cached.multiPv && cached.multiPv.length >= multiPv))) {
        return {
          evaluation: cached.evaluation,
          multiPv: cached.multiPv,
          fromCache: true,
        };
      }
    }

    try {
      const result = await this.engine.evaluatePositionAsync(fen, targetDepth, 10000, multiPv);
      this.cache.set(fen, result.evaluation, result.multiPv, true);
      return { ...result, fromCache: false };
    } catch (err) {
      console.warn('evaluatePositionAsync fallback for fen:', fen, err);
      // Fallback in case of interruption
      const fallbackEval: MoveEvaluation = {
        depth: targetDepth,
        score: 0,
        pv: [],
        bestMove: '',
        fen,
      };
      return { evaluation: fallbackEval, multiPv: [], fromCache: false };
    }
  }
}
