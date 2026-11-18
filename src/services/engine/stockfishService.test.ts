import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockfishService, IEngineWorker } from './stockfishService';
import { MoveEvaluation, MultiPvEvaluation } from '../../types/chess';

// Mock Worker implementation for testing
class MockWorker implements IEngineWorker {
  public postMessage = vi.fn();
  public terminate = vi.fn();
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;

  // Helper to simulate engine responses back to the service
  public simulateEngineOutput(lines: string[]) {
    if (this.onmessage) {
      this.onmessage({ data: lines.join('\n') });
    }
  }
}

async function initializeMockEngine(service: StockfishService, mockWorker: MockWorker) {
  const initPromise = service.init();
  mockWorker.simulateEngineOutput([
    'Stockfish 19 Lite WASM by the Stockfish developers',
    'id name Stockfish 19 Lite WASM',
    'id author the Stockfish developers',
    'uciok',
    'readyok',
  ]);
  await initPromise;
}

describe('StockfishService', () => {
  let mockWorker: MockWorker;
  let service: StockfishService;

  beforeEach(() => {
    mockWorker = new MockWorker();
    service = new StockfishService(
      { depth: 16, multiPv: 1, hashSizeMb: 16 },
      () => mockWorker
    );
  });

  it('starts in uninitialized state and transitions to ready upon valid Stockfish 19 handshake', async () => {
    expect(service.getState()).toBe('uninitialized');

    await initializeMockEngine(service, mockWorker);

    expect(service.getState()).toBe('ready');
    expect(service.getEngineVersion()).toBe('Stockfish 19 Lite WASM');
    expect(service.isVerified()).toBe(true);

    // Verify modest hardware configuration was sent
    expect(mockWorker.postMessage).toHaveBeenCalledWith('setoption name Threads value 1');
    expect(mockWorker.postMessage).toHaveBeenCalledWith('setoption name Hash value 16');
    expect(mockWorker.postMessage).toHaveBeenCalledWith('setoption name MultiPV value 1');
    expect(mockWorker.postMessage).toHaveBeenCalledWith('isready');
  });

  it('fails gracefully when engine identification does not match Stockfish 19', async () => {
    const errorListener = vi.fn();
    service.onError(errorListener);

    const initPromise = service.init();

    // Simulate older/different engine version
    mockWorker.simulateEngineOutput([
      'id name UnknownEngine 1.0',
      'uciok',
    ]);

    await expect(initPromise).rejects.toThrow(/Failed to verify Stockfish 19/);
    expect(service.getState()).toBe('error');
    expect(errorListener).toHaveBeenCalled();
  });

  it('dispatches search commands with position and depth', async () => {
    await initializeMockEngine(service, mockWorker);

    const startposFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    service.evaluatePosition(startposFen);

    expect(mockWorker.postMessage).toHaveBeenCalledWith(`position fen ${startposFen}`);
    expect(mockWorker.postMessage).toHaveBeenCalledWith('go depth 16');
    expect(service.getState()).toBe('searching');
  });

  it('correctly handles search cancellation when position changes during search', async () => {
    await initializeMockEngine(service, mockWorker);

    const pos1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const pos2 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';

    // Start first search
    service.evaluatePosition(pos1);
    expect(mockWorker.postMessage).toHaveBeenCalledWith(`position fen ${pos1}`);
    expect(mockWorker.postMessage).toHaveBeenCalledWith('go depth 16');

    // Immediately request second position while first is still searching
    service.evaluatePosition(pos2);

    // Must send stop to abort first search
    expect(mockWorker.postMessage).toHaveBeenCalledWith('stop');

    // Simulate engine finishing stop and sending bestmove for pos1
    mockWorker.simulateEngineOutput(['bestmove e7e5']);

    // Now second search must have dispatched
    expect(mockWorker.postMessage).toHaveBeenCalledWith(`position fen ${pos2}`);
  });

  it('parses live search info and notifies evaluation listeners', async () => {
    await initializeMockEngine(service, mockWorker);

    let latestEval: MoveEvaluation | null = null;
    let latestMultiPv: MultiPvEvaluation[] = [];

    service.onEvaluation((evaluation, multiPv) => {
      latestEval = evaluation;
      latestMultiPv = multiPv;
    });

    service.evaluatePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    mockWorker.simulateEngineOutput([
      'info depth 12 multipv 1 score cp 25 nodes 80000 nps 400000 time 200 pv e2e4 e7e5',
    ]);

    expect(latestEval).not.toBeNull();
    expect(latestEval!.depth).toBe(12);
    expect(latestEval!.score).toBe(25);
    expect(latestEval!.bestMove).toBe('e2e4');
    expect(latestMultiPv.length).toBe(1);
  });

  it('updates MultiPV options and hash settings', async () => {
    await initializeMockEngine(service, mockWorker);

    service.updateOptions({ multiPv: 3, hashSizeMb: 32 });

    expect(mockWorker.postMessage).toHaveBeenCalledWith('setoption name MultiPV value 3');
    expect(mockWorker.postMessage).toHaveBeenCalledWith('setoption name Hash value 32');
    expect(service.getOptions().multiPv).toBe(3);
    expect(service.getOptions().hashSizeMb).toBe(32);
  });

  it('terminates engine worker safely', async () => {
    await initializeMockEngine(service, mockWorker);

    service.terminate();

    expect(mockWorker.postMessage).toHaveBeenCalledWith('quit');
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(service.getState()).toBe('terminated');
  });
});
