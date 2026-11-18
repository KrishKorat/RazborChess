import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import readline from 'readline';
import { Chess } from 'chess.js';
import { 
  parseUciInfoLine, 
  parseBestMoveLine, 
  toPrimaryMoveEvaluation, 
  createMultiPvEvaluation, 
  getActiveColorFromFen 
} from '../engine/uciParser';
import { calculateMoveDeltas, classifyMove } from './moveClassifier';
import { EvalCache } from '../engine/evalCache';
import { VariationTree } from '../tree/variationTree';
import { logClassificationDetails } from './classificationLogger';
import { MoveEvaluation } from '../../types/chess';

describe('Real Stockfish Engine Move Classification: exd5 vs Bd3', () => {
  it('independently evaluates exd5 vs Bd3 with real Stockfish, asserting Bd3 cannot be Best', async () => {
    const sf = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish-19-lite-single.js']);
    const rl = readline.createInterface({ input: sf.stdout });

    function send(cmd: string) {
      sf.stdin.write(cmd + '\n');
    }

    let pendingResolve: ((lines: string[]) => void) | null = null;
    let currentOutput: string[] = [];

    rl.on('line', (line) => {
      currentOutput.push(line);
      if (line.startsWith('bestmove')) {
        if (pendingResolve) {
          const res = pendingResolve;
          pendingResolve = null;
          res(currentOutput);
        }
      }
    });

    async function evalPosition(fen: string, depth = 14, multiPv = 2) {
      currentOutput = [];
      send('position fen ' + fen);
      send('setoption name MultiPV value ' + multiPv);
      send('go depth ' + depth);
      const lines = await new Promise<string[]>((resolve) => {
        pendingResolve = resolve;
      });

      const activeColor = getActiveColorFromFen(fen);
      let primary: MoveEvaluation = { depth, score: 0, pv: [] as string[], bestMove: '', fen };
      const multiPvs = [];

      for (const line of lines) {
        if (line.startsWith('info depth ' + depth)) {
          const info = parseUciInfoLine(line);
          if (info) {
            const mpv = createMultiPvEvaluation(info, activeColor, fen);
            if (mpv) multiPvs.push(mpv);
            if ((info.multipv || 1) === 1) {
              const prim = toPrimaryMoveEvaluation(info, activeColor, fen);
              if (prim) primary = prim;
            }
          }
        }
        if (line.startsWith('bestmove')) {
          const parsedBest = parseBestMoveLine(line);
          if (parsedBest && parsedBest.bestMove) {
            primary.bestMove = parsedBest.bestMove;
          }
        }
      }
      return { evaluation: primary, multiPv: multiPvs };
    }

    send('uci');
    send('isready');
    await new Promise((r) => setTimeout(r, 300));

    // The game position after 1.e4 c6 2.Nf3 d5 3.exd5 cxd5 4.d4 Bf5 5.c4 e6 6.cxd5
    const game = new Chess();
    game.move('e4');
    game.move('c6');
    game.move('Nf3');
    game.move('d5');
    game.move('exd5');
    game.move('cxd5');
    game.move('d4');
    game.move('Bf5');
    game.move('c4');
    game.move('e6');
    game.move('cxd5');
    const fenBefore = game.fen();

    // 1. Evaluate pre-move position with Stockfish
    const { evaluation: evalBefore, multiPv: multiPvBefore } = await evalPosition(fenBefore, 14, 2);
    expect(evalBefore.bestMove).toBeTruthy();
    expect(typeof evalBefore.score).toBe('number');

    // 2. Evaluate 6...exd5
    const chExd5 = new Chess(fenBefore);
    chExd5.move('exd5');
    const fenExd5 = chExd5.fen();

    const { evaluation: evalExd5 } = await evalPosition(fenExd5, 14, 1);
    const deltasExd5 = calculateMoveDeltas(evalBefore, evalExd5, 'b');
    const classExd5 = classifyMove(
      'e6d5',
      evalBefore.bestMove,
      deltasExd5.centipawnLoss,
      deltasExd5.winRateBefore,
      deltasExd5.winRateAfter,
      deltasExd5.winRateDelta,
      fenBefore,
      fenExd5,
      'exd5',
      multiPvBefore,
      deltasExd5.mateBefore,
      deltasExd5.mateAfter,
      deltasExd5.scoreBefore,
      deltasExd5.scoreAfter
    );

    logClassificationDetails({
      fenBefore,
      fenAfter: fenExd5,
      playedUci: 'e6d5',
      playedSan: 'exd5',
      bestUci: evalBefore.bestMove,
      activeColor: 'b',
      evalBefore: {
        scoreWhiteCp: evalBefore.score,
        scoreSideToMoveCp: -evalBefore.score,
        depth: evalBefore.depth,
        isFromCache: false,
      },
      evalAfter: {
        scoreWhiteCp: evalExd5.score,
        scoreSideToMoveCp: evalExd5.score,
        depth: evalExd5.depth,
        isFromCache: false,
      },
      deltas: {
        centipawnLoss: deltasExd5.centipawnLoss,
        winRateBefore: deltasExd5.winRateBefore,
        winRateAfter: deltasExd5.winRateAfter,
        winRateDelta: deltasExd5.winRateDelta,
        scoreBeforeMover: deltasExd5.scoreBefore,
        scoreAfterMover: deltasExd5.scoreAfter,
      },
      classification: classExd5,
      source: 'review',
    });

    // 3. Evaluate 6...Bd3 (blunders bishop on d3)
    const chBd3 = new Chess(fenBefore);
    chBd3.move('Bd3');
    const fenBd3 = chBd3.fen();

    const { evaluation: evalBd3 } = await evalPosition(fenBd3, 14, 1);
    const deltasBd3 = calculateMoveDeltas(evalBefore, evalBd3, 'b');
    const classBd3 = classifyMove(
      'f5d3',
      evalBefore.bestMove,
      deltasBd3.centipawnLoss,
      deltasBd3.winRateBefore,
      deltasBd3.winRateAfter,
      deltasBd3.winRateDelta,
      fenBefore,
      fenBd3,
      'Bd3',
      multiPvBefore,
      deltasBd3.mateBefore,
      deltasBd3.mateAfter,
      deltasBd3.scoreBefore,
      deltasBd3.scoreAfter
    );

    logClassificationDetails({
      fenBefore,
      fenAfter: fenBd3,
      playedUci: 'f5d3',
      playedSan: 'Bd3',
      bestUci: evalBefore.bestMove,
      activeColor: 'b',
      evalBefore: {
        scoreWhiteCp: evalBefore.score,
        scoreSideToMoveCp: -evalBefore.score,
        depth: evalBefore.depth,
        isFromCache: false,
      },
      evalAfter: {
        scoreWhiteCp: evalBd3.score,
        scoreSideToMoveCp: evalBd3.score,
        depth: evalBd3.depth,
        isFromCache: false,
      },
      deltas: {
        centipawnLoss: deltasBd3.centipawnLoss,
        winRateBefore: deltasBd3.winRateBefore,
        winRateAfter: deltasBd3.winRateAfter,
        winRateDelta: deltasBd3.winRateDelta,
        scoreBeforeMover: deltasBd3.scoreBefore,
        scoreAfterMover: deltasBd3.scoreAfter,
      },
      classification: classBd3,
      source: 'live_board',
    });

    sf.kill();

    // Assert that the evaluations are independent and based on actual played moves
    expect(['best', 'excellent']).toContain(classExd5);
    expect(deltasBd3.centipawnLoss).toBeGreaterThan(250);
    expect(deltasBd3.winRateDelta).toBeGreaterThan(20);
    expect(classBd3).toBe('blunder');
    expect(classBd3).not.toBe('best');
    expect(classBd3).not.toBe(classExd5);

    // 4. Verify Cache Isolation and non-inheritance
    const cache = new EvalCache();
    cache.set(fenBefore, evalBefore, multiPvBefore);
    cache.set(fenExd5, evalExd5, []);

    // A search on fenBd3 must not return fenExd5 evaluation
    const cachedForBd3 = cache.get(fenBd3);
    expect(cachedForBd3).toBeUndefined();

    // Setting an evaluation with mismatched FEN must be rejected
    cache.set(fenBd3, { ...evalExd5, fen: fenExd5 });
    expect(cache.get(fenBd3)).toBeUndefined();

    // 5. Verify VariationTree does not bleed classifications
    const tree = new VariationTree();
    const importRes = tree.importPgn('1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Bf5 5. c4 e6 6. cxd5 exd5');
    expect(importRes.success).toBe(true);
    // Go to the end of the line (6...exd5) and step back once to 6.cxd5
    tree.goToLastInLine();
    expect(tree.getCurrentNode().san).toBe('exd5');
    tree.goToPrevious();
    expect(tree.getCurrentNode().san).toBe('cxd5');
    // Play 6...Bd3 as alternate variation branch from 6.cxd5
    const bd3Node = tree.addMove('f5', 'd3');
    expect(bd3Node).not.toBeNull();
    expect(tree.isMainlineNode(bd3Node!.id)).toBe(false);
    expect(bd3Node!.classification).toBeUndefined();
  }, 30000);
});
