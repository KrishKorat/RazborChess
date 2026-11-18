import { Chess, Square } from 'chess.js';
import { GameMetadata } from '../../types/chess';

export interface PlayedMove {
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  from: string;
  to: string;
  san: string;
  uci: string;
  promotion?: string;
  captured?: string;
  fenBefore: string;
  fenAfter: string;
  isCheck: boolean;
  isCheckmate: boolean;
}

export class GameManager {
  private initialFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  private moves: PlayedMove[] = [];
  private currentPly: number = 0;
  private metadata: GameMetadata = {};

  constructor(startingFen?: string) {
    if (startingFen) {
      this.initialFen = startingFen;
    }
  }

  /**
   * Returns FEN at current ply.
   */
  public getFen(): string {
    if (this.currentPly === 0) {
      return this.initialFen;
    }
    const move = this.moves[this.currentPly - 1];
    return move ? move.fenAfter : this.initialFen;
  }

  /**
   * Returns current Chess instance representing the position at currentPly.
   */
  public getChessInstance(): Chess {
    const chess = new Chess(this.initialFen);
    for (let i = 0; i < this.currentPly; i++) {
      const m = this.moves[i];
      chess.move({
        from: m.from,
        to: m.to,
        promotion: m.promotion,
      });
    }
    return chess;
  }

  public getMoves(): PlayedMove[] {
    return [...this.moves];
  }

  public getCurrentPly(): number {
    return this.currentPly;
  }

  public getMetadata(): GameMetadata {
    return { ...this.metadata };
  }

  public setMetadata(meta: Partial<GameMetadata>): void {
    this.metadata = { ...this.metadata, ...meta };
  }

