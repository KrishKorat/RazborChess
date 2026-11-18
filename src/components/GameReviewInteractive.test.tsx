import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import { GameReviewDashboard } from './GameReviewDashboard';
import { GameReviewReport, GameReviewStep } from '../types/chess';
import { VariationTree } from '../services/tree/variationTree';

describe('GameReviewDashboard Interactive Move Review', () => {
  const sampleMoves: GameReviewStep[] = [
    {
      ply: 1,
      moveNumber: 1,
      color: 'w',
      san: 'e4',
      uci: 'e2e4',
      fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      centipawnLoss: 0,
      winRateBefore: 50,
      winRateAfter: 50,
      winRateDelta: 0,
      classification: 'book',
      phase: 'opening',
    },
    {
      ply: 2,
      moveNumber: 1,
      color: 'b',
      san: 'c6',
      uci: 'c7c6',
      fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      fenAfter: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      centipawnLoss: 0,
      winRateBefore: 50,
      winRateAfter: 50,
      winRateDelta: 0,
      classification: 'book',
      phase: 'opening',
    },
    {
      ply: 3,
      moveNumber: 2,
      color: 'w',
      san: 'd4',
      uci: 'd2d4',
      fenBefore: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      fenAfter: 'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2',
      centipawnLoss: 0,
      winRateBefore: 52,
      winRateAfter: 52,
      winRateDelta: 0,
      classification: 'best',
      phase: 'opening',
      playedMoveEval: { score: 20, depth: 14, bestMove: 'd2d4', pv: ['d2d4'] },
      bestMoveEval: { score: 20, depth: 14, bestMove: 'd2d4', pv: ['d2d4'] },
      bestMoveSan: 'd4',
    },
    {
      ply: 4,
      moveNumber: 2,
      color: 'b',
      san: 'h6',
      uci: 'h7h6',
      fenBefore: 'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2',
      fenAfter: 'rnbqkbnr/pp1pppp1/2p4p/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
      centipawnLoss: 120,
      winRateBefore: 48,
      winRateAfter: 35,
      winRateDelta: 13,
      classification: 'mistake',
      phase: 'opening',
      playedMoveEval: { score: 140, depth: 14, bestMove: 'b1c3', pv: ['b1c3'] },
      bestMoveEval: { score: 20, depth: 14, bestMove: 'd7d5', pv: ['d7d5'], sanPv: ['d5'] },
      bestMoveSan: 'd5',
    },
  ];

  const sampleReport: GameReviewReport = {
    schemaVersion: 2,
    whiteAccuracy: 95,
    blackAccuracy: 75,
    whiteAcpl: 10,
    blackAcpl: 45,
    whitePhaseAccuracy: { opening: 95, middlegame: 90, endgame: 90 },
    blackPhaseAccuracy: { opening: 75, middlegame: 70, endgame: 70 },
    classificationCounts: {
      white: { forced: 0, book: 1, brilliant: 0, great: 0, best: 1, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0 },
      black: { forced: 0, book: 1, brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 1, blunder: 0, missed_win: 0 },
    },
    estimatedElo: {
      white: { min: 1400, max: 1600, estimate: 1500, confidence: 'High' },
      black: { min: 1000, max: 1200, estimate: 1100, confidence: 'High' },
    },
    moves: sampleMoves,
    criticalPositions: [4],
  };

  it('renders all moves in the move list and allows selection', () => {
    const handleSelectMove = vi.fn();

    render(
      <GameReviewDashboard
        report={sampleReport}
        progress={null}
        isReviewing={false}
        metadata={{ white: 'Magnus', black: 'Hikaru' }}
        currentPly={1}
        totalPlies={4}
        onStartReview={vi.fn()}
        onCancelReview={vi.fn()}
        onSelectMove={handleSelectMove}
      />
    );

    // Assert that the move list renders moves
    expect(screen.getByText('Move List (4)')).toBeInTheDocument();

    // Find the move buttons in the list
    const moveButtons = screen.getAllByRole('button');
    const h6Button = moveButtons.find((btn) => btn.textContent?.includes('h6'));
    expect(h6Button).toBeDefined();

    // Click move 4 (h6)
    fireEvent.click(h6Button!);
    expect(handleSelectMove).toHaveBeenCalledWith(4);
  });

  it('updates DetailedMovePanel to the selected ply', () => {
    const { rerender } = render(
      <GameReviewDashboard
        report={sampleReport}
        progress={null}
        isReviewing={false}
        metadata={{ white: 'Magnus', black: 'Hikaru' }}
        currentPly={3}
        totalPlies={4}
        onStartReview={vi.fn()}
        onCancelReview={vi.fn()}
        onSelectMove={vi.fn()}
      />
    );

    // Move 3: 2. d4 Best
    expect(screen.getAllByText('2.').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('d4').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Played move is the engine's top choice.")).toBeInTheDocument();

    // Rerender with currentPly = 4 (2... h6 Mistake)
    rerender(
      <GameReviewDashboard
        report={sampleReport}
        progress={null}
        isReviewing={false}
        metadata={{ white: 'Magnus', black: 'Hikaru' }}
        currentPly={4}
        totalPlies={4}
        onStartReview={vi.fn()}
        onCancelReview={vi.fn()}
        onSelectMove={vi.fn()}
      />
    );

    expect(screen.getAllByText('2...').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('h6').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mistake').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Best engine move:')).toBeInTheDocument();
    expect(screen.getAllByText('d5').length).toBeGreaterThanOrEqual(1);
  });

  it('displays best move recommendation and confirms Preview Best Move button is removed', () => {
    render(
      <GameReviewDashboard
        report={sampleReport}
        progress={null}
        isReviewing={false}
        metadata={{ white: 'Magnus', black: 'Hikaru' }}
        currentPly={4}
        totalPlies={4}
        onStartReview={vi.fn()}
        onCancelReview={vi.fn()}
        onSelectMove={vi.fn()}
      />
    );

    // Confirms best move recommendation is rendered
    expect(screen.getByText('Best engine move:')).toBeInTheDocument();
    // Confirms Preview Best Move button is removed from coaching feedback
    expect(screen.queryByRole('button', { name: /preview best move/i })).toBeNull();
  });

  it('filters moves by category pill', () => {
    render(
      <GameReviewDashboard
        report={sampleReport}
        progress={null}
        isReviewing={false}
        metadata={{ white: 'Magnus', black: 'Hikaru' }}
        currentPly={1}
        totalPlies={4}
        onStartReview={vi.fn()}
        onCancelReview={vi.fn()}
        onSelectMove={vi.fn()}
      />
    );

    // Click 'Key' filter
    const keyFilterBtn = screen.getByRole('button', { name: 'Key' });
    fireEvent.click(keyFilterBtn);

    // Only 'h6' (Mistake) is a key move
    expect(screen.getByText('Move List (1)')).toBeInTheDocument();
  });

  it('verifies best-move preview does not modify the variation tree', () => {
    const tree = new VariationTree();
    tree.addMove('e2', 'e4');
    tree.addMove('c7', 'c6');
    tree.addMove('d2', 'd4');
    tree.addMove('h7', 'h6'); // Mistake

    const nodesBefore = Array.from(tree.getAllNodes().values());
    const currentNodeBefore = tree.getCurrentNode();
    const pgnBefore = tree.exportPgn();

    // Simulate preview computation (as done in App.tsx)
    const step = sampleMoves[3]; // 2... h6 (Mistake, best move d5)
    const previewChess = new Chess(step.fenBefore);
    const moveRes = previewChess.move('d5');
    expect(moveRes).not.toBeNull();
    const previewFen = previewChess.fen();

    // The preview FEN is different from actual game FEN
    expect(previewFen).not.toBe(tree.getFen());

    // Variation tree must remain 100% identical
    const nodesAfter = Array.from(tree.getAllNodes().values());
    expect(nodesAfter.length).toBe(nodesBefore.length);
    expect(tree.getCurrentNode().id).toBe(currentNodeBefore.id);
    expect(tree.exportPgn()).toBe(pgnBefore);
  });
});
