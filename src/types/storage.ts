import { GameMetadata, GameReviewReport, MoveClassification } from './chess';
import { TreeNode } from '../services/tree/variationTree';

export interface SavedGame {
  id: string; // UUID or unique ID
  title: string;
  pgn: string;
  startingFen: string;
  currentFen: string;
  treeNodes: TreeNode[];
  currentNodeId: string;
  metadata: GameMetadata;
  eco?: string;
  openingName?: string;
  reviewReport?: GameReviewReport;
  createdAt: number;
  updatedAt: number;
  analyzedAt?: number;
  source: 'manual' | 'imported' | 'review';
  tags?: string[];
}

export interface WorkspaceState {
  activeGameId: string | null;
  treeNodes: TreeNode[];
  currentNodeId: string;
  initialFen: string;
  metadata: GameMetadata;
  reviewReport?: GameReviewReport | null;
  isFlipped: boolean;
  activeTab: string;
  timestamp: number;
}

export interface UserSettings {
  targetDepth: number;
  multiPv: number;
  hashSizeMb: number;
  showArrows: boolean;
  maxArrows: number;
  autoSave: boolean;
}

export interface BackupData {
  version: number;
  appName: 'RazborChess' | 'Razbor' | 'BoardScope' | 'ChessLab';
  exportDate: string;
  games: SavedGame[];
  settings: UserSettings;
  workspace?: WorkspaceState;
}

export interface LibraryFilter {
  searchQuery: string;
  result: 'all' | '1-0' | '0-1' | '1/2-1/2' | '*';
  color: 'all' | 'white' | 'black';
  hasReview: 'all' | 'reviewed' | 'unreviewed';
  sortBy: 'updatedAt' | 'createdAt' | 'white' | 'moves' | 'result';
  sortOrder: 'asc' | 'desc';
}

export interface StatsFilter {
  dateRange: 'all' | '7d' | '30d' | '90d' | 'year';
  color: 'all' | 'white' | 'black';
  result: 'all' | 'win' | 'loss' | 'draw';
  onlyReviewed: boolean;
}

export interface AggregatedStats {
  totalGames: number;
  totalReviewed: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
  inProgress: number;
  winRate: number; // percentage
  avgWhiteAccuracy: number | null;
  avgBlackAccuracy: number | null;
  avgAcpl: number | null;
  totalMovesAnalyzed: number;
  classifications: Record<MoveClassification, number>;
  phaseAccuracy: {
    opening: number | null;
    middlegame: number | null;
    endgame: number | null;
  };
  performanceHistory: Array<{
    date: string;
    gameId: string;
    white: string;
    black: string;
    result: string;
    whiteAcc?: number;
    blackAcc?: number;
    whiteAcpl?: number;
    blackAcpl?: number;
  }>;
}
