import { describe, it, expect } from 'vitest';
import { GameReviewService } from './gameReviewService';
import { VariationTree } from '../tree/variationTree';
import { EvalCache } from '../engine/evalCache';
import { StockfishService } from '../engine/stockfishService';

// Helper mock worker
class MockWorker {
  public onmessage: ((e: any) => void) | null = null;
  public onerror: ((e: any) => void) | null = null;
  public postedMessages: string[] = [];

  postMessage(msg: string) {
    this.postedMessages.push(msg);

    if (msg === 'uci') {
      setTimeout(() => {
        this.emit('id name Stockfish 19');
        this.emit('uciok');
      }, 0);
    } else if (msg === 'isready') {
      setTimeout(() => {
        this.emit('readyok');
      }, 0);
    } else if (msg === 'stop') {
      setTimeout(() => {
        this.emit('bestmove e2e4');
      }, 0);
    } else if (msg.startsWith('go')) {
      setTimeout(() => {
        this.emit('info depth 14 seldepth 18 multipv 1 score cp 30 nodes 50000 nps 1500000 pv e2e4 e7e5');
        this.emit('bestmove e2e4');
      }, 0);
    }
  }

  terminate() {}

  emit(data: string) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }
}

describe('GameReviewService', () => {
  it('runs game review across mainline moves and invokes progress callbacks', async () => {
    const mockWorker = new MockWorker();
    const service = new StockfishService({ workerPath: 'mock' }, () => mockWorker as any);
    await service.init();

    const cache = new EvalCache(50);
    const reviewService = new GameReviewService(service, cache);

    const tree = new VariationTree();
    tree.addMove('e2', 'e4'); // ply 1
    tree.addMove('e7', 'e5'); // ply 2

    const progressReports: number[] = [];

    const report = await reviewService.runReview(tree, 14, (prog) => {
      progressReports.push(prog.percentage);
    });

    expect(progressReports.length).toBeGreaterThan(0);
    expect(progressReports[progressReports.length - 1]).toBe(100);
    expect(report.moves.length).toBe(2);
    expect(report.whiteAccuracy).toBeGreaterThan(0);
    expect(report.blackAccuracy).toBeGreaterThan(0);
  });

  it('can be cancelled midway', async () => {
    const mockWorker = new MockWorker();
    const service = new StockfishService({ workerPath: 'mock' }, () => mockWorker as any);
    await service.init();

    const cache = new EvalCache(50);
    const reviewService = new GameReviewService(service, cache);

    const tree = new VariationTree();
    tree.addMove('e2', 'e4');
    tree.addMove('e7', 'e5');
    tree.addMove('g1', 'f3');

    // Trigger cancel during run
    const reviewPromise = reviewService.runReview(tree, 14);
    reviewService.cancel();

    const report = await reviewPromise;
    expect(reviewService.isBusy()).toBe(false);
    expect(report).toBeDefined();
  });

  it('runs multiple consecutive game reviews on newly imported PGNs without stalling', async () => {
    const mockWorker = new MockWorker();
    const service = new StockfishService({ workerPath: 'mock' }, () => mockWorker as any);
    await service.init();

    const cache = new EvalCache(50);
    const reviewService = new GameReviewService(service, cache);

    // Game 1
    const pgn1 = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0';
    const tree1 = new VariationTree();
    expect(tree1.importPgn(pgn1).success).toBe(true);

    const report1 = await reviewService.runReview(tree1, 14, undefined, true);
    expect(report1.moves.length).toBe(7);
    expect(report1.whiteAccuracy).toBeGreaterThan(0);
    expect(report1.blackAccuracy).toBeGreaterThan(0);

    // Consecutive Game 2 on same engine instance without reload
    const pgn2 = '1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 4. d4 Nf6 5. Nf3 Bg4 6. h3 Bh5 7. g4 Bg6 8. Ne5 c6 0-1';
    const tree2 = new VariationTree();
    expect(tree2.importPgn(pgn2).success).toBe(true);

    const report2 = await reviewService.runReview(tree2, 14, undefined, true);
    expect(report2.moves.length).toBe(16);
    expect(report2.whiteAccuracy).toBeGreaterThan(0);
    expect(report2.blackAccuracy).toBeGreaterThan(0);
  });
});
