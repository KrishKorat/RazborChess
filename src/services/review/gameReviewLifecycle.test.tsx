import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React, { useState } from 'react';
import { GameReviewDashboard } from '../../components/GameReviewDashboard';
import { GameReviewReport, CURRENT_REVIEW_SCHEMA_VERSION } from '../../types/chess';
import { ReviewProgress } from './gameReviewService';

const mockCompletedReport: GameReviewReport = {
  schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
  whiteAccuracy: 91.5,
  blackAccuracy: 88.2,
  whiteAcpl: 22.0,
  blackAcpl: 29.5,
  whitePhaseAccuracy: {
    opening: 96.0,
    middlegame: 90.0,
    endgame: 87.0,
  },
  blackPhaseAccuracy: {
    opening: 94.0,
    middlegame: 86.0,
    endgame: 84.0,
  },
  classificationCounts: {
    white: {
      forced: 0,
      brilliant: 1,
      great: 2,
      best: 12,
      excellent: 4,
      good: 3,
      inaccuracy: 1,
      mistake: 0,
      blunder: 0,
      missed_win: 0,
      book: 2,
    },
    black: {
      forced: 0,
      brilliant: 0,
      great: 1,
      best: 10,
      excellent: 5,
      good: 4,
      inaccuracy: 2,
      mistake: 1,
      blunder: 1,
      missed_win: 0,
      book: 2,
    },
  },
  estimatedElo: {
    white: { min: 2000, max: 2200, estimate: 2100, confidence: 'Moderate' },
    black: { min: 1900, max: 2100, estimate: 2000, confidence: 'Moderate' },
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
      classification: 'book',
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
      centipawnLoss: 5,
      winRateBefore: 48,
      winRateAfter: 48,
      winRateDelta: 0,
      classification: 'book',
      phase: 'opening',
      bestMoveSan: 'e5',
    },
  ],
  criticalPositions: [],
};

// Harness simulating App component's review state management and tab navigation
const ReviewLifecycleHarness: React.FC<{
  onStartCallback?: () => void;
  autoRestartTrap?: () => void;
}> = ({ onStartCallback, autoRestartTrap }) => {
  const [activeTab, setActiveTab] = useState<'review' | 'analysis' | 'stats'>('review');
  const [report, setReport] = useState<GameReviewReport | null>(null);
  const [progress, setProgress] = useState<ReviewProgress | null>(null);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [startCount, setStartCount] = useState<number>(0);

  const handleStartReview = (_depth: number, _forceFresh?: boolean) => {
    setStartCount((prev) => {
      const next = prev + 1;
      if (next > 1 && autoRestartTrap) {
        autoRestartTrap();
      }
      return next;
    });
    if (onStartCallback) onStartCallback();

    setIsReviewing(true);
    setProgress({
      currentStep: 0,
      totalSteps: 2,
      percentage: 0,
      currentMoveSan: 'e4',
      isCompleted: false,
      isCancelled: false,
    });

    // Simulate progress updates up to 100%
    setTimeout(() => {
      setProgress({
        currentStep: 1,
        totalSteps: 2,
        percentage: 50,
        currentMoveSan: 'e5',
        isCompleted: false,
        isCancelled: false,
      });
    }, 10);

    setTimeout(() => {
      // Reaches 100% and finishes
      setProgress({
        currentStep: 2,
        totalSteps: 2,
        percentage: 100,
        currentMoveSan: '',
        isCompleted: true,
        isCancelled: false,
      });
      setReport(mockCompletedReport);
      setIsReviewing(false);
    }, 20);
  };

  return (
    <div>
      <div data-testid="start-count">{startCount}</div>
      <div className="tabs">
        <button onClick={() => setActiveTab('analysis')}>Go to Analysis</button>
        <button onClick={() => setActiveTab('review')}>Go to Review</button>
        <button onClick={() => setActiveTab('stats')}>Go to Stats</button>
      </div>

      {activeTab === 'analysis' && <div data-testid="analysis-view">Analysis View</div>}
      {activeTab === 'stats' && <div data-testid="stats-view">Stats View</div>}

      {activeTab === 'review' && (
        <GameReviewDashboard
          report={report}
          progress={progress}
          isReviewing={isReviewing}
          metadata={{ white: 'White Player', black: 'Black Player' }}
          currentPly={1}
          totalPlies={2}
          onStartReview={handleStartReview}
          onCancelReview={() => setIsReviewing(false)}
          onSelectMove={() => {}}
        />
      )}
    </div>
  );
};

