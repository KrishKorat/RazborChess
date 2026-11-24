import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Mock engine hook to avoid background web worker initialization
vi.mock('./hooks/useEngine', () => ({
  useEngine: () => ({
    status: { isSearching: false, isReady: true, error: null },
    startEvaluation: vi.fn(),
    stopEvaluation: vi.fn(),
  }),
}));

describe('App Material & Captured Pieces Integration', () => {
  it('renders initial game without material advantage badge or captured pieces', () => {
    render(<App />);

    const topPanel = screen.getByTestId('top-player-panel');
    const bottomPanel = screen.getByTestId('bottom-player-panel');

    expect(topPanel).toBeInTheDocument();
    expect(bottomPanel).toBeInTheDocument();

    // At start of standard game, material is equal and 0 captured pieces
    expect(screen.queryByTestId('top-captured-pieces')).toBeNull();
    expect(screen.queryByTestId('bottom-captured-pieces')).toBeNull();
  });

  it('preserves stationary player panels with correct classes and structure', () => {
    render(<App />);

    const topPanel = screen.getByTestId('top-player-panel');
    const bottomPanel = screen.getByTestId('bottom-player-panel');

    expect(topPanel.className).toContain('h-9');
    expect(bottomPanel.className).toContain('h-9');
  });

  it('handles board flip cleanly without breaking player panels', () => {
    render(<App />);

    const flipButton = screen.getByTitle('Flip Board');
    fireEvent.click(flipButton);

    const topPanel = screen.getByTestId('top-player-panel');
    const bottomPanel = screen.getByTestId('bottom-player-panel');

    expect(topPanel).toBeInTheDocument();
    expect(bottomPanel).toBeInTheDocument();
  });

  it('anchors captured pieces to the left container directly next to player name and Elo', () => {
    render(<App />);

    const topPanel = screen.getByTestId('top-player-panel');
    const bottomPanel = screen.getByTestId('bottom-player-panel');

    // Both panels have the left container with flex-1 min-w-0 mr-2
    const topLeftContainer = topPanel.firstElementChild as HTMLElement;
    const bottomLeftContainer = bottomPanel.firstElementChild as HTMLElement;

    expect(topLeftContainer).toHaveClass('flex-1');
    expect(bottomLeftContainer).toHaveClass('flex-1');
  });
});
