import { Chess, PieceSymbol } from 'chess.js';
import { GamePhase } from '../../types/chess';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

/**
 * Evaluates the game phase (Opening, Middlegame, Endgame) of a chess position
 * based on concrete chess piece count, development, and material criteria:
 * 
 * - Endgame:
 *   1. Both queens are off the board, OR
 *   2. Neither side has more than 13 points of non-pawn material (e.g. Rook + Knight + Bishop = 11 pts), OR
 *   3. Total minor + major pieces remaining on the entire board <= 6 pieces.
 * 
 * - Opening:
 *   1. If not Endgame, AND
 *   2. Move number <= 10, OR
 *   3. More than 4 total minor pieces (Knights/Bishops) remain on their back rank squares.
 * 
 * - Middlegame:
 *   All positions between Opening and Endgame.
 */
export function detectGamePhase(fen: string): GamePhase {
  try {
    const chess = new Chess(fen);
    const board = chess.board();

    let whiteQueens = 0;
    let blackQueens = 0;
    let whiteNonPawnMaterial = 0;
    let blackNonPawnMaterial = 0;
    let totalPiecesCount = 0;
    let undevelopingMinorPieces = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        if (piece.type !== 'p' && piece.type !== 'k') {
          totalPiecesCount++;
          const val = PIECE_VALUES[piece.type] || 0;
          if (piece.color === 'w') {
            whiteNonPawnMaterial += val;
            if (piece.type === 'q') whiteQueens++;
            // Check if White minor pieces are still on starting squares (b1, c1, f1, g1)
            if (r === 7 && (piece.type === 'n' || piece.type === 'b')) {
              if (c === 1 || c === 2 || c === 5 || c === 6) undevelopingMinorPieces++;
            }
          } else {
            blackNonPawnMaterial += val;
            if (piece.type === 'q') blackQueens++;
            // Check if Black minor pieces are still on starting squares (b8, c8, f8, g8)
            if (r === 0 && (piece.type === 'n' || piece.type === 'b')) {
              if (c === 1 || c === 2 || c === 5 || c === 6) undevelopingMinorPieces++;
            }
          }
        }
      }
    }

    // 1. Endgame criteria
    const bothQueensOff = whiteQueens === 0 && blackQueens === 0;
    const lowMaterial = whiteNonPawnMaterial <= 13 && blackNonPawnMaterial <= 13;
    const fewPieces = totalPiecesCount <= 6;

    if (bothQueensOff || lowMaterial || fewPieces) {
      return 'endgame';
    }

    // 2. Opening criteria
    // Parse move number from FEN (last token)
    const tokens = fen.trim().split(/\s+/);
    const fullMoveNumber = tokens.length >= 6 ? parseInt(tokens[5], 10) : 1;

    if (fullMoveNumber <= 10 || undevelopingMinorPieces >= 4) {
      return 'opening';
    }

    // 3. Otherwise Middlegame
    return 'middlegame';
  } catch (e) {
    return 'middlegame';
  }
}
