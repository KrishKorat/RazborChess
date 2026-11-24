import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapturedPiecesDisplay } from './CapturedPiecesDisplay';

describe('CapturedPiecesDisplay', () => {
  it('renders nothing when there are no captured pieces and advantage is 0', () => {
    const { container } = render(
      <CapturedPiecesDisplay captured={[]} pieceColor="b" advantage={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders captured piece icons with counts when count > 1', () => {
    render(
      <CapturedPiecesDisplay
        captured={[
          { type: 'p', count: 3 },
          { type: 'n', count: 1 },
        ]}
        pieceColor="b"
        advantage={0}
      />
    );

    expect(screen.getByTestId('captured-pieces-panel')).toBeInTheDocument();
    // Count '3' should be shown for pawns, but knight (count 1) doesn't show number
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('1')).toBeNull();
    // No advantage badge when advantage is 0
    expect(screen.queryByTestId('material-advantage')).toBeNull();
  });

  it('renders material advantage badge when player is ahead', () => {
    render(
      <CapturedPiecesDisplay
        captured={[{ type: 'p', count: 1 }]}
        pieceColor="w"
        advantage={3}
      />
    );

    const advantageBadge = screen.getByTestId('material-advantage');
    expect(advantageBadge).toBeInTheDocument();
    expect(advantageBadge).toHaveTextContent('+3');
  });

  it('renders advantage badge even if piece array is empty (e.g. theoretical imbalance)', () => {
    render(
      <CapturedPiecesDisplay
        captured={[]}
        pieceColor="b"
        advantage={2}
      />
    );

    const advantageBadge = screen.getByTestId('material-advantage');
    expect(advantageBadge).toBeInTheDocument();
    expect(advantageBadge).toHaveTextContent('+2');
  });
});
