import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DetailedMovePanel } from './DetailedMovePanel';
import { GameReviewStep } from '../types/chess';

describe('DetailedMovePanel', () => {
  const sampleBestStep: GameReviewStep = {
    ply: 28,
    moveNumber: 14,
    color: 'b',
    san: 'Ne4',
    uci: 'f6e4',
    fenBefore: 'r3r1k1/ppp1bppp/2n5/6P1/4n3/2N1B2P/PPP1BP2/2KR3R b - - 0 14',
    fenAfter: 'r3r1k1/ppp1bppp/2n5/6P1/4n3/2N1B2P/PPP1BP2/2KR3R w - - 1 15',
    centipawnLoss: 0,
    winRateBefore: 55,
    winRateAfter: 55,
    winRateDelta: 0,
    classification: 'best',
    phase: 'middlegame',
    playedMoveEval: {
      score: -20,
      depth: 14,
      bestMove: 'f6e4',
      pv: ['f6e4', 'c3e4'],
    },
    bestMoveEval: {
      score: -20,
      depth: 14,
      bestMove: 'f6e4',
      pv: ['f6e4', 'c3e4'],
    },
    bestMoveSan: 'Ne4',
  };

  const sampleMistakeStep: GameReviewStep = {
    ply: 28,
    moveNumber: 14,
    color: 'b',
    san: 'Ne4',
    uci: 'f6e4',
    fenBefore: 'r3r1k1/ppp1bppp/2n5/6P1/8/2N1BN1P/PPP1BP2/2KR3R b - - 0 14',
    fenAfter: 'r3r1k1/ppp1bppp/2n5/6P1/4n3/2N1B2P/PPP1BP2/2KR3R w - - 1 15',
    centipawnLoss: 140,
    winRateBefore: 65,
    winRateAfter: 48,
    winRateDelta: 17,
    classification: 'mistake',
    phase: 'middlegame',
    playedMoveEval: {
      score: 30,
      depth: 14,
      bestMove: 'c3e4',
      pv: ['c3e4', 'e8e4'],
    },
    bestMoveEval: {
      score: -110,
      depth: 14,
      bestMove: 'c6d4',
      pv: ['c6d4', 'f3d4', 'e6d4'],
      sanPv: ['Nxd4', 'Nxd4', 'exd4'],
    },
    bestMoveSan: 'Nxd4',
  };

  it('renders placeholder when no move is selected', () => {
    render(
      <DetailedMovePanel
        step={null}
        totalPlies={40}
        onSelectMove={vi.fn()}
      />
    );
    expect(screen.getByText('No Move Selected')).toBeInTheDocument();
  });

  it('renders move information and prominent classification badge', () => {
    render(
      <DetailedMovePanel
        step={sampleBestStep}
        totalPlies={40}
        onSelectMove={vi.fn()}
      />
    );

    // Move number and SAN
    expect(screen.getByText('14...')).toBeInTheDocument();
    expect(screen.getByText('Ne4')).toBeInTheDocument();

    // Classification badge
    expect(screen.getByText('Best')).toBeInTheDocument();
    expect(screen.getByText('★')).toBeInTheDocument();

    // Move explanation
    expect(screen.getByText("You found the engine's strongest continuation.")).toBeInTheDocument();

    // Best move indicator
    expect(screen.getByText("Played move is the engine's top choice.")).toBeInTheDocument();
  });

  it('renders best move comparison and preview button for inferior moves', () => {
    const handlePreview = vi.fn();

    render(
      <DetailedMovePanel
        step={sampleMistakeStep}
        totalPlies={40}
        onSelectMove={vi.fn()}
        onPreviewBestMove={handlePreview}
      />
    );

    // Mistake badge
    expect(screen.getByText('Mistake')).toBeInTheDocument();

    // Best move display
    expect(screen.getByText('Best engine move:')).toBeInTheDocument();
    expect(screen.getByText('Nxd4')).toBeInTheDocument();

    // PV continuation
    expect(screen.getByText('Continuation:')).toBeInTheDocument();
    expect(screen.getByText('Nxd4 Nxd4 exd4')).toBeInTheDocument();

    // Preview button is removed from coaching feedback
    expect(screen.queryByRole('button', { name: /preview best move/i })).toBeNull();
  });

  it('navigates to previous and next move', () => {
    const handleSelect = vi.fn();

    render(
      <DetailedMovePanel
        step={sampleMistakeStep}
        totalPlies={40}
        onSelectMove={handleSelect}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /previous move/i });
    const nextBtn = screen.getByRole('button', { name: /next move/i });

    fireEvent.click(prevBtn);
    expect(handleSelect).toHaveBeenCalledWith(27);

    fireEvent.click(nextBtn);
    expect(handleSelect).toHaveBeenCalledWith(29);
  });

  it('gracefully handles missing evaluation data without crashing or fabricating numbers', () => {
    const stepWithMissingEval: GameReviewStep = {
      ply: 10,
      moveNumber: 5,
      color: 'w',
      san: 'Nf3',
      uci: 'g1f3',
      fenBefore: '',
      fenAfter: '',
      centipawnLoss: 0,
      winRateBefore: 50,
      winRateAfter: 50,
      winRateDelta: 0,
      classification: 'book',
      phase: 'opening',
    };

    render(
      <DetailedMovePanel
        step={stepWithMissingEval}
        totalPlies={20}
        onSelectMove={vi.fn()}
      />
    );

    expect(screen.getByText('Nf3')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Standard opening book theory.')).toBeInTheDocument();
  });
});
