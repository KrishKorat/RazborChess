import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameLibraryView } from './GameLibraryView';
import { SavedGame } from '../types/storage';
import { CURRENT_REVIEW_SCHEMA_VERSION } from '../types/chess';

const mockGames: SavedGame[] = [
  {
    id: 'game_1',
    title: 'Magnus vs Hikaru • Sicilian Defense',
    pgn: '1. e4 c5',
    startingFen: 'startpos',
    currentFen: 'fen1',
    treeNodes: [{ id: 'root', children: ['node_1'] } as any, { id: 'node_1', children: [] } as any],
    currentNodeId: 'node_1',
    metadata: { white: 'Magnus', black: 'Hikaru', result: '1-0', date: '2026.01.01' },
    eco: 'B20',
    openingName: 'Sicilian Defense',
    createdAt: 2000,
    updatedAt: 2000,
    source: 'manual',
    reviewReport: {
      schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
      whiteAccuracy: 95.2,
      blackAccuracy: 88.4,
      whiteAcpl: 12.0,
      blackAcpl: 28.0,
      whitePhaseAccuracy: { opening: 98, middlegame: 94, endgame: 90 },
      blackPhaseAccuracy: { opening: 95, middlegame: 86, endgame: 82 },
      classificationCounts: {
        white: { forced: 0, brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0, book: 0 },
        black: { forced: 0, brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0, book: 0 },
      },
      estimatedElo: {
        white: { min: 2500, max: 2700, estimate: 2600, confidence: 'High' },
        black: { min: 2400, max: 2600, estimate: 2500, confidence: 'High' },
      },
      moves: [],
      criticalPositions: [],
    },
  },
  {
    id: 'game_2',
    title: 'Ding vs Nepo • Ruy Lopez',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    startingFen: 'startpos',
    currentFen: 'fen2',
    treeNodes: [],
    currentNodeId: 'root',
    metadata: { white: 'Ding', black: 'Nepo', result: '1/2-1/2', date: '2026.01.05' },
    eco: 'C60',
    openingName: 'Ruy Lopez',
    createdAt: 1000,
    updatedAt: 1000,
    source: 'imported',
  },
];

describe('GameLibraryView', () => {
  it('renders list of saved games with titles, accuracy, and results', () => {
    const handleOpen = vi.fn();
    render(
      <GameLibraryView
        games={mockGames}
        activeGameId="game_1"
        onOpenGame={handleOpen}
        onSaveCurrentGame={vi.fn()}
        onDeleteGame={vi.fn()}
        onDuplicateGame={vi.fn()}
        onRenameGame={vi.fn()}
        onImportMultiPgn={vi.fn()}
        onExportMultiPgn={vi.fn()}
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />
    );

    expect(screen.getByText(/Magnus vs Hikaru/i)).toBeInTheDocument();
    expect(screen.getByText(/Ding vs Nepo/i)).toBeInTheDocument();
    expect(screen.getAllByText('1-0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1/2-1/2').length).toBeGreaterThan(0);
    expect(screen.getByText('95.2%')).toBeInTheDocument();

    const openButtons = screen.getAllByText(/Open in Board/i);
    fireEvent.click(openButtons[0]);
    expect(handleOpen).toHaveBeenCalledWith(mockGames[0]);
  });

  it('filters games by search query', () => {
    render(
      <GameLibraryView
        games={mockGames}
        activeGameId={null}
        onOpenGame={vi.fn()}
        onSaveCurrentGame={vi.fn()}
        onDeleteGame={vi.fn()}
        onDuplicateGame={vi.fn()}
        onRenameGame={vi.fn()}
        onImportMultiPgn={vi.fn()}
        onExportMultiPgn={vi.fn()}
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search players, event, opening/i);
    fireEvent.change(searchInput, { target: { value: 'Ding' } });

    expect(screen.queryByText(/Magnus vs Hikaru/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Ding vs Nepo/i)).toBeInTheDocument();
  });

  it('triggers delete confirmation modal and delete action', () => {
    const handleDelete = vi.fn();
    render(
      <GameLibraryView
        games={mockGames}
        activeGameId={null}
        onOpenGame={vi.fn()}
        onSaveCurrentGame={vi.fn()}
        onDeleteGame={handleDelete}
        onDuplicateGame={vi.fn()}
        onRenameGame={vi.fn()}
        onImportMultiPgn={vi.fn()}
        onExportMultiPgn={vi.fn()}
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />
    );

    const deleteButtons = screen.getAllByTitle(/Delete game/i);
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText(/Delete Saved Game\?/i)).toBeInTheDocument();
    const confirmDeleteBtn = screen.getByTestId('confirm-delete-game-btn');
    fireEvent.click(confirmDeleteBtn);

    expect(handleDelete).toHaveBeenCalledWith('game_1');
  });

  it('triggers save active game callback', () => {
    const handleSave = vi.fn();
    render(
      <GameLibraryView
        games={mockGames}
        activeGameId={null}
        onOpenGame={vi.fn()}
        onSaveCurrentGame={handleSave}
        onDeleteGame={vi.fn()}
        onDuplicateGame={vi.fn()}
        onRenameGame={vi.fn()}
        onImportMultiPgn={vi.fn()}
        onExportMultiPgn={vi.fn()}
        onExportBackup={vi.fn()}
        onImportBackup={vi.fn()}
      />
    );

    const saveBtn = screen.getByText(/Save Active Game/i);
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalled();
  });
});