  /**
   * Validates and makes a move from current position.
   * If currentPly is in the middle of history, future moves are branched/truncated.
   */
  public makeMove(from: string, to: string, promotion?: string): PlayedMove | null {
    const chess = this.getChessInstance();
    const fenBefore = chess.fen();
    const activeColor = chess.turn();

    try {
      const result = chess.move({
        from,
        to,
        promotion: promotion || undefined,
      });

      if (!result) return null;

      const fenAfter = chess.fen();
      const moveNumber = Math.floor(this.currentPly / 2) + 1;
      const uci = `${from}${to}${result.promotion || ''}`;

      const playedMove: PlayedMove = {
        ply: this.currentPly + 1,
        moveNumber,
        color: activeColor,
        from: result.from,
        to: result.to,
        san: result.san,
        uci,
        promotion: result.promotion,
        captured: result.captured,
        fenBefore,
        fenAfter,
        isCheck: chess.inCheck(),
        isCheckmate: chess.isCheckmate(),
      };

      // Truncate future moves if playing from past position
      this.moves = this.moves.slice(0, this.currentPly);
      this.moves.push(playedMove);
      this.currentPly = this.moves.length;

      return playedMove;
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if a move requires pawn promotion.
   */
  public isPromotionMove(from: string, to: string): boolean {
    const chess = this.getChessInstance();
    const piece = chess.get(from as Square);
    if (!piece || piece.type !== 'p') return false;

    // White pawn reaching 8th rank
    if (piece.color === 'w' && from[1] === '7' && to[1] === '8') {
      const legalMoves = chess.moves({ square: from as Square, verbose: true });
      return legalMoves.some((m) => m.to === to && m.promotion);
    }
    // Black pawn reaching 1st rank
    if (piece.color === 'b' && from[1] === '2' && to[1] === '1') {
      const legalMoves = chess.moves({ square: from as Square, verbose: true });
      return legalMoves.some((m) => m.to === to && m.promotion);
    }
    return false;
  }

  /**
   * Returns list of legal destination squares for a given source square.
   */
  public getLegalMovesForSquare(square: string): string[] {
    const chess = this.getChessInstance();
    const moves = chess.moves({ square: square as Square, verbose: true });
    return moves.map((m) => m.to);
  }

  /**
   * Returns square of the King for the current side to move (or checked king).
   */
  public getKingSquare(color: 'w' | 'b'): string | null {
    const chess = this.getChessInstance();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === color) {
          return piece.square;
        }
      }
    }
    return null;
  }

  public isCheck(): boolean {
    return this.getChessInstance().inCheck();
  }

  public isCheckmate(): boolean {
    return this.getChessInstance().isCheckmate();
  }

  public isDraw(): boolean {
    return this.getChessInstance().isDraw();
  }

  public isStalemate(): boolean {
    return this.getChessInstance().isStalemate();
  }

  // Navigation methods
  public goToPly(ply: number): void {
    const clamped = Math.max(0, Math.min(ply, this.moves.length));
    this.currentPly = clamped;
  }

  public goToFirst(): void {
    this.goToPly(0);
  }

  public goToPrev(): void {
    this.goToPly(this.currentPly - 1);
  }

  public goToNext(): void {
    this.goToPly(this.currentPly + 1);
  }

  public goToLast(): void {
    this.goToPly(this.moves.length);
  }

  public resetGame(startingFen?: string): void {
    this.initialFen = startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.moves = [];
    this.currentPly = 0;
    this.metadata = {};
  }

  /**
   * Imports a PGN string safely into the game manager.
   */
  public importPgn(pgn: string): { success: boolean; error?: string } {
    try {
      const trimmed = pgn.trim();
      if (!trimmed) {
        return { success: false, error: 'PGN text cannot be empty.' };
      }

      const tempChess = new Chess();
      tempChess.loadPgn(trimmed, { strict: false });

      // Extract metadata headers
      const headers = tempChess.header();
      this.metadata = {
        white: headers['White'] || 'White',
        black: headers['Black'] || 'Black',
        event: headers['Event'] || undefined,
        site: headers['Site'] || undefined,
        date: headers['Date'] || undefined,
        round: headers['Round'] || undefined,
        result: headers['Result'] || '*',
        whiteElo: headers['WhiteElo'] || undefined,
        blackElo: headers['BlackElo'] || undefined,
      };

      // Extract moves sequentially
      const historyVerbose = tempChess.history({ verbose: true });
      const replayChess = new Chess();
      const loadedMoves: PlayedMove[] = [];

      for (let i = 0; i < historyVerbose.length; i++) {
        const step = historyVerbose[i];
        const fenBefore = replayChess.fen();
        const res = replayChess.move({
          from: step.from,
          to: step.to,
          promotion: step.promotion,
        });

        if (!res) {
          return { success: false, error: `Invalid move at ply ${i + 1}: ${step.san}` };
        }

        const fenAfter = replayChess.fen();
        loadedMoves.push({
          ply: i + 1,
          moveNumber: Math.floor(i / 2) + 1,
          color: step.color,
          from: step.from,
          to: step.to,
          san: step.san,
          uci: `${step.from}${step.to}${step.promotion || ''}`,
          promotion: step.promotion,
          captured: step.captured,
          fenBefore,
          fenAfter,
          isCheck: replayChess.inCheck(),
          isCheckmate: replayChess.isCheckmate(),
        });
      }

      this.initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      this.moves = loadedMoves;
      this.currentPly = this.moves.length;

      return { success: true };
    } catch (err: any) {
      return { success: false, error: `Failed to parse PGN: ${err.message || 'Syntax error'}` };
    }
  }

  /**
   * Imports a FEN string as a custom starting position.
   */
  public importFen(fen: string): { success: boolean; error?: string } {
    try {
      const trimmed = fen.trim();
      const testChess = new Chess(trimmed);
      this.resetGame(testChess.fen());
      return { success: true };
    } catch (err: any) {
      return { success: false, error: `Invalid FEN string: ${err.message || 'Malformed FEN'}` };
    }
  }

  /**
   * Exports the current game as standard PGN.
   */
  public exportPgn(): string {
    const exportChess = new Chess(this.initialFen);

    // Set headers
    if (this.metadata.event) exportChess.header('Event', this.metadata.event);
    if (this.metadata.site) exportChess.header('Site', this.metadata.site);
    if (this.metadata.date) exportChess.header('Date', this.metadata.date);
    if (this.metadata.round) exportChess.header('Round', this.metadata.round);
    exportChess.header('White', this.metadata.white || 'Player 1');
    exportChess.header('Black', this.metadata.black || 'Player 2');
    exportChess.header('Result', this.metadata.result || '*');
    if (this.metadata.whiteElo) exportChess.header('WhiteElo', this.metadata.whiteElo);
    if (this.metadata.blackElo) exportChess.header('BlackElo', this.metadata.blackElo);

    for (const m of this.moves) {
      exportChess.move({
        from: m.from,
        to: m.to,
        promotion: m.promotion,
      });
    }

    return exportChess.pgn();
  }
}
