import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameStatsDashboard } from './GameStatsDashboard';
import { SavedGame } from '../types/storage';
import { CURRENT_REVIEW_SCHEMA_VERSION } from '../types/chess';

const mockGames: SavedGame[] = [
  {
    id: 'game_stat_1',
    title: 'Carlsen vs So',
    pgn: '1. e4',
    startingFen: 'startpos',
    currentFen: 'fen1',
    treeNodes: [],
    currentNodeId: 'root',
    metadata: { white: 'Carlsen', black: 'So', result: '1-0', date: '2026.01.01' },
    createdAt: 1000,
    updatedAt: 1000,
    source: 'manual',
    reviewReport: {
      schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
      whiteAccuracy: 92.0,
      blackAccuracy: 78.0,
      whiteAcpl: 15.0,
      blackAcpl: 45.0,
      whitePhaseAccuracy: { opening: 95, middlegame: 92, endgame: 89 },
      blackPhaseAccuracy: { opening: 90, middlegame: 76, endgame: 68 },
      classificationCounts: {
        white: { forced: 0, brilliant: 1, great: 1, best: 12, excellent: 4, good: 2, inaccuracy: 1, mistake: 0, blunder: 0, missed_win: 0, book: 0 },
        black: { forced: 0, brilliant: 0, great: 0, best: 8, excellent: 3, good: 2, inaccuracy: 3, mistake: 2, blunder: 1, missed_win: 0, book: 0 },
      },
      estimatedElo: {
        white: { min: 2300, max: 2500, estimate: 2400, confidence: 'High' },
        black: { min: 1900, max: 2100, estimate: 2000, confidence: 'High' },
      },
      moves: new Array(30).fill(null).map((_, i) => ({ ply: i + 1 } as any)),
      criticalPositions: [],
    },
  },
  {
    id: 'game_stat_2',
    title: 'Aronian vs Caruana',
    pgn: '1. d4',
    startingFen: 'startpos',
    currentFen: 'fen2',
    treeNodes: [],
    currentNodeId: 'root',
    metadata: { white: 'Aronian', black: 'Caruana', result: '1/2-1/2', date: '2026.01.05' },
    createdAt: 2000,
    updatedAt: 2000,
    source: 'manual',
  },
];

describe('GameStatsDashboard', () => {
  it('renders overall metrics including Win Rate, Avg Accuracy, and ACPL', () => {
    render(<GameStatsDashboard games={mockGames} />);

    expect(screen.getByText(/Game & Review Statistics/i)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // 1 win out of 2 games = 50%
    expect(screen.getAllByText('92%').length).toBeGreaterThan(0); // 92% avg white accuracy
    expect(screen.getByText(/30 cp/i)).toBeInTheDocument(); // (15 + 45) / 2 = 30 cp ACPL
    expect(screen.getByText(/30 moves analyzed/i)).toBeInTheDocument();
  });

  it('filters statistics when side filter is clicked', () => {
    render(<GameStatsDashboard games={mockGames} />);

    const whiteBtn = screen.getByRole('button', { name: /^white$/i });
    fireEvent.click(whiteBtn);

    // 1-0 for white out of 2 games = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays message when no games are provided', () => {
    render(<GameStatsDashboard games={[]} />);

    expect(screen.getByText(/No saved games found matching the selected filters/i)).toBeInTheDocument();
  });

  it('triggers onOpenGame when recent match is clicked', () => {
    const handleOpen = vi.fn();
    render(<GameStatsDashboard games={mockGames} onOpenGame={handleOpen} />);

    const matchRow = screen.getByText(/Carlsen vs So/i);
    fireEvent.click(matchRow);
    expect(handleOpen).toHaveBeenCalledWith('game_stat_1');
  });
});
