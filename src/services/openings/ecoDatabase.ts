/**
 * ECO Chess Opening Database for BoardScope
 * 
 * Licensing & Attribution:
 * Derived from open-source ECO opening databases (Scid and Lichess chess-openings dataset).
 * Distributed under the Creative Commons Zero (CC0 1.0 Universal) Public Domain Dedication.
 * 
 * Offline, client-side, self-contained dataset with zero external network dependencies.
 */

export interface RawOpeningRecord {
  eco: string;
  name: string;
  variation?: string;
  moves: string; // SAN move sequence, e.g. "e4 c6 d4 d5"
}

export const ECO_OPENINGS: RawOpeningRecord[] = [
  // --- 1. King's Pawn Openings (1. e4) ---
  { eco: 'B00', name: "King's Pawn Opening", moves: 'e4' },

  // Caro-Kann Defense (B10 - B19)
  { eco: 'B10', name: 'Caro-Kann Defense', moves: 'e4 c6' },
  { eco: 'B10', name: 'Caro-Kann Defense', variation: 'Modern / Two Knights Line', moves: 'e4 c6 Nf3 d5' },
  { eco: 'B12', name: 'Caro-Kann Defense', moves: 'e4 c6 d4 d5' },
  { eco: 'B12', name: 'Caro-Kann Defense', variation: 'Advance Variation', moves: 'e4 c6 d4 d5 e5' },
  { eco: 'B12', name: 'Caro-Kann Defense', variation: 'Fantasy Variation', moves: 'e4 c6 d4 d5 f3' },
  { eco: 'B13', name: 'Caro-Kann Defense', variation: 'Exchange Variation', moves: 'e4 c6 d4 d5 exd5 cxd5' },
  { eco: 'B13', name: 'Caro-Kann Defense', variation: 'Panov-Botvinnik Attack', moves: 'e4 c6 d4 d5 exd5 cxd5 c4' },
  { eco: 'B14', name: 'Caro-Kann Defense', variation: 'Panov-Botvinnik, Main Line', moves: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6' },
  { eco: 'B15', name: 'Caro-Kann Defense', variation: 'Main Line', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4' },
  { eco: 'B16', name: 'Caro-Kann Defense', variation: 'Bronstein-Larsen Variation', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6' },
  { eco: 'B17', name: 'Caro-Kann Defense', variation: 'Steinitz / Karpov Variation', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7' },
  { eco: 'B18', name: 'Caro-Kann Defense', variation: 'Classical Variation', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5' },
  { eco: 'B19', name: 'Caro-Kann Defense', variation: 'Classical, Main Line', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7' },

  // Scandinavian Defense (B01)
  { eco: 'B01', name: 'Scandinavian Defense', moves: 'e4 d5' },
  { eco: 'B01', name: 'Scandinavian Defense', variation: 'Mieses-Kotroc Variation', moves: 'e4 d5 exd5 Qxd5' },
  { eco: 'B01', name: 'Scandinavian Defense', variation: 'Main Line', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5' },
  { eco: 'B01', name: 'Scandinavian Defense', variation: 'Modern Variation', moves: 'e4 d5 exd5 Nf6' },
  { eco: 'B01', name: 'Scandinavian Defense', variation: 'Icelandic Gambit', moves: 'e4 d5 exd5 Nf6 c4 e6' },

  // Alekhine's Defense (B02 - B05)
  { eco: 'B02', name: "Alekhine's Defense", moves: 'e4 Nf6' },
  { eco: 'B03', name: "Alekhine's Defense", variation: 'Four Pawns Attack', moves: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4' },
  { eco: 'B04', name: "Alekhine's Defense", variation: 'Modern Variation', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3' },

  // Pirc & Modern Defense (B06 - B09)
  { eco: 'B06', name: 'Modern Defense', moves: 'e4 g6' },
  { eco: 'B06', name: 'Modern Defense', variation: 'Standard Line', moves: 'e4 g6 d4 Bg7' },
  { eco: 'B07', name: 'Pirc Defense', moves: 'e4 d6 d4 Nf6 Nc3 g6' },
  { eco: 'B08', name: 'Pirc Defense', variation: 'Classical System', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7' },
  { eco: 'B09', name: 'Pirc Defense', variation: 'Austrian Attack', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7' },

  // Sicilian Defense (B20 - B99)
  { eco: 'B20', name: 'Sicilian Defense', moves: 'e4 c5' },
  { eco: 'B20', name: 'Sicilian Defense', variation: 'Bowdler Attack', moves: 'e4 c5 Bc4' },
  { eco: 'B21', name: 'Sicilian Defense', variation: 'Smith-Morra Gambit', moves: 'e4 c5 d4 cxd4 c3' },
  { eco: 'B21', name: 'Sicilian Defense', variation: 'Grand Prix Attack', moves: 'e4 c5 f4' },
  { eco: 'B22', name: 'Sicilian Defense', variation: 'Alapin Variation', moves: 'e4 c5 c3' },
  { eco: 'B23', name: 'Sicilian Defense', variation: 'Closed Variation', moves: 'e4 c5 Nc3' },
  { eco: 'B27', name: 'Sicilian Defense', variation: 'Open Preparations', moves: 'e4 c5 Nf3' },
  { eco: 'B30', name: 'Sicilian Defense', variation: 'Nf3 Line', moves: 'e4 c5 Nf3 Nc6' },
  { eco: 'B31', name: 'Sicilian Defense', variation: 'Nimzowitsch-Rossolimo Attack', moves: 'e4 c5 Nf3 Nc6 Bb5 g6' },
  { eco: 'B32', name: 'Sicilian Defense', variation: 'Open Sicilian', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4' },
  { eco: 'B33', name: 'Sicilian Defense', variation: 'Sveshnikov Variation', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5' },
  { eco: 'B34', name: 'Sicilian Defense', variation: 'Accelerated Dragon', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6' },
  { eco: 'B40', name: 'Sicilian Defense', variation: 'French Variation', moves: 'e4 c5 Nf3 e6' },
  { eco: 'B41', name: 'Sicilian Defense', variation: 'Kan Variation', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6' },
  { eco: 'B44', name: 'Sicilian Defense', variation: 'Taimanov Variation', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6' },
  { eco: 'B45', name: 'Sicilian Defense', variation: 'Four Knights Variation', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6' },
  { eco: 'B50', name: 'Sicilian Defense', variation: 'Modern Line', moves: 'e4 c5 Nf3 d6' },
  { eco: 'B51', name: 'Sicilian Defense', variation: 'Moscow Variation', moves: 'e4 c5 Nf3 d6 Bb5+' },
  { eco: 'B53', name: 'Sicilian Defense', variation: 'Chekhover Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Qxd4' },
  { eco: 'B54', name: 'Sicilian Defense', variation: 'Classical / Najdorf Base', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3' },
  { eco: 'B70', name: 'Sicilian Defense', variation: 'Dragon Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6' },
  { eco: 'B72', name: 'Sicilian Defense', variation: 'Dragon, Classical System', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 Be2' },
  { eco: 'B75', name: 'Sicilian Defense', variation: 'Dragon, Yugoslav Attack', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3' },
  { eco: 'B80', name: 'Sicilian Defense', variation: 'Scheveningen Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6' },
  { eco: 'B90', name: 'Sicilian Defense', variation: 'Najdorf Variation', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6' },
  { eco: 'B90', name: 'Sicilian Defense', variation: 'Najdorf, English Attack', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3' },
  { eco: 'B92', name: 'Sicilian Defense', variation: 'Najdorf, Classical 6.Be2', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2' },
  { eco: 'B94', name: 'Sicilian Defense', variation: 'Najdorf, 6.Bg5 Line', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5' },

  // French Defense (C00 - C19)
  { eco: 'C00', name: 'French Defense', moves: 'e4 e6' },
  { eco: 'C00', name: 'French Defense', variation: 'Normal Line', moves: 'e4 e6 d4 d5' },
  { eco: 'C01', name: 'French Defense', variation: 'Exchange Variation', moves: 'e4 e6 d4 d5 exd5 exd5' },
  { eco: 'C02', name: 'French Defense', variation: 'Advance Variation', moves: 'e4 e6 d4 d5 e5' },
  { eco: 'C03', name: 'French Defense', variation: 'Tarrasch Variation', moves: 'e4 e6 d4 d5 Nd2' },
  { eco: 'C05', name: 'French Defense', variation: 'Tarrasch, Closed Variation', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7' },
  { eco: 'C10', name: 'French Defense', variation: 'Paulsen / Classical System', moves: 'e4 e6 d4 d5 Nc3' },
  { eco: 'C11', name: 'French Defense', variation: 'Classical Variation', moves: 'e4 e6 d4 d5 Nc3 Nf6' },
  { eco: 'C15', name: 'French Defense', variation: 'Winawer Variation', moves: 'e4 e6 d4 d5 Nc3 Bb4' },
  { eco: 'C18', name: 'French Defense', variation: 'Winawer, Advance Variation', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3' },

  // Open Games (1. e4 e5) (C20 - C99)
  { eco: 'C20', name: 'Open Game', moves: 'e4 e5' },
  { eco: 'C21', name: 'Center Game', moves: 'e4 e5 d4 exd4' },
  { eco: 'C21', name: 'Danish Gambit', moves: 'e4 e5 d4 exd4 c3' },
  { eco: 'C23', name: "Bishop's Opening", moves: 'e4 e5 Bc4' },
  { eco: 'C25', name: 'Vienna Game', moves: 'e4 e5 Nc3' },
  { eco: 'C29', name: 'Vienna Gambit', moves: 'e4 e5 Nc3 Nf6 f4' },
  { eco: 'C30', name: "King's Gambit", moves: 'e4 e5 f4' },
  { eco: 'C33', name: "King's Gambit Accepted", moves: 'e4 e5 f4 exf4' },
  { eco: 'C40', name: "King's Knight Opening", moves: 'e4 e5 Nf3' },
  { eco: 'C41', name: 'Philidor Defense', moves: 'e4 e5 Nf3 d6' },
  { eco: 'C42', name: "Petrov's Defense", moves: 'e4 e5 Nf3 Nf6' },
  { eco: 'C44', name: 'Scotch Opening', moves: 'e4 e5 Nf3 Nc6 d4' },
  { eco: 'C44', name: 'Ponziani Opening', moves: 'e4 e5 Nf3 Nc6 c3' },
  { eco: 'C45', name: 'Scotch Game', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4' },
  { eco: 'C46', name: 'Three Knights Opening', moves: 'e4 e5 Nf3 Nc6 Nc3' },
  { eco: 'C47', name: 'Four Knights Game', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6' },
  { eco: 'C48', name: 'Four Knights Game', variation: 'Spanish Variation', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5' },
  { eco: 'C49', name: 'Four Knights Game', variation: 'Double Spanish Variation', moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4' },

  // Italian Game (C50 - C59)
  { eco: 'C50', name: 'Italian Game', moves: 'e4 e5 Nf3 Nc6 Bc4' },
  { eco: 'C50', name: 'Italian Game', variation: 'Giuoco Piano', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5' },
  { eco: 'C50', name: 'Italian Game', variation: 'Hungarian Defense', moves: 'e4 e5 Nf3 Nc6 Bc4 Be7' },
  { eco: 'C51', name: 'Italian Game', variation: 'Evans Gambit', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4' },
  { eco: 'C53', name: 'Italian Game', variation: 'Classical Giuoco Piano', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3' },
  { eco: 'C54', name: 'Italian Game', variation: 'Giuoco Pianissimo', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3' },
  { eco: 'C55', name: 'Italian Game', variation: 'Two Knights Defense', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6' },
  { eco: 'C56', name: 'Italian Game', variation: 'Two Knights, Modern 4.d4', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4' },
  { eco: 'C57', name: 'Italian Game', variation: 'Two Knights, Fried Liver Attack', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7' },

  // Ruy Lopez (C60 - C99)
  { eco: 'C60', name: 'Ruy Lopez', moves: 'e4 e5 Nf3 Nc6 Bb5' },
  { eco: 'C63', name: 'Ruy Lopez', variation: 'Schliemann Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 f5' },
  { eco: 'C65', name: 'Ruy Lopez', variation: 'Berlin Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6' },
  { eco: 'C67', name: 'Ruy Lopez', variation: 'Berlin Defense, Open Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4' },
  { eco: 'C68', name: 'Ruy Lopez', variation: 'Exchange Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6' },
  { eco: 'C70', name: 'Ruy Lopez', variation: 'Morphy Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 a6' },
  { eco: 'C70', name: 'Ruy Lopez', variation: 'Morphy Defense, Columbus Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4' },
  { eco: 'C77', name: 'Ruy Lopez', variation: 'Morphy Defense, Modern Steinitz', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 d3' },
  { eco: 'C78', name: 'Ruy Lopez', variation: 'Closed / Open Preparations', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6' },
  { eco: 'C80', name: 'Ruy Lopez', variation: 'Open Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4' },
  { eco: 'C84', name: 'Ruy Lopez', variation: 'Closed Defense', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7' },
  { eco: 'C88', name: 'Ruy Lopez', variation: 'Closed, Main Line', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O' },
  { eco: 'C89', name: 'Ruy Lopez', variation: 'Marshall Attack', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5' },

  // --- 2. Queen's Pawn Openings (1. d4) ---
  { eco: 'A40', name: "Queen's Pawn Opening", moves: 'd4' },
  { eco: 'D00', name: 'Closed Game', moves: 'd4 d5' },
  { eco: 'D00', name: 'London System', moves: 'd4 d5 Bf4' },
  { eco: 'D02', name: 'London System', moves: 'd4 d5 Nf3 Nf6 Bf4' },
  { eco: 'D02', name: 'London System', variation: 'Modern Line', moves: 'd4 Nf6 Bf4 d5 e3' },
  { eco: 'D04', name: 'Colle System', moves: 'd4 d5 Nf3 Nf6 e3' },

  // Queen's Gambit (D06 - D69)
  { eco: 'D06', name: "Queen's Gambit", moves: 'd4 d5 c4' },
  { eco: 'D07', name: 'Chigorin Defense', moves: 'd4 d5 c4 Nc6' },
  { eco: 'D08', name: 'Albin Counter-Gambit', moves: 'd4 d5 c4 e5' },
  { eco: 'D10', name: 'Slav Defense', moves: 'd4 d5 c4 c6' },
  { eco: 'D11', name: 'Slav Defense', variation: 'Quiet Line', moves: 'd4 d5 c4 c6 Nf3 Nf6' },
  { eco: 'D13', name: 'Slav Defense', variation: 'Exchange Variation', moves: 'd4 d5 c4 c6 Nf3 Nf6 cxd5 cxd5' },
  { eco: 'D15', name: 'Slav Defense', variation: 'Main Line', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4' },
  { eco: 'D20', name: "Queen's Gambit Accepted", moves: 'd4 d5 c4 dxc4' },
  { eco: 'D30', name: "Queen's Gambit Declined", moves: 'd4 d5 c4 e6' },
  { eco: 'D31', name: 'Semi-Slav Defense', moves: 'd4 d5 c4 e6 Nc3 c6' },
  { eco: 'D35', name: "Queen's Gambit Declined", variation: 'Exchange Variation', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5' },
  { eco: 'D37', name: "Queen's Gambit Declined", variation: 'Classical 4.Nf3', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3' },
  { eco: 'D43', name: 'Semi-Slav Defense', variation: 'Main Line', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 c6' },
  { eco: 'D45', name: 'Semi-Slav Defense', variation: 'Meran Variation', moves: 'd4 d5 c4 e6 Nc3 Nf6 Nf3 c6 e3 Nbd7 Bd3 dxc4 Bxc4 b5' },
  { eco: 'D50', name: "Queen's Gambit Declined", variation: '4.Bg5 System', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5' },
  { eco: 'D55', name: "Queen's Gambit Declined", variation: 'Orthodox Defense', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3' },
  { eco: 'D56', name: "Queen's Gambit Declined", variation: 'Tartakower Variation', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6' },

  // Indian Defenses (A45 - A79, E00 - E99)
  { eco: 'A45', name: 'Indian Defense', moves: 'd4 Nf6' },
  { eco: 'A45', name: 'Trompowsky Attack', moves: 'd4 Nf6 Bg5' },
  { eco: 'A46', name: 'Torre Attack', moves: 'd4 Nf6 Nf3 e6 Bg5' },
  { eco: 'A56', name: 'Benoni Defense', moves: 'd4 Nf6 c4 c5' },
  { eco: 'A57', name: 'Benko Gambit', moves: 'd4 Nf6 c4 c5 d5 b5' },
  { eco: 'A60', name: 'Modern Benoni', moves: 'd4 Nf6 c4 c5 d5 e6' },
  { eco: 'E00', name: 'Indian Defense', variation: 'Normal Variation', moves: 'd4 Nf6 c4' },
  { eco: 'E00', name: 'Catalan Opening', moves: 'd4 Nf6 c4 e6 g3' },
  { eco: 'E06', name: 'Catalan Opening', variation: 'Closed Catalan', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3' },
  { eco: 'E11', name: 'Bogo-Indian Defense', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+' },
  { eco: 'E12', name: "Queen's Indian Defense", moves: 'd4 Nf6 c4 e6 Nf3 b6' },
  { eco: 'E15', name: "Queen's Indian Defense", variation: 'Fianchetto Variation', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6' },

  // Nimzo-Indian Defense (E20 - E59)
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: 'd4 Nf6 c4 e6 Nc3 Bb4' },
  { eco: 'E21', name: 'Nimzo-Indian Defense', variation: 'Three Knights Variation', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3' },
  { eco: 'E24', name: 'Nimzo-Indian Defense', variation: 'Sämisch Variation', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3' },
  { eco: 'E32', name: 'Nimzo-Indian Defense', variation: 'Classical Variation', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2' },
  { eco: 'E40', name: 'Nimzo-Indian Defense', variation: 'Rubinstein System', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3' },
  { eco: 'E50', name: 'Nimzo-Indian Defense', variation: 'Main Line Rubinstein', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Nf3 d5' },

  // King's Indian & Grünfeld (E60 - E99, D80 - D99)
  { eco: 'E60', name: "King's Indian Setup", moves: 'd4 Nf6 c4 g6' },
  { eco: 'D80', name: 'Grünfeld Defense', moves: 'd4 Nf6 c4 g6 Nc3 d5' },
  { eco: 'D85', name: 'Grünfeld Defense', variation: 'Exchange Variation', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3' },
  { eco: 'D90', name: 'Grünfeld Defense', variation: 'Three Knights Variation', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3' },
  { eco: 'E70', name: "King's Indian Defense", moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6' },
  { eco: 'E80', name: "King's Indian Defense", variation: 'Sämisch Variation', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3' },
  { eco: 'E90', name: "King's Indian Defense", variation: 'Classical Setup', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3' },
  { eco: 'E91', name: "King's Indian Defense", variation: 'Classical, Main Line', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5' },
  { eco: 'E97', name: "King's Indian Defense", variation: 'Mar del Plata Variation', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7' },

  // --- 3. Flank Openings (1. c4, 1. Nf3, 1. f4, etc.) ---
  { eco: 'A10', name: 'English Opening', moves: 'c4' },
  { eco: 'A15', name: 'English Opening', variation: 'Anglo-Indian Defense', moves: 'c4 Nf6' },
  { eco: 'A20', name: 'English Opening', variation: "King's English Variation", moves: 'c4 e5' },
  { eco: 'A25', name: 'English Opening', variation: 'Closed System', moves: 'c4 e5 Nc3 Nc6 g3 g6 Bg2 Bg7' },
  { eco: 'A30', name: 'English Opening', variation: 'Symmetrical Variation', moves: 'c4 c5' },
  { eco: 'A34', name: 'English Opening', variation: 'Symmetrical, Four Knights', moves: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6' },

  { eco: 'A04', name: 'Réti Opening', moves: 'Nf3' },
  { eco: 'A05', name: 'Réti Opening', variation: "King's Indian Attack", moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3' },
  { eco: 'A09', name: 'Réti Opening', variation: 'Reversed Blumenfeld', moves: 'Nf3 d5 c4' },
  { eco: 'A01', name: 'Nimzo-Larsen Attack', moves: 'b3' },
  { eco: 'A02', name: "Bird's Opening", moves: 'f4' },
  { eco: 'A80', name: 'Dutch Defense', moves: 'd4 f5' },
  { eco: 'A85', name: 'Dutch Defense', variation: 'Queen Knight Variation', moves: 'd4 f5 c4 Nf6 Nc3' },
  { eco: 'A87', name: 'Dutch Defense', variation: 'Leningrad System', moves: 'd4 f5 c4 Nf6 g3 g6 Bg2 Bg7 Nf3 O-O O-O d6' },
  { eco: 'A90', name: 'Dutch Defense', variation: 'Stonewall Variation', moves: 'd4 f5 c4 e6 g3 Nf6 Bg2 d5 Nf3 c6' },
];
