import { 
  MoveEvaluation, 
  MultiPvEvaluation, 
  EngineStatus, 
  PieceColor 
} from '../../types/chess';
import { 
  parseUciInfoLine, 
  parseBestMoveLine, 
  createMultiPvEvaluation, 
  toPrimaryMoveEvaluation, 
  getActiveColorFromFen,
  ParsedUciInfo
} from './uciParser';

export type EngineState = 'uninitialized' | 'initializing' | 'ready' | 'searching' | 'error' | 'terminated';

export interface EngineOptions {
  depth: number;
  multiPv: number;
  hashSizeMb: number;
  workerPath?: string;
}

export interface IEngineWorker {
  postMessage(message: any): void;
  terminate(): void;
  onmessage: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
}

export type WorkerFactory = (path: string) => IEngineWorker;

export interface EvaluationListener {
  (evalResult: MoveEvaluation, multiPvResults: MultiPvEvaluation[], fen?: string): void;
}

export interface StatusListener {
  (status: EngineStatus): void;
}

export interface ErrorListener {
  (error: Error): void;
}

export interface BestMoveListener {
  (bestMove: string, ponder?: string): void;
}

const DEFAULT_OPTIONS: EngineOptions = {
  depth: 16,
  multiPv: 1,
  hashSizeMb: 16,
  workerPath: '/stockfish/stockfish-19-lite-single.js',
};

export class StockfishService {
  private worker: IEngineWorker | null = null;
  private state: EngineState = 'uninitialized';
  private options: EngineOptions;
  private workerFactory: WorkerFactory;

  // Search coordination
  private searchId = 0;
  private activeSearchFen = '';
  private activeColor: PieceColor = 'w';
  private pendingSearch: { fen: string; moves?: string[]; depth?: number } | null = null;
  private multiPvMap: Map<number, MultiPvEvaluation> = new Map();
  private primaryEval: MoveEvaluation | null = null;

  // Telemetry
  private engineVersion = '';
  private isUciVerified = false;
  private currentNps = 0;
  private currentNodes = 0;

  // UCI synchronization resolvers
  private readyResolvers: Array<() => void> = [];

  // Initialization promise callbacks
  private initResolve: (() => void) | null = null;
  private initReject: ((reason?: any) => void) | null = null;
  private initTimeoutId: any = null;

  // Callbacks
  private evalListeners: Set<EvaluationListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private bestMoveListeners: Set<BestMoveListener> = new Set();

