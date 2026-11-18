export type PieceColor = 'w' | 'b';

export type MoveClassification = 
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win'
  | 'book'
  | 'forced';

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

export interface MoveEvaluation {
  depth: number;
  score: number; // in centipawns from White's perspective
  mate?: number; // moves to mate, positive for White winning, negative for Black winning
  pv: string[]; // principal variation UCI moves
  sanPv?: string[]; // principal variation in SAN notation
  bestMove: string; // e.g. "e2e4"
  nodes?: number;
  nps?: number;
  time?: number;
  fen?: string; // FEN of the evaluated position
}

export interface MultiPvEvaluation {
  id: number;
  depth: number;
  score: number; // centipawns (from White perspective)
  mate?: number;
  pv: string[];
  sanPv?: string[];
  bestMove: string;
  fen?: string; // FEN of the evaluated position
}

export interface EngineStatus {
  isReady: boolean;
  isSearching: boolean;
  version: string;
  depth: number;
  maxDepth: number;
  multiPv: number;
  nps: number;
  nodes?: number;
  hashSizeMb: number;
}

export interface MoveTreeNode {
  id: string; // unique ID
  parentId: string | null;
  ply: number;
  fen: string;
  san: string;
  uci: string;
  from?: string;
  to?: string;
  color: PieceColor;
  comment?: string;
  children: string[]; // child node IDs
  eval?: MoveEvaluation;
  classification?: MoveClassification;
  review?: GameReviewStep;
}

export interface GameReviewStep {
  ply: number;
  moveNumber: number;
  color: PieceColor;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  playedMoveEval?: MoveEvaluation;
  bestMoveEval?: MoveEvaluation;
  centipawnLoss: number;
  winRateBefore: number; // 0 to 100
  winRateAfter: number;  // 0 to 100
  winRateDelta: number;
  classification: MoveClassification;
  phase: GamePhase;
  bestMoveSan?: string;
}

export const CURRENT_REVIEW_SCHEMA_VERSION = 2;

export interface GameReviewReport {
  schemaVersion?: number;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteAcpl: number; // Average Centipawn Loss
  blackAcpl: number;
  whitePhaseAccuracy: {
    opening: number;
    middlegame: number;
    endgame: number;
  };
  blackPhaseAccuracy: {
    opening: number;
    middlegame: number;
    endgame: number;
  };
  classificationCounts: {
    white: Record<MoveClassification, number>;
    black: Record<MoveClassification, number>;
  };
  estimatedElo: {
    white: { min: number; max: number; estimate: number; confidence: string };
    black: { min: number; max: number; estimate: number; confidence: string };
  };
  moves: GameReviewStep[];
  criticalPositions: number[]; // ply indices of turning points / blunders
}

export interface GameMetadata {
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white?: string;
  black?: string;
  result?: string;
  whiteElo?: string;
  blackElo?: string;
}
