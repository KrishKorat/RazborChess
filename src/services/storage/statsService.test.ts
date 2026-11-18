import { describe, it, expect } from 'vitest';
import { computeAggregatedStats } from './statsService';
import { SavedGame } from '../../types/storage';
import { GameReviewReport, CURRENT_REVIEW_SCHEMA_VERSION } from '../../types/chess';

describe('statsService', () => {
  const mockReview1: GameReviewReport = {
    schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
    whiteAccuracy: 90.0,
    blackAccuracy: 80.0,
    whiteAcpl: 20.0,
    blackAcpl: 40.0,
    whitePhaseAccuracy: { opening: 95, middlegame: 90, endgame: 85 },
    blackPhaseAccuracy: { opening: 90, middlegame: 80, endgame: 70 },
    classificationCounts: {
      white: { forced: 0, brilliant: 1, great: 1, best: 15, excellent: 5, good: 2, inaccuracy: 1, mistake: 0, blunder: 0, missed_win: 0, book: 0 },
      black: { forced: 0, brilliant: 0, great: 0, best: 10, excellent: 4, good: 3, inaccuracy: 2, mistake: 1, blunder: 1, missed_win: 0, book: 0 },
    },
    estimatedElo: {
      white: { min: 2100, max: 2300, estimate: 2200, confidence: 'Moderate' },
      black: { min: 1800, max: 2000, estimate: 1900, confidence: 'Moderate' },
    },
    moves: new Array(48).fill(null).map((_, i) => ({ ply: i + 1 } as any)),
    criticalPositions: [],
  };

  const mockReview2: GameReviewReport = {
    schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
    whiteAccuracy: 70.0,
    blackAccuracy: 88.0,
    whiteAcpl: 50.0,
    blackAcpl: 22.0,
    whitePhaseAccuracy: { opening: 85, middlegame: 70, endgame: 55 },
    blackPhaseAccuracy: { opening: 92, middlegame: 88, endgame: 84 },
    classificationCounts: {
      white: { forced: 0, brilliant: 0, great: 0, best: 8, excellent: 3, good: 3, inaccuracy: 3, mistake: 2, blunder: 1, missed_win: 0, book: 0 },
      black: { forced: 0, brilliant: 1, great: 0, best: 14, excellent: 4, good: 1, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0, book: 0 },
    },
    estimatedElo: {
      white: { min: 1600, max: 1800, estimate: 1700, confidence: 'Moderate' },
      black: { min: 2050, max: 2250, estimate: 2150, confidence: 'Moderate' },
    },
    moves: new Array(40).fill(null).map((_, i) => ({ ply: i + 1 } as any)),
    criticalPositions: [],
  };

  const sampleGames: SavedGame[] = [
    {
      id: 'g1',
      title: 'Game 1',
      pgn: '',
      startingFen: '',
      currentFen: '',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: { white: 'Me', black: 'Opponent1', result: '1-0', date: '2026.01.01' },
      createdAt: Date.now() - 100000,
      updatedAt: Date.now() - 100000,
      source: 'manual',
      reviewReport: mockReview1,
    },
    {
      id: 'g2',
      title: 'Game 2',
      pgn: '',
      startingFen: '',
      currentFen: '',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: { white: 'Opponent2', black: 'Me', result: '0-1', date: '2026.01.05' },
      createdAt: Date.now() - 50000,
      updatedAt: Date.now() - 50000,
      source: 'manual',
      reviewReport: mockReview2,
    },
    {
      id: 'g3',
      title: 'Game 3',
      pgn: '',
      startingFen: '',
      currentFen: '',
      treeNodes: [],
      currentNodeId: 'root',
      metadata: { white: 'Me', black: 'Opponent3', result: '1/2-1/2', date: '2026.01.10' },
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 10000,
      source: 'manual',
      // Unreviewed game
    },
  ];

  it('computes aggregated stats from empty game list with null/unavailable stats', () => {
    const emptyStats = computeAggregatedStats([]);
    expect(emptyStats.totalGames).toBe(0);
    expect(emptyStats.totalReviewed).toBe(0);
    expect(emptyStats.avgWhiteAccuracy).toBeNull();
    expect(emptyStats.avgBlackAccuracy).toBeNull();
    expect(emptyStats.avgAcpl).toBeNull();
    expect(emptyStats.phaseAccuracy.opening).toBeNull();
  });

  it('computes wins, losses, draws, win rate and accuracy averages across games', () => {
    const stats = computeAggregatedStats(sampleGames);
    expect(stats.totalGames).toBe(3);
    expect(stats.totalReviewed).toBe(2);
    expect(stats.whiteWins).toBe(1);
    expect(stats.blackWins).toBe(1);
    expect(stats.draws).toBe(1);

    // Win rate: (1 + 1) / 3 = 66.7%
    expect(stats.winRate).toBe(66.7);

    // Avg White Accuracy: (90 + 70) / 2 = 80.0%
    expect(stats.avgWhiteAccuracy).toBe(80.0);
    // Avg Black Accuracy: (80 + 88) / 2 = 84.0%
    expect(stats.avgBlackAccuracy).toBe(84.0);
    // Avg ACPL: (20 + 40 + 50 + 22) / 4 = 33.0
    expect(stats.avgAcpl).toBe(33.0);

    // Total moves analyzed = 48 + 40 = 88
    expect(stats.totalMovesAnalyzed).toBe(88);

    // Classifications sum across games
    expect(stats.classifications.brilliant).toBe(2); // 1 from mock1, 1 from mock2
    expect(stats.classifications.blunder).toBe(2); // 1 from mock1, 1 from mock2

    expect(stats.performanceHistory.length).toBe(2);
  });

  it('filters statistics by color', () => {
    // Filter for White games
    const whiteFilterStats = computeAggregatedStats(sampleGames, { color: 'white' });
    expect(whiteFilterStats.totalGames).toBe(3);
    expect(whiteFilterStats.winRate).toBe(33.3); // 1 white win out of 3 total games
  });

  it('filters statistics by result', () => {
    const drawStats = computeAggregatedStats(sampleGames, { result: 'draw' });
    expect(drawStats.totalGames).toBe(1);
    expect(drawStats.draws).toBe(1);
  });

  it('filters statistics for only reviewed games', () => {
    const reviewedOnlyStats = computeAggregatedStats(sampleGames, { onlyReviewed: true });
    expect(reviewedOnlyStats.totalGames).toBe(2);
  });
});