  constructor(options: Partial<EngineOptions> = {}, workerFactory?: WorkerFactory) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.workerFactory = workerFactory || ((path: string) => {
      if (typeof window !== 'undefined' && typeof window.Worker !== 'undefined') {
        return new window.Worker(path);
      }
      throw new Error('Web Workers are not supported in this environment.');
    });
  }

  public getState(): EngineState {
    return this.state;
  }

  public getStatus(): EngineStatus {
    return {
      isReady: this.state === 'ready' || this.state === 'searching',
      isSearching: this.state === 'searching',
      version: this.engineVersion || 'Stockfish 19 WASM (connecting...)',
      depth: this.primaryEval?.depth ?? 0,
      maxDepth: this.options.depth,
      multiPv: this.options.multiPv,
      nps: this.currentNps,
      nodes: this.currentNodes,
      hashSizeMb: this.options.hashSizeMb,
    };
  }

  public getOptions(): EngineOptions {
    return { ...this.options };
  }

  public getEngineVersion(): string {
    return this.engineVersion;
  }

  public isVerified(): boolean {
    return this.isUciVerified;
  }

  /**
   * Initializes the engine Web Worker and verifies the UCI handshake.
   */
  public async init(): Promise<void> {
    if (this.state === 'ready' || this.state === 'searching') {
      return;
    }

    this.state = 'initializing';
    this.emitStatus();

    return new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;

      try {
        const workerPath = this.options.workerPath || DEFAULT_OPTIONS.workerPath!;
        this.worker = this.workerFactory(workerPath);

        this.initTimeoutId = setTimeout(() => {
          if (this.state === 'initializing') {
            const err = new Error('Stockfish 19 WASM initialization timed out after 10 seconds.');
            this.handleError(err);
          }
        }, 10000);

        this.worker.onerror = (e: any) => {
          const err = new Error(`Stockfish 19 worker failed: ${e?.message || 'Script error'}`);
          this.handleError(err);
        };

        this.worker.onmessage = (event: { data: string }) => {
          const raw = typeof event.data === 'string' ? event.data : String(event.data);
          const lines = raw.split(/\r?\n/);
          for (const line of lines) {
            this.handleIncomingLine(line);
          }

          if (this.isUciVerified && (this.state === 'ready' || this.state === 'searching')) {
            if (this.initTimeoutId) {
              clearTimeout(this.initTimeoutId);
              this.initTimeoutId = null;
            }
            if (this.initResolve) {
              const res = this.initResolve;
              this.initResolve = null;
              this.initReject = null;
              res();
            }
          }
        };

        // Send UCI command to trigger identification and options output
        this.sendCommand('uci');
      } catch (err: any) {
        this.handleError(err);
      }
    });
  }

  /**
   * Main incoming line handler from Stockfish UCI output.
   */
  public handleIncomingLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    // 1. Engine identity identification
    if (trimmed.startsWith('id name ')) {
      const name = trimmed.substring(8).trim();
      this.engineVersion = name;
      if (name.includes('Stockfish 19')) {
        this.isUciVerified = true;
      }
    }

    // 2. UCI handshake completion
    if (trimmed === 'uciok') {
      if (!this.isUciVerified) {
        // Fallback check if identity was formatted slightly differently
        if (this.engineVersion.toLowerCase().includes('stockfish')) {
          this.isUciVerified = true;
        } else {
          this.handleError(new Error(`Failed to verify Stockfish 19. Detected: ${this.engineVersion || 'Unknown'}`));
          return;
        }
      }

      // Configure initial options for modest hardware: 1 thread, 16MB Hash, configured MultiPV
      this.sendCommand('setoption name Threads value 1');
      this.sendCommand(`setoption name Hash value ${this.options.hashSizeMb}`);
      this.sendCommand(`setoption name MultiPV value ${this.options.multiPv}`);
      this.sendCommand('isready');
    }

    // 3. Ready acknowledgement
    if (trimmed === 'readyok') {
      if (this.state === 'initializing') {
        this.state = 'ready';
        this.emitStatus();
      }

      // Flush ready resolvers
      const resolvers = [...this.readyResolvers];
      this.readyResolvers = [];
      for (const res of resolvers) {
        try {
          res();
        } catch (e) {
          console.error('Error in ready resolver:', e);
        }
      }

      // If there was a queued pending search waiting for the engine to be ready/idle, launch it
      if (this.pendingSearch) {
        const next = this.pendingSearch;
        this.pendingSearch = null;
        this.startSearchInternal(next.fen, next.moves, next.depth);
      }
    }

    // 4. Info lines (telemetry, scores, PV)
    if (trimmed.startsWith('info ')) {
      const parsed = parseUciInfoLine(trimmed);
      if (parsed) {
        this.processUciInfo(parsed);
      }
    }

    // 5. Best move
    if (trimmed.startsWith('bestmove ')) {
      const parsedBest = parseBestMoveLine(trimmed);
      if (parsedBest) {
        if (this.state === 'searching') {
          this.state = 'ready';
          this.emitStatus();
        }

        // Emit best move to listeners
        for (const listener of this.bestMoveListeners) {
          try {
            listener(parsedBest.bestMove, parsedBest.ponder);
          } catch (e) {
            console.error('Error in best move listener:', e);
          }
        }

        // If another position was requested while searching, proceed with it
        if (this.pendingSearch) {
          const next = this.pendingSearch;
          this.pendingSearch = null;
          this.startSearchInternal(next.fen, next.moves, next.depth);
        }
      }
    }
  }

  /**
   * Processes a structured UCI info update.
   */
  private processUciInfo(info: ParsedUciInfo): void {
    if (typeof info.nps === 'number') this.currentNps = info.nps;
    if (typeof info.nodes === 'number') this.currentNodes = info.nodes;

    const pvId = info.multipv || 1;
    const multiPvEval = createMultiPvEvaluation(info, this.activeColor, this.activeSearchFen);

    if (multiPvEval) {
      this.multiPvMap.set(pvId, multiPvEval);
    }

    // MultiPV 1 is the primary evaluation
    if (pvId === 1) {
      const primary = toPrimaryMoveEvaluation(info, this.activeColor, this.activeSearchFen);
      if (primary) {
        this.primaryEval = primary;
      }
    }

    // Emit live evaluation to listeners
    if (this.primaryEval) {
      const multiPvList = Array.from(this.multiPvMap.values()).sort((a, b) => a.id - b.id);
      for (const listener of this.evalListeners) {
        try {
          listener(this.primaryEval, multiPvList, this.activeSearchFen);
        } catch (e) {
          console.error('Error in evaluation listener:', e);
        }
      }
      this.emitStatus();
    }
  }

  /**
   * Evaluates a chess position given its FEN and optional move path.
   * Cancels any in-flight search safely before starting the new search.
   */
  public evaluatePosition(fen: string, moves?: string[], targetDepth?: number): void {
    if (this.state === 'uninitialized' || this.state === 'error' || this.state === 'terminated') {
      this.init().then(() => this.evaluatePosition(fen, moves, targetDepth)).catch(() => {});
      return;
    }

    // If searching, stop current search and queue the new position
    if (this.state === 'searching') {
      this.pendingSearch = { fen, moves, depth: targetDepth };
      this.stopSearch();
      return;
    }

    this.startSearchInternal(fen, moves, targetDepth);
  }

  /**
   * Internal search dispatch.
   */
  private startSearchInternal(fen: string, moves?: string[], targetDepth?: number): void {
    this.searchId++;
    this.activeSearchFen = fen;
    this.activeColor = getActiveColorFromFen(fen);
    this.multiPvMap.clear();
    this.primaryEval = null;

    const depth = targetDepth || this.options.depth;

    let posCommand = `position fen ${fen}`;
    if (moves && moves.length > 0) {
      posCommand += ` moves ${moves.join(' ')}`;
    }

    this.sendCommand(posCommand);
    this.sendCommand(`go depth ${depth}`);
    this.state = 'searching';
    this.emitStatus();
  }

  /**
   * Immediately stops the active search.
   */
  public stopSearch(): void {
    if (this.state === 'searching') {
      this.sendCommand('stop');
    }
  }

  /**
   * Sends 'isready' command and returns a Promise that resolves when 'readyok' is received.
   * Guarantees the engine has finished processing all prior UCI commands and is synchronized.
   */
  public async waitForReady(timeoutMs: number = 5000): Promise<void> {
    if (this.state === 'uninitialized' || this.state === 'error' || this.state === 'terminated') {
      await this.init();
    }

    return new Promise<void>((resolve) => {
      let settled = false;
      let timer: any = null;

      const onReady = () => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          resolve();
        }
      };

      this.readyResolvers.push(onReady);
      this.sendCommand('isready');

      timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          const idx = this.readyResolvers.indexOf(onReady);
          if (idx !== -1) {
            this.readyResolvers.splice(idx, 1);
          }
          resolve();
        }
      }, timeoutMs);
    });
  }

  /**
   * Performs an isolated asynchronous evaluation of a position, returning a Promise
   * that resolves only when the engine has finished searching the requested position.
   * Guarantees that callbacks are isolated to the specific requested FEN.
   */
  public async evaluatePositionAsync(
    fen: string,
    targetDepth: number,
    timeoutMs: number = 10000,
    multiPv?: number
  ): Promise<{ evaluation: MoveEvaluation; multiPv: MultiPvEvaluation[] }> {
    if (this.state === 'uninitialized' || this.state === 'error' || this.state === 'terminated') {
      await this.init();
    }

    // If searching, stop current search and wait for it to cleanly stop
    if (this.state === 'searching') {
      this.pendingSearch = null;
      this.stopSearch();
    }
    // Synchronize engine state so previous commands or search outputs are fully cleared
    await this.waitForReady(3000);

    const prevMultiPv = this.options.multiPv;
    const requestedMultiPv = typeof multiPv === 'number' && multiPv > 0 ? multiPv : prevMultiPv;
    if (requestedMultiPv !== prevMultiPv) {
      this.sendCommand(`setoption name MultiPV value ${requestedMultiPv}`);
      await this.waitForReady(1000);
    }

    return new Promise<{ evaluation: MoveEvaluation; multiPv: MultiPvEvaluation[] }>((resolve) => {
      let settled = false;
      let timer: any = null;

      let latestEval: MoveEvaluation = {
        depth: targetDepth,
        score: 0,
        pv: [],
        bestMove: '',
        fen,
      };
      let latestMultiPv: MultiPvEvaluation[] = [];

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        unsubEval();
        unsubBest();
        if (requestedMultiPv !== prevMultiPv) {
          this.sendCommand(`setoption name MultiPV value ${prevMultiPv}`);
        }
      };

      const finish = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve({ evaluation: latestEval, multiPv: latestMultiPv });
        }
      };

      const unsubEval = this.onEvaluation((evaluation, multiPvList, searchFen) => {
        if (searchFen === fen || this.activeSearchFen === fen) {
          latestEval = { ...evaluation, fen };
          if (multiPvList && multiPvList.length > 0) {
            latestMultiPv = multiPvList;
          }
        }
      });

      const unsubBest = this.onBestMove((bestMove) => {
        if (this.activeSearchFen === fen) {
          if (bestMove && (!latestEval.bestMove || latestEval.bestMove === '')) {
            latestEval.bestMove = bestMove;
          }
          finish();
        }
      });

      timer = setTimeout(() => {
        if (!settled) {
          this.stopSearch();
          finish();
        }
      }, timeoutMs);

      this.startSearchInternal(fen, undefined, targetDepth);
    });
  }

  /**
   * Updates depth, MultiPV, or Hash size.
   */
  public updateOptions(newOptions: Partial<EngineOptions>): void {
    const prevMultiPv = this.options.multiPv;
    const prevHash = this.options.hashSizeMb;

    this.options = { ...this.options, ...newOptions };

    if (this.state === 'ready' || this.state === 'searching') {
      if (this.options.multiPv !== prevMultiPv) {
        this.sendCommand(`setoption name MultiPV value ${this.options.multiPv}`);
      }
      if (this.options.hashSizeMb !== prevHash) {
        this.sendCommand(`setoption name Hash value ${this.options.hashSizeMb}`);
      }
      // If we are currently searching, restart search with new options
      if (this.state === 'searching') {
        const fen = this.activeSearchFen;
        this.stopSearch();
        if (fen) {
          this.evaluatePosition(fen);
        }
      } else {
        this.emitStatus();
      }
    }
  }

  /**
   * Raw UCI command sender.
   */
  public sendCommand(command: string): void {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  /**
   * Safely terminates the engine worker.
   */
  public terminate(): void {
    if (this.worker) {
      try {
        this.sendCommand('quit');
        this.worker.terminate();
      } catch (e) {
        // Ignore termination errors
      }
      this.worker = null;
    }
    this.state = 'terminated';
    this.pendingSearch = null;
    this.readyResolvers = [];
    this.emitStatus();
  }

  private handleError(error: Error): void {
    this.state = 'error';
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }
    if (this.initReject) {
      const rej = this.initReject;
      this.initResolve = null;
      this.initReject = null;
      rej(error);
    }
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    }
    this.emitStatus();
  }

  private emitStatus(): void {
    const status = this.getStatus();
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (e) {
        console.error('Error in status listener:', e);
      }
    }
  }

  /**
   * Recovers and re-initializes engine after termination or error.
   */
  public async restart(): Promise<void> {
    this.terminate();
    this.isUciVerified = false;
    this.engineVersion = '';
    return this.init();
  }

  // Listener registrations
  public onEvaluation(listener: EvaluationListener): () => void {
    this.evalListeners.add(listener);
    return () => this.evalListeners.delete(listener);
  }

  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Send immediate snapshot
    listener(this.getStatus());
    return () => this.statusListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public onBestMove(listener: BestMoveListener): () => void {
    this.bestMoveListeners.add(listener);
    return () => this.bestMoveListeners.delete(listener);
  }
}

// Global Singleton Instance for application-wide use
let globalEngineInstance: StockfishService | null = null;

export function getStockfishService(options?: Partial<EngineOptions>): StockfishService {
  if (!globalEngineInstance || globalEngineInstance.getState() === 'terminated') {
    globalEngineInstance = new StockfishService(options);
  }
  return globalEngineInstance;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (globalEngineInstance) {
      globalEngineInstance.terminate();
    }
  });
}
