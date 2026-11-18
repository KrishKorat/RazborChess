import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChessBoardView } from './ChessBoardView';
import { getClassificationSquareHighlight, CLASSIFICATION_CONFIG } from '../services/review/classificationDisplay';
import { MoveClassification } from '../types/chess';

// Mock react-chessboard to capture customSquareStyles and board colors
let capturedProps: any = null;
vi.mock('react-chessboard', () => {
  return {
    Chessboard: (props: any) => {
      capturedProps = props;
      return <div data-testid="mock-chessboard" />;
    },
  };
});

describe('Classification Square Highlighting & Visual Styling', () => {
  const dummyProps = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    isFlipped: false,
    isCheck: false,
    onMakeMove: vi.fn(),
    onGetLegalMoves: vi.fn().mockReturnValue([]),
    isPromotionMove: vi.fn().mockReturnValue(false),
    turnColor: 'w' as const,
  };

  const classifications: MoveClassification[] = [
    'brilliant',
    'great',
    'best',
    'excellent',
    'good',
    'book',
    'inaccuracy',
    'mistake',
    'blunder',
    'missed_win',
    'forced',
  ];

  it('provides matching hex and RGBA highlight colors for all canonical classifications', () => {
    for (const c of classifications) {
      const config = CLASSIFICATION_CONFIG[c];
      expect(config).toBeDefined();
      expect(config.hex).toMatch(/^#[0-9a-fA-F]{6}$/);

      const highlights = getClassificationSquareHighlight(c);
      expect(highlights.sourceRgba).toContain('rgba(');
      expect(highlights.targetRgba).toContain('rgba(');
      expect(config.sourceHighlight).toBe(highlights.sourceRgba);
      expect(config.targetHighlight).toBe(highlights.targetRgba);
    }
  });

  it('applies classification highlight to both origin and destination squares on White move', () => {
    const classification: MoveClassification = 'best';
    const highlightExpected = getClassificationSquareHighlight(classification);

    render(
      <ChessBoardView
        {...dummyProps}
        classificationHighlight={{
          from: 'e2',
          to: 'e4',
          classification,
        }}
      />
    );

    expect(capturedProps).not.toBeNull();
    const squareStyles = capturedProps.customSquareStyles;
    expect(squareStyles).toBeDefined();
    expect(squareStyles['e2']).toBeDefined();
    expect(squareStyles['e2'].backgroundColor).toBe(highlightExpected.sourceRgba);
    expect(squareStyles['to'] || squareStyles['e4']).toBeDefined();
    expect(squareStyles['e4'].backgroundColor).toBe(highlightExpected.targetRgba);
  });

  it('applies classification highlight to both origin and destination squares on Black move', () => {
    const classification: MoveClassification = 'brilliant';
    const highlightExpected = getClassificationSquareHighlight(classification);

    render(
      <ChessBoardView
        {...dummyProps}
        fen="rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"
        turnColor="b"
        classificationHighlight={{
          from: 'c7',
          to: 'c5',
          classification,
        }}
      />
    );

    expect(capturedProps).not.toBeNull();
    const squareStyles = capturedProps.customSquareStyles;
    expect(squareStyles['c7']).toBeDefined();
    expect(squareStyles['c7'].backgroundColor).toBe(highlightExpected.sourceRgba);
    expect(squareStyles['c5']).toBeDefined();
    expect(squareStyles['c5'].backgroundColor).toBe(highlightExpected.targetRgba);
  });

  it('classification highlight takes precedence over default lastMove highlight', () => {
    const blunderHighlight = getClassificationSquareHighlight('blunder');

    render(
      <ChessBoardView
        {...dummyProps}
        lastMove={{ from: 'g1', to: 'f3' }}
        classificationHighlight={{
          from: 'g1',
          to: 'f3',
          classification: 'blunder',
        }}
      />
    );

    expect(capturedProps).not.toBeNull();
    const squareStyles = capturedProps.customSquareStyles;
    expect(squareStyles['g1'].backgroundColor).toBe(blunderHighlight.sourceRgba);
    expect(squareStyles['f3'].backgroundColor).toBe(blunderHighlight.targetRgba);
    // Should NOT be the default lastMove color
    expect(squareStyles['g1'].backgroundColor).not.toBe('rgba(102, 133, 219, 0.30)');
    expect(squareStyles['f3'].backgroundColor).not.toBe('rgba(102, 133, 219, 0.45)');
  });

  it('uses refined feminine blue palette for board squares', () => {
    render(<ChessBoardView {...dummyProps} />);

    expect(capturedProps.customDarkSquareStyle).toEqual({ backgroundColor: '#4E6F9F' });
    expect(capturedProps.customLightSquareStyle).toEqual({ backgroundColor: '#DFE7F5' });
  });
});
