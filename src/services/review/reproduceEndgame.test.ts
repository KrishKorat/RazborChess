import { describe, it } from 'vitest';
import { spawn } from 'child_process';
import readline from 'readline';
import { Chess } from 'chess.js';
import { parseUciInfoLine, parseBestMoveLine, toPrimaryMoveEvaluation, createMultiPvEvaluation, getActiveColorFromFen } from '../engine/uciParser';
import { calculateMoveDeltas, classifyMove, compileGameReviewReport } from './moveClassifier';
import { GameReviewStep } from '../../types/chess';

describe('Reproduce Endgame Issues', () => {
  it('analyzes the full reproduction game using Stockfish 19', async () => {
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

    async function evalPosition(fen: string, depth = 12, multiPv = 1) {
      currentOutput = [];
      send('position fen ' + fen);
      send('setoption name MultiPV value ' + multiPv);
      send('go depth ' + depth);
      const lines = await new Promise<string[]>((resolve) => {
        pendingResolve = resolve;
      });

      const activeColor = getActiveColorFromFen(fen);
      let primary = { depth, score: 0, pv: [] as string[], bestMove: '' };
      const multiPvs = [];

      for (const line of lines) {
        if (line.startsWith('info depth ' + depth)) {
          const info = parseUciInfoLine(line);
          if (info) {
            const mpv = createMultiPvEvaluation(info, activeColor);
            if (mpv) multiPvs.push(mpv);
            if ((info.multipv || 1) === 1) {
              const prim = toPrimaryMoveEvaluation(info, activeColor);
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

    const pgn = '1. e4 c6 2. Nf3 d5 3. exd5 cxd5 4. d4 Bf5 5. c4 e6 6. cxd5 exd5 7. Nc3 Nf6 8. Qe2+ Be7 9. h3 O-O 10. g4 Be4 11. Be3 Bxf3 12. Qxf3 Re8 13. Be2 Nc6 14. g5 Ne4 15. Nxe4 dxe4 16. Qh5 Nxd4 17. O-O-O Nxe2+ 18. Kb1 Qa5 19. Qxe2 Bxg5 20. Rhg1 Bxe3 21. Qxe3 Rad8 22. Rde1 Qd2 23. Qg3 Qd3+ 24. Qxd3 exd3 25. Rd1 Re2 26. Rge1 Rxe1 27. Rxe1 d2 28. Rd1 g5 29. Kc2 h5 30. Rxd2 Rxd2+ 31. Kxd2 f5 32. Ke3 Kg7 33. f4 g4 34. hxg4 fxg4 35. Kf2 Kf6 36. Kg3 Kf5 37. b4 b5 38. a3 a6 39. Kh4 Kxf4 40. Kxh5 Kf3 41. Kh4 g3 42. Kh3 Kf2';
    const ch = new Chess();
    ch.loadPgn(pgn);
    const moves = ch.history({ verbose: true });

    const steps: GameReviewStep[] = [];
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const fenBefore = m.before;
      const fenAfter = m.after;
      const activeColor = m.color;

      const { evaluation: evalBefore, multiPv: multiPvBefore } = await evalPosition(fenBefore, 12, 2);
      const { evaluation: evalAfter } = await evalPosition(fenAfter, 12, 1);

      const deltas = calculateMoveDeltas(evalBefore, evalAfter, activeColor);
      const classification = classifyMove(
        m.from + m.to,
        evalBefore.bestMove,
        deltas.centipawnLoss,
        deltas.winRateBefore,
        deltas.winRateAfter,
        deltas.winRateDelta,
        fenBefore,
        fenAfter,
        m.san,
        multiPvBefore,
        deltas.mateBefore,
        deltas.mateAfter,
        deltas.scoreBefore,
        deltas.scoreAfter
      );

      steps.push({
        ply: i + 1,
        moveNumber: Math.floor(i / 2) + 1,
        color: activeColor,
        san: m.san,
        uci: m.from + m.to,
        fenBefore,
        fenAfter,
        playedMoveEval: evalAfter,
        bestMoveEval: evalBefore,
        centipawnLoss: deltas.centipawnLoss,
        winRateBefore: deltas.winRateBefore,
        winRateAfter: deltas.winRateAfter,
        winRateDelta: deltas.winRateDelta,
        classification,
        phase: 'endgame',
      });
    }

    const report = compileGameReviewReport(steps);
    console.log('RESULTS:');
    console.log('White accuracy:', report.whiteAccuracy);
    console.log('Black accuracy:', report.blackAccuracy);
    console.log('White classifications:', JSON.stringify(report.classificationCounts.white));
    console.log('Black classifications:', JSON.stringify(report.classificationCounts.black));

    console.log('\nLast 15 moves:');
    for (let i = steps.length - 15; i < steps.length; i++) {
      const s = steps[i];
      console.log(
        `Ply ${s.ply} (${s.color === 'w' ? s.moveNumber + '.' : s.moveNumber + '...'} ${s.san}): ` +
        `${s.classification} | CPL=${s.centipawnLoss} WRDelta=${s.winRateDelta}% ` +
        `(WR: ${s.winRateBefore}% -> ${s.winRateAfter}%) played=${s.uci} best=${s.bestMoveEval?.bestMove ?? ''}`
      );
    }

    sf.kill();
  }, 90000);
});
