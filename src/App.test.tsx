import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('RazborChess: Interactive Board & Navigation', () => {
  it('renders application brand and chessboard container', () => {
    render(<App />);
    const brandElements = screen.getAllByText(/RazborChess/i);
    expect(brandElements.length).toBeGreaterThan(0);
    expect(screen.getByText('♚')).toBeInTheDocument();
    const boardWrapper = document.getElementById('board-wrapper');
    expect(boardWrapper).toBeInTheDocument();
  });

  it('renders championship player panels without middle broadcast box', () => {
    render(<App />);
    // Middle box content must NOT be present
    expect(screen.queryByText(/LIVE CHESS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Championship Match/i)).not.toBeInTheDocument();

    // Top and bottom player panels present above and below board
    expect(screen.getByTestId('top-player-panel')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-player-panel')).toBeInTheDocument();
    expect(screen.getAllByText(/White/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Black/i).length).toBeGreaterThan(0);
  });

  it('renders navigation tabs and move controls', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Analysis/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Variations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Review$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Library/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Stats/i })).not.toBeInTheDocument();

    // Check navigation buttons exist
    expect(screen.getByTitle(/First Move/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Previous Move/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Next Move/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Last Move/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Reset to Starting Position/i)).toBeInTheDocument();
  });

  it('opens and closes the Import/Export modal', () => {
    render(<App />);
    const importBtn = screen.getByRole('button', { name: /Import/i });
    fireEvent.click(importBtn);

    expect(screen.getByText(/Import PGN \/ FEN/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste PGN/i)).toBeInTheDocument();

    // Close modal
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(screen.queryByPlaceholderText(/Paste PGN/i)).not.toBeInTheDocument();
  });

  it('toggles board flipping', () => {
    render(<App />);
    const flipBtn = screen.getByTitle(/Flip Board/i);
    expect(flipBtn).toBeInTheDocument();
    fireEvent.click(flipBtn);
  });

  it('correctly aligns player panels with board orientation and flips both faithfully', () => {
    render(<App />);

    // 1. Default unflipped orientation (White at bottom, Black at top)
    const topPanel = screen.getByTestId('top-player-panel');
    const bottomPanel = screen.getByTestId('bottom-player-panel');

    expect(topPanel).toHaveTextContent(/Black/i);
    expect(bottomPanel).toHaveTextContent(/White/i);

    // Initial position is White to move, so bottom panel should have "To Move" indicator
    expect(bottomPanel).toHaveTextContent(/To Move/i);
    expect(topPanel).not.toHaveTextContent(/To Move/i);

    // 2. Flip orientation (Black at bottom, White at top)
    const flipBtn = screen.getByTitle(/Flip Board/i);
    fireEvent.click(flipBtn);

    expect(topPanel).toHaveTextContent(/White/i);
    expect(bottomPanel).toHaveTextContent(/Black/i);

    // Initial position is still White to move, so top panel (now White) should have "To Move" indicator
    expect(topPanel).toHaveTextContent(/To Move/i);
    expect(bottomPanel).not.toHaveTextContent(/To Move/i);
  });

  it('renders Milestone 5 evaluation bar, graph and best-move arrow toggle', () => {
    render(<App />);
    // Arrow toggle button
    expect(screen.getByTitle(/Engine Best-Move Arrows/i)).toBeInTheDocument();
    // Graph title
    expect(screen.getByText(/Evaluation Graph/i)).toBeInTheDocument();
  });

  it('renders unified analysis workspace with two-column layout and game review integration', () => {
    render(<App />);
    // Single Analysis tab is active by default
    expect(screen.getByRole('button', { name: /Analysis/i })).toBeInTheDocument();
    // Standalone Review tab is removed
    expect(screen.queryByRole('button', { name: /^Review$/i })).not.toBeInTheDocument();

    // Left Column: Evaluation graph, Opening, Move List and Navigation
    expect(screen.getByText(/Evaluation Graph/i)).toBeInTheDocument();
    expect(screen.getByText(/Start position/i)).toBeInTheDocument();
    expect(screen.getByTitle(/First Move/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Next Move/i)).toBeInTheDocument();

    // Right Column: Single primary Game Review controls
    expect(screen.getAllByText(/Game Review/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Game Review Ready/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start Game Review Now/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Game Review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fast \(12\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Standard \(14\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deep \(16\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Master \(18\)/i })).toBeInTheDocument();
  });

  it('maintains responsive stacked layout structure and safe scroll alignment for narrow viewports', () => {
    const { container } = render(<App />);
    
    // Top header is present with fixed height
    const header = container.querySelector('header');
    expect(header).toHaveClass('h-14');
    expect(header).toHaveClass('shrink-0');

    // Main workspace container uses justify-start to prevent top clipping when content overflows
    const workspace = container.querySelector('.flex-1.min-h-0.flex.flex-col');
    expect(workspace).toBeInTheDocument();
    expect(workspace).toHaveClass('justify-start');
    expect(workspace).toHaveClass('xl:justify-center');
    expect(workspace).toHaveClass('overflow-y-auto');

    // Both player cards are rendered
    const topPanel = screen.getByTestId('top-player-panel');
    const bottomPanel = screen.getByTestId('bottom-player-panel');
    expect(topPanel).toBeInTheDocument();
    expect(bottomPanel).toBeInTheDocument();

    // Board wrapper is rendered between the player panels
    const boardWrapper = document.getElementById('board-wrapper');
    expect(boardWrapper).toBeInTheDocument();
  });
});