describe('Game Review Lifecycle & 100% Completion Regression', () => {
  it('transitions from 100% to completed state and preserves the report without resetting', async () => {
    const handleStart = vi.fn();
    render(<ReviewLifecycleHarness onStartCallback={handleStart} />);

    // Initially shows Start Game Review button
    const startBtn = screen.getByText(/Start Game Review/i);
    expect(startBtn).toBeDefined();

    // Click Start Game Review
    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalledTimes(1);

    // Wait for review to reach 100% and finish
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // 1. Report remains available and visible
    expect(screen.getByText(/91.5%/i)).toBeDefined();
    expect(screen.getByText(/88.2%/i)).toBeDefined();
    expect(screen.getAllByText(/White Player/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Black Player/i).length).toBeGreaterThanOrEqual(1);

    // 2. Button has transitioned to "Re-Analyze Game" instead of resetting to initial "Start Game Review"
    expect(screen.getByText(/Re-Analyze Game/i)).toBeDefined();
    expect(screen.queryByText(/Start Game Review/i)).toBeNull();

    // 3. Move classifications table is visible
    expect(screen.getByText(/Move Classifications/i)).toBeDefined();
  });

  it('does NOT automatically restart review after reaching 100%', async () => {
    const autoRestartTrap = vi.fn();
    render(<ReviewLifecycleHarness autoRestartTrap={autoRestartTrap} />);

    fireEvent.click(screen.getByText(/Start Game Review/i));

    // Wait for full completion and additional settling time
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Only 1 review should have started, autoRestartTrap must never have fired
    expect(screen.getByTestId('start-count').textContent).toBe('1');
    expect(autoRestartTrap).not.toHaveBeenCalled();

    // Report remains completely intact
    expect(screen.getByText(/91.5%/i)).toBeDefined();
  });

  it('preserves the completed report when navigating to other tabs and returning', async () => {
    render(<ReviewLifecycleHarness />);

    // Start review and wait for completion
    fireEvent.click(screen.getByText(/Start Game Review/i));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(screen.getByText(/91.5%/i)).toBeDefined();

    // Navigate away to Analysis tab
    fireEvent.click(screen.getByText(/Go to Analysis/i));
    expect(screen.getByTestId('analysis-view')).toBeDefined();
    expect(screen.queryByText(/91.5%/i)).toBeNull();

    // Navigate to Stats tab
    fireEvent.click(screen.getByText(/Go to Stats/i));
    expect(screen.getByTestId('stats-view')).toBeDefined();

    // Return to Review tab
    fireEvent.click(screen.getByText(/Go to Review/i));

    // The report must still be present and intact!
    expect(screen.getByText(/91.5%/i)).toBeDefined();
    expect(screen.getByText(/88.2%/i)).toBeDefined();
    expect(screen.getByText(/Re-Analyze Game/i)).toBeDefined();
    expect(screen.getByText(/Move Classifications/i)).toBeDefined();
  });

  it('allows starting a new review cleanly on explicit user action', async () => {
    render(<ReviewLifecycleHarness />);

    // 1st review
    fireEvent.click(screen.getByText(/Start Game Review/i));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(screen.getByTestId('start-count').textContent).toBe('1');
    expect(screen.getByText(/Re-Analyze Game/i)).toBeDefined();

    // User explicitly clicks "Re-Analyze Game"
    fireEvent.click(screen.getByText(/Re-Analyze Game/i));
    expect(screen.getByTestId('start-count').textContent).toBe('2');

    // Completes 2nd review
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(screen.getByText(/91.5%/i)).toBeDefined();
    expect(screen.getByText(/Re-Analyze Game/i)).toBeDefined();
  });
});
