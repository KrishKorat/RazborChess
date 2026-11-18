import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameReviewDashboard } from './GameReviewDashboard';
import { GameReviewReport, CURRENT_REVIEW_SCHEMA_VERSION } from '../types/chess';

const mockReport: GameReviewReport = {
  schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
  whiteAccuracy: 92.4,
  blackAccuracy: 84.1,
  whiteAcpl: 18.2,
  blackAcpl: 35.4,
  whitePhaseAccuracy: {
    opening: 98.0,
    middlegame: 91.0,
    endgame: 89.0,
  },
  blackPhaseAccuracy: {
    opening: 95.0,
    middlegame: 82.0,
    endgame: 78.0,
  },
  classificationCounts: {
    white: {
      forced: 0,
      brilliant: 1,
      great: 1,
      best: 10,
      excellent: 4,
      good: 2,
      inaccuracy: 1,
      mistake: 0,
      blunder: 0,
      missed_win: 0,
      book: 0,
    },
    black: {
      forced: 0,
      brilliant: 0,
      great: 0,
      best: 8,
      excellent: 3,
      good: 3,
      inaccuracy: 2,
      mistake: 1,
      blunder: 1,
      missed_win: 0,
      book: 0,
    },
  },
  estimatedElo: {
    white: { min: 2100, max: 2300, estimate: 2200, confidence: 'Moderate' },
    black: { min: 1850, max: 2050, estimate: 1950, confidence: 'Moderate' },
  },
  moves: [
    {
      ply: 1,
      moveNumber: 1,
      color: 'w',
      san: 'e4',
      uci: 'e2e4',
      fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      centipawnLoss: 0,
      winRateBefore: 52,
      winRateAfter: 52,
      winRateDelta: 0,
      classification: 'best',
      phase: 'opening',
      bestMoveSan: 'e4',
    },
    {
      ply: 2,
      moveNumber: 1,
      color: 'b',
      san: 'e5',
      uci: 'e7e5',
      fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      centipawnLoss: 10,
      winRateBefore: 48,
      winRateAfter: 47,
      winRateDelta: 1,
      classification: 'excellent',
      phase: 'opening',
      bestMoveSan: 'e5',
    },
  ],
  criticalPositions: [],
};

describe('GameReviewDashboard', () => {
  it('renders Start Review button when no report exists', () => {
    const handleStart = vi.fn();
    render(
      <GameReviewDashboard
        report={null}
        progress={null}
        isReviewing={false}
        metadata={{ white: 'Magnus', black: 'Hikaru' }}
        currentPly={0}
        totalPlies={20}
        onStartReview={handleStart}
        onCancelReview={vi.fn()}
        onSelectMove={vi.fn()}
      />
    );

    const startBtn = screen.getByText(/Start Game Review/i);
    expect(startBtn).toBeDefined();

    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalledWith(14, true);
  });

  it('renders accuracy and classifications when report is present', () => {
    const handleSelectMove = vi.fn();
    render(
      <GameReviewDashboard
        report={mockReport}
        progress={null}
        isReviewing={false}
        metadata={{ white: 'Magnus', black: 'Hikaru' }}
        currentPly={1}
        totalPlies={2}
        onStartReview={vi.fn()}
        onCancelReview={vi.fn()}
        onSelectMove={handleSelectMove}
      />
    );

    expect(screen.getByText(/92.4%/i)).toBeDefined();
    expect(screen.getByText(/84.1%/i)).toBeDefined();
    expect(screen.getAllByText(/Magnus/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Hikaru/i).length).toBeGreaterThanOrEqual(1);

    // Check move list item click
    const moveItems = screen.getAllByText('e4');
    expect(moveItems.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(moveItems[moveItems.length - 1]);
    expect(handleSelectMove).toHaveBeenCalledWith(1);
  });

  it('renders progress bar when isReviewing is true', () => {
    const handleCancel = vi.fn();
    render(
      <GameReviewDashboard
        report={null}
        progress={{
          currentStep: 5,
          totalSteps: 10,
          percentage: 50,
          currentMoveSan: 'Nf3',
          isCompleted: false,
          isCancelled: false,
        }}
        isReviewing={true}
        metadata={{ white: 'White', black: 'Black' }}
        currentPly={0}
        totalPlies={10}
        onStartReview={vi.fn()}
        onCancelReview={handleCancel}
        onSelectMove={vi.fn()}
      />
    );

    expect(screen.getByText(/5 \/ 10 \(50%\)/i)).toBeDefined();
    const cancelBtn = screen.getByText(/Cancel Review/i);
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalled();
  });
});
