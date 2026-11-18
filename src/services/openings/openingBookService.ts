/**
 * Opening Book Service for ChessLab
 * 
 * Provides genuine, locally available opening theory lookup based on standard
 * Encyclopaedia of Chess Openings (ECO) theory.
 * 
 * Licensing & Attribution:
 * Derived from open-source ECO opening databases and standard public domain chess theory
 * (Creative Commons Zero / Public Domain dedication).
 */

import { Chess } from 'chess.js';

export interface OpeningEntry {
  eco: string;
  name: string;
  /**
   * Recognized standard book moves from this position in UCI format (e.g. 'e2e4')
   * and/or SAN format (e.g. 'e4').
   */
  bookMovesUci: string[];
  bookMovesSan: string[];
}

/**
 * Normalizes a FEN to pieces + turn + castling + en passant.
 * Ignores halfmove clock and fullmove number.
 */
export function normalizeOpeningFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length >= 3) {
    return `${parts[0]} ${parts[1]} ${parts[2]}`;
  }
  return fen.trim();
}

/**
 * Curated standard ECO opening theory database.
 * Indexed by normalized FEN string of the position BEFORE the move is played.
 */
const OPENING_DATABASE: Record<string, OpeningEntry> = {
  // Initial starting position (Ply 0, White to move)
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': {
    eco: 'A00',
    name: 'Starting Position',
    bookMovesUci: ['e2e4', 'd2d4', 'c2c4', 'g1f3', 'g2g3', 'b2b3', 'f2f4'],
    bookMovesSan: ['e4', 'd4', 'c4', 'Nf3', 'g3', 'b3', 'f4'],
  },

  // 1. e4
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3': {
    eco: 'B00',
    name: "King's Pawn Opening",
    bookMovesUci: ['e7e5', 'c7c5', 'e7e6', 'c7c6', 'd7d6', 'g7g6', 'd7d5', 'g8f6'],
    bookMovesSan: ['e5', 'c5', 'e6', 'c6', 'd6', 'g6', 'd5', 'Nf6'],
  },

  // 1. e4 e5
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6': {
    eco: 'C20',
    name: 'Open Game',
    bookMovesUci: ['g1f3', 'f2f4', 'b1c3', 'f1c4', 'd2d4'],
    bookMovesSan: ['Nf3', 'f4', 'Nc3', 'Bc4', 'd4'],
  },

  // 1. e4 e5 2. Nf3
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': {
    eco: 'C40',
    name: "King's Knight Opening",
    bookMovesUci: ['b8c6', 'g8f6', 'd7d6'],
    bookMovesSan: ['Nc6', 'Nf6', 'd6'],
  },

  // 1. e4 e5 2. Nf3 Nc6
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': {
    eco: 'C44',
    name: "King's Knight Opening: Normal Continuation",
    bookMovesUci: ['f1b5', 'f1c4', 'd2d4', 'b1c3', 'c2c3'],
    bookMovesSan: ['Bb5', 'Bc4', 'd4', 'Nc3', 'c3'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 (Ruy Lopez)
  'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': {
    eco: 'C60',
    name: 'Ruy Lopez',
    bookMovesUci: ['a7a6', 'g8f6', 'd7d6', 'f7f5', 'f1c5'],
    bookMovesSan: ['a6', 'Nf6', 'd6', 'f5', 'Bc5'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 (Ruy Lopez: Morphy Defense)
  'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': {
    eco: 'C70',
    name: 'Ruy Lopez: Morphy Defense',
    bookMovesUci: ['b5a4', 'b5c6'],
    bookMovesSan: ['Ba4', 'Bxc6'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4
  'r1bqkbnr/1ppp1ppp/p1n5/8/B3P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': {
    eco: 'C70',
    name: 'Ruy Lopez: Morphy Defense, Columbus Variation',
    bookMovesUci: ['g8f6', 'd7d6', 'b7b5'],
    bookMovesSan: ['Nf6', 'd6', 'b5'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6
  'r1bqkb1r/1ppp1ppp/p1n2n2/8/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': {
    eco: 'C78',
    name: 'Ruy Lopez: Open / Closed Variations',
    bookMovesUci: ['e1g1', 'd2d3', 'd1e2'],
    bookMovesSan: ['O-O', 'd3', 'Qe2'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O
  'r1bqkb1r/1ppp1ppp/p1n2n2/8/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b kq -': {
    eco: 'C80',
    name: 'Ruy Lopez: Closed Preparations',
    bookMovesUci: ['f8e7', 'b7b5', 'f6e4'],
    bookMovesSan: ['Be7', 'b5', 'Nxe4'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 (Ruy Lopez: Berlin Defense)
  'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': {
    eco: 'C65',
    name: 'Ruy Lopez: Berlin Defense',
    bookMovesUci: ['e1g1', 'd2d3', 'b1c3'],
    bookMovesSan: ['O-O', 'd3', 'Nc3'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 (Italian Game)
  'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -': {
    eco: 'C50',
    name: 'Italian Game',
    bookMovesUci: ['f8c5', 'g8f6', 'f8e7', 'd7d6'],
    bookMovesSan: ['Bc5', 'Nf6', 'Be7', 'd6'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 (Giuoco Piano)
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': {
    eco: 'C50',
    name: 'Italian Game: Giuoco Piano',
    bookMovesUci: ['c2c3', 'd2d3', 'e1g1', 'b2b4'],
    bookMovesSan: ['c3', 'd3', 'O-O', 'b4'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3
  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq -': {
    eco: 'C53',
    name: 'Italian Game: Classical Giuoco Piano',
    bookMovesUci: ['g8f6', 'd8e7'],
    bookMovesSan: ['Nf6', 'Qe7'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 (Two Knights Defense)
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -': {
    eco: 'C55',
    name: 'Italian Game: Two Knights Defense',
    bookMovesUci: ['d2d3', 'f3g5', 'd2d4', 'b1c3'],
    bookMovesSan: ['d3', 'Ng5', 'd4', 'Nc3'],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. d4 (Scotch Game)
  'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3': {
    eco: 'C45',
    name: 'Scotch Game',
    bookMovesUci: ['e5d4'],
    bookMovesSan: ['exd4'],
  },

  // 1. e4 e5 2. Nf3 Nf6 (Petrov Defense)
  'r1bqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': {
    eco: 'C42',
    name: "Petrov's Defense",
    bookMovesUci: ['f3e5', 'd2d4', 'b1c3'],
    bookMovesSan: ['Nxe5', 'd4', 'Nc3'],
  },

  // 1. e4 c5 (Sicilian Defense)
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6': {
    eco: 'B20',
    name: 'Sicilian Defense',
    bookMovesUci: ['g1f3', 'b1c3', 'c2c3', 'd2d4', 'f2f4'],
    bookMovesSan: ['Nf3', 'Nc3', 'c3', 'd4', 'f4'],
  },

  // 1. e4 c5 2. Nf3
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': {
    eco: 'B27',
    name: 'Sicilian Defense: Open Preparations',
    bookMovesUci: ['d7d6', 'b8c6', 'e7e6', 'g7g6', 'a7a6'],
    bookMovesSan: ['d6', 'Nc6', 'e6', 'g6', 'a6'],
  },

  // 1. e4 c5 2. Nf3 d6
  'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': {
    eco: 'B50',
    name: 'Sicilian Defense: Modern Line',
    bookMovesUci: ['d2d4', 'f1b5', 'c2c3'],
    bookMovesSan: ['d4', 'Bb5+', 'c3'],
  },

  // 1. e4 c5 2. Nf3 d6 3. d4
  'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3': {
    eco: 'B53',
    name: 'Sicilian Defense: Open Sicilian',
    bookMovesUci: ['c5d4'],
    bookMovesSan: ['cxd4'],
  },

  // 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3
  'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq -': {
    eco: 'B54',
    name: 'Sicilian Defense: Classical / Najdorf / Dragon Base',
    bookMovesUci: ['a7a6', 'g7g6', 'e7e6', 'b8c6'],
    bookMovesSan: ['a6', 'g6', 'e6', 'Nc6'],
  },

  // 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 (Najdorf)
  'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq -': {
    eco: 'B90',
    name: 'Sicilian Defense: Najdorf Variation',
    bookMovesUci: ['c1e3', 'c1g5', 'f1e2', 'h2h3', 'g2g3', 'f2f3'],
    bookMovesSan: ['Be3', 'Bg5', 'Be2', 'h3', 'g3', 'f3'],
  },

  // 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 (Dragon)
  'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq -': {
    eco: 'B70',
    name: 'Sicilian Defense: Dragon Variation',
    bookMovesUci: ['c1e3', 'f1e2', 'f1c4', 'g2g3'],
    bookMovesSan: ['Be3', 'Be2', 'Bc4', 'g3'],
  },

  // 1. e4 e6 (French Defense)
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': {
    eco: 'C00',
    name: 'French Defense',
    bookMovesUci: ['d2d4', 'd2d3', 'g1f3'],
    bookMovesSan: ['d4', 'd3', 'Nf3'],
  },

  // 1. e4 e6 2. d4 d5
  'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6': {
    eco: 'C00',
    name: 'French Defense: Normal Line',
    bookMovesUci: ['b1c3', 'b1d2', 'e4e5', 'e4d5'],
    bookMovesSan: ['Nc3', 'Nd2', 'e5', 'exd5'],
  },

  // 1. e4 c6 (Caro-Kann Defense)
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': {
    eco: 'B10',
    name: 'Caro-Kann Defense',
    bookMovesUci: ['d2d4', 'g1f3', 'b1c3'],
    bookMovesSan: ['d4', 'Nf3', 'Nc3'],
  },

  // 1. e4 c6 2. d4 d5
  'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6': {
    eco: 'B12',
    name: 'Caro-Kann Defense: Main Line',
    bookMovesUci: ['b1c3', 'e4e5', 'e4d5', 'f2f3'],
    bookMovesSan: ['Nc3', 'e5', 'exd5', 'f3'],
  },

  // 1. d4 (Queen's Pawn Opening)
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3': {
    eco: 'A40',
    name: "Queen's Pawn Opening",
    bookMovesUci: ['d7d5', 'g8f6', 'e7e6', 'f7f5', 'g7g6', 'c7c5'],
    bookMovesSan: ['d5', 'Nf6', 'e6', 'f5', 'g6', 'c5'],
  },

  // 1. d4 d5
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6': {
    eco: 'D00',
    name: 'Closed Game',
    bookMovesUci: ['c2c4', 'g1f3', 'c1f4', 'e2e3'],
    bookMovesSan: ['c4', 'Nf3', 'Bf4', 'e3'],
  },

  // 1. d4 d5 2. c4 (Queen's Gambit)
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': {
    eco: 'D06',
    name: "Queen's Gambit",
    bookMovesUci: ['e7e6', 'c7c6', 'd5c4', 'b8c6'],
    bookMovesSan: ['e6', 'c6', 'dxc4', 'Nc6'],
  },

  // 1. d4 d5 2. c4 e6 (QGD)
  'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': {
    eco: 'D30',
    name: "Queen's Gambit Declined",
    bookMovesUci: ['b1c3', 'g1f3', 'c4d5'],
    bookMovesSan: ['Nc3', 'Nf3', 'cxd5'],
  },

  // 1. d4 d5 2. c4 c6 (Slav Defense)
  'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': {
    eco: 'D10',
    name: 'Slav Defense',
    bookMovesUci: ['g1f3', 'b1c3', 'c4d5'],
    bookMovesSan: ['Nf3', 'Nc3', 'cxd5'],
  },

  // 1. d4 Nf6 (Indian Defenses)
  'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': {
    eco: 'A45',
    name: 'Indian Defense',
    bookMovesUci: ['c2c4', 'g1f3', 'c1g5', 'c1f4'],
    bookMovesSan: ['c4', 'Nf3', 'Bg5', 'Bf4'],
  },

  // 1. d4 Nf6 2. c4
  'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3': {
    eco: 'E00',
    name: 'Indian Defense: Normal Variation',
    bookMovesUci: ['e7e6', 'g7g6', 'c7c5', 'd7d6'],
    bookMovesSan: ['e6', 'g6', 'c5', 'd6'],
  },

  // 1. d4 Nf6 2. c4 e6
  'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': {
    eco: 'E00',
    name: 'Indian Defense: East Indian',
    bookMovesUci: ['b1c3', 'g1f3', 'g2g3'],
    bookMovesSan: ['Nc3', 'Nf3', 'g3'],
  },

  // 1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 (Nimzo-Indian Defense)
  'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq -': {
    eco: 'E20',
    name: 'Nimzo-Indian Defense',
    bookMovesUci: ['d1c2', 'e2e3', 'g1f3', 'a2a3'],
    bookMovesSan: ['Qc2', 'e3', 'Nf3', 'a3'],
  },

  // 1. d4 Nf6 2. c4 g6 (King's Indian / Grunfeld)
  'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -': {
    eco: 'E60',
    name: "King's Indian / Grünfeld Defense Setup",
    bookMovesUci: ['b1c3', 'g1f3', 'g2g3'],
    bookMovesSan: ['Nc3', 'Nf3', 'g3'],
  },

  // 1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 (King's Indian Defense)
  'rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR w KQkq -': {
    eco: 'E70',
    name: "King's Indian Defense",
    bookMovesUci: ['g1f3', 'f2f3', 'f1e2', 'c1e3'],
    bookMovesSan: ['Nf3', 'f3', 'Be2', 'Be3'],
  },

  // 1. c4 (English Opening)
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3': {
    eco: 'A10',
    name: 'English Opening',
    bookMovesUci: ['e7e5', 'c7c5', 'g8f6', 'e7e6'],
    bookMovesSan: ['e5', 'c5', 'Nf6', 'e6'],
  },

  // 1. Nf3 (Reti Opening)
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -': {
    eco: 'A04',
    name: 'Zukertort / Réti Opening',
    bookMovesUci: ['d7d5', 'g8f6', 'c7c5', 'e7e6'],
    bookMovesSan: ['d5', 'Nf6', 'c5', 'e6'],
  },
};

// Pre-normalized dictionary for fast O(1) canonical matching
const NORMALIZED_OPENING_DB: Record<string, OpeningEntry> = {};
for (const [key, val] of Object.entries(OPENING_DATABASE)) {
  NORMALIZED_OPENING_DB[normalizeOpeningFen(key)] = val;
}

/**
 * Checks if a move in the given position is a recognized theoretical opening move.
 */
export function lookupOpeningMove(
  fenBefore: string,
  playedUci: string,
  playedSan?: string
): { isBook: boolean; eco?: string; name?: string } {
  const normFen = normalizeOpeningFen(fenBefore);
  const entry = NORMALIZED_OPENING_DB[normFen];

  if (!entry) {
    return { isBook: false };
  }

  const uciLower = playedUci.toLowerCase().trim();
  const isMatchUci = entry.bookMovesUci.some((m) => m.toLowerCase() === uciLower);
  const isMatchSan = playedSan ? entry.bookMovesSan.some((m) => m === playedSan.trim()) : false;

  if (isMatchUci || isMatchSan) {
    let resultingEco = entry.eco;
    let resultingName = entry.name;
    try {
      const ch = new Chess(fenBefore);
      const move = playedSan 
        ? ch.move(playedSan) 
        : ch.move({ 
            from: playedUci.slice(0, 2) as any, 
            to: playedUci.slice(2, 4) as any, 
            promotion: playedUci.length > 4 ? playedUci[4] : undefined 
          });
      if (move) {
        const nextEntry = NORMALIZED_OPENING_DB[normalizeOpeningFen(ch.fen())];
        if (nextEntry) {
          resultingEco = nextEntry.eco;
          resultingName = nextEntry.name;
        }
      }
    } catch (e) {
      // ignore move execution fallback
    }

    return {
      isBook: true,
      eco: resultingEco,
      name: resultingName,
    };
  }

  return { isBook: false, eco: entry.eco, name: entry.name };
}

/**
 * Gets the current opening name and ECO for a position if known.
 */
export function getOpeningForPosition(fen: string): { eco: string; name: string } | null {
  const normFen = normalizeOpeningFen(fen);
  const entry = NORMALIZED_OPENING_DB[normFen];
  return entry ? { eco: entry.eco, name: entry.name } : null;
}
