import { describe, it, expect } from 'vitest';
import { generateMoveExplanation } from './moveExplanationService';
import { GameReviewStep } from '../../types/chess';

describe('Move Explanation Service', () => {
  const baseStep: GameReviewStep = {
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
  };

  it('explains Book moves deterministically', () => {
    const text = generateMoveExplanation({ ...baseStep, classification: 'book' });
    expect(text).toBe('Standard opening book theory.');
  });

  it('explains Brilliant moves', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      classification: 'brilliant',
      san: 'Bxh7+',
    });
    expect(text).toContain('A brilliant move!');
    expect(text).toContain('sound piece sacrifice');
  });

  it('explains Great moves', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      classification: 'great',
      san: 'Qd8+',
    });
    expect(text).toBe('A great move! The only move that maintains your advantage.');
  });

  it('explains Best move as strongest continuation', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      classification: 'best',
      winRateBefore: 50,
      winRateAfter: 50,
    });
    expect(text).toBe("You found the engine's strongest continuation.");
  });

  it('explains Best move when converting advantage', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      classification: 'best',
      winRateBefore: 70,
      winRateAfter: 90,
    });
    expect(text).toBe('You found the strongest move and converted your advantage.');
  });

  it('explains Excellent moves', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      classification: 'excellent',
    });
    expect(text).toBe("A very strong move that nearly matches the engine's top choice.");
  });

  it('explains Good moves', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      classification: 'good',
    });
    expect(text).toBe('A solid move that keeps your position sound.');
  });

  it('explains Inaccuracies with best move recommendation', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      classification: 'inaccuracy',
      bestMoveSan: 'Nf3',
    });
    expect(text).toBe('You played an inaccuracy. Nf3 was slightly more precise.');
  });

  it('explains Mistakes that give up advantage', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      classification: 'mistake',
      winRateBefore: 75,
      winRateAfter: 50,
      bestMoveSan: 'O-O',
    });
    expect(text).toBe('This move gives up a significant advantage.');
  });

  it('explains Blunder that turns a winning position into a loss', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      classification: 'blunder',
      winRateBefore: 85,
      winRateAfter: 30,
      bestMoveSan: 'Kh1',
    });
    expect(text).toBe('You turned a winning position into a loss.');
  });

  it('explains delivered checkmate', () => {
    // Scholar's mate final position
    const text = generateMoveExplanation({
      ...baseStep,
      san: 'Qxf7#',
      fenBefore: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
      fenAfter: 'r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
      classification: 'best',
    });
    expect(text).toContain('delivered checkmate');
  });

  it('explains blunder that allows a forced checkmate', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      color: 'w',
      classification: 'blunder',
      playedMoveEval: {
        score: -10000,
        depth: 14,
        mate: -2, // Black has mate in 2
        bestMove: 'd8h4',
        pv: ['d8h4'],
      },
    });
    expect(text).toContain('forced checkmate');
  });

  it('explains missed forced checkmate', () => {
    const text = generateMoveExplanation({
      ...baseStep,
      color: 'w',
      classification: 'missed_win',
      bestMoveSan: 'Qxf7#',
      bestMoveEval: {
        score: 10000,
        depth: 14,
        mate: 1, // White had mate in 1
        bestMove: 'f3f7',
        pv: ['f3f7'],
      },
      playedMoveEval: {
        score: 200,
        depth: 14,
        bestMove: 'g1f3',
        pv: ['g1f3'],
      },
    });
    expect(text).toContain('forced checkmate');
    expect(text).toContain('Qxf7#');
  });

  it('explains blunders that allow opponent to win material', () => {
    // White hangs the queen: 1. Qe4?? Nxe4
    const fenBefore = 'rnbqkb1r/pppp1ppp/5n2/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 3';
    const fenAfter = 'rnbqkb1r/pppp1ppp/5n2/4p3/4Q3/8/PPPPPPPP/RNB1KBNR b KQkq - 1 3'; // White moved Qe4, Black to move
    const text = generateMoveExplanation({
      ...baseStep,
      color: 'w',
      classification: 'blunder',
      fenBefore,
      fenAfter,
      playedMoveEval: {
        score: -600,
        depth: 14,
        bestMove: 'f6e4',
        pv: ['f6e4'], // Black knight takes queen
      },
    });
    expect(text).toContain('material');
  });

  it('generates concise move explanations for forced moves', () => {
    const textUser = generateMoveExplanation(
      {
        ...baseStep,
        color: 'w',
        classification: 'forced',
      },
      'w'
    );
    expect(textUser).toBe('This was your only legal move available.');

    const textOpponent = generateMoveExplanation(
      {
        ...baseStep,
        color: 'w',
        classification: 'forced',
      },
      'b'
    );
    expect(textOpponent).toBe("This was your opponent's only legal move.");
  });

  it('generates concise explanations with opponent perspective', () => {
    const text = generateMoveExplanation(
      {
        ...baseStep,
        color: 'w',
        classification: 'blunder',
        bestMoveSan: 'Nf3',
      },
      'b' // user is black, so white move is opponent
    );

    expect(text).toContain('Your opponent blundered');
  });
});
