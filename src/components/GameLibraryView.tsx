import React, { useState, useMemo } from 'react';
import { 
  FolderOpen, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Copy, 
  Edit3, 
  Upload, 
  Award, 
  FileText,
  Calendar,
  Check,
  X
} from 'lucide-react';
import { SavedGame } from '../types/storage';
import { CURRENT_REVIEW_SCHEMA_VERSION } from '../types/chess';

export interface GameLibraryViewProps {
  games: SavedGame[];
  activeGameId: string | null;
  onOpenGame: (game: SavedGame) => void;
  onSaveCurrentGame: (title?: string) => void;
  onDeleteGame: (gameId: string) => void;
  onDuplicateGame: (game: SavedGame) => void;
  onRenameGame: (gameId: string, newTitle: string) => void;
  onImportMultiPgn: (pgnText: string) => Promise<number>;
  onExportMultiPgn: (gameIds?: string[]) => void;
  onExportBackup: () => void;
  onImportBackup: (backupJson: string, mode: 'overwrite' | 'merge') => Promise<void>;
}

export const GameLibraryView: React.FC<GameLibraryViewProps> = ({
  games,
  activeGameId,
  onOpenGame,
  onSaveCurrentGame,
  onDeleteGame,
  onDuplicateGame,
  onRenameGame,
  onImportMultiPgn,
  onExportMultiPgn,
  onExportBackup,
  onImportBackup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Deletion modal confirmation
  const [gameToDelete, setGameToDelete] = useState<SavedGame | null>(null);

  // Rename modal or state
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Backup restore modal
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupJsonText, setBackupJsonText] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Multi-PGN import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [pgnInputText, setPgnInputText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Filtered & sorted game list
  const filteredGames = useMemo(() => {
    let result = [...games];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((g) => {
        return (
          g.title.toLowerCase().includes(q) ||
          (g.metadata.white || '').toLowerCase().includes(q) ||
          (g.metadata.black || '').toLowerCase().includes(q) ||
          (g.metadata.event || '').toLowerCase().includes(q) ||
          (g.openingName || '').toLowerCase().includes(q) ||
          (g.eco || '').toLowerCase().includes(q)
        );
      });
    }

    // Default sort by updatedAt descending (newest first)
    result.sort((a, b) => b.updatedAt - a.updatedAt);

    return result;
  }, [games, searchQuery]);

  const handleStartRename = (game: SavedGame) => {
    setEditingGameId(game.id);
    setNewTitle(game.title);
  };

  const handleConfirmRename = () => {
    if (editingGameId && newTitle.trim()) {
      onRenameGame(editingGameId, newTitle.trim());
    }
    setEditingGameId(null);
  };

  const handleMultiPgnImportSubmit = async () => {
    if (!pgnInputText.trim()) return;
    try {
      const count = await onImportMultiPgn(pgnInputText);
      setImportStatus(`Successfully imported ${count} game${count === 1 ? '' : 's'}.`);
      setTimeout(() => {
        setShowImportModal(false);
        setPgnInputText('');
        setImportStatus(null);
      }, 1000);
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleFilePgnUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        try {
          const count = await onImportMultiPgn(text);
          alert(`Successfully imported ${count} game${count === 1 ? '' : 's'} from ${file.name}.`);
        } catch (err: any) {
          alert(`Failed to import PGN: ${err.message}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setBackupJsonText(text);
        setShowRestoreModal(true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!backupJsonText.trim()) return;
    try {
      setRestoreError(null);
      await onImportBackup(backupJsonText, restoreMode);
      setShowRestoreModal(false);
      setBackupJsonText('');
      alert('Library backup restored successfully!');
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to restore backup');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 text-xs text-[#F3EFFB] overflow-y-auto pr-1">
      {/* 1. Header Toolbar */}
      <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#B7A5E8]" />
            <h3 className="font-bold text-[#F3EFFB] text-sm tracking-wide">Game Library</h3>
          </div>
          <span className="text-[10px] text-[#B8AFD1] font-mono">
            {games.length} {games.length === 1 ? 'game' : 'games'} saved
          </span>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSaveCurrentGame()}
            className="py-2.5 px-3 bg-[#B7A5E8] hover:bg-[#C4B5FD] text-[#171525] rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition shadow-xs border border-[#B7A5E8]/40"
            title="Save current board game to library"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Save Active Game</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="py-2.5 px-3 bg-[#201D35] hover:bg-[#332D4D] text-[#F3EFFB] border border-[#443B60] hover:border-[#B7A5E8]/40 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition"
            title="Import single or multiple games from PGN"
          >
            <Upload className="w-3.5 h-3.5 text-[#B7A5E8]" />
            <span>Import PGN</span>
          </button>
        </div>

        {/* Backup & Export Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-[#443B60] text-[10px] text-[#B8AFD1]">
          <div className="flex gap-2">
            <button
              onClick={onExportBackup}
              className="text-[#B7A5E8] hover:underline flex items-center gap-1 font-semibold tracking-wide"
              title="Download entire library as JSON backup"
            >
              <Download className="w-3 h-3" /> Backup Library
            </button>
            <span>•</span>
            <label className="text-[#B8AFD1] hover:text-[#F3EFFB] cursor-pointer flex items-center gap-1 font-medium">
              <Upload className="w-3 h-3" /> Restore Backup
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFileRestoreUpload} 
                className="hidden" 
              />
            </label>
          </div>

          {games.length > 0 && (
            <button
              onClick={() => onExportMultiPgn()}
              className="text-[#B8AFD1] hover:text-[#F3EFFB] flex items-center gap-1 font-medium"
              title="Export all games into a single PGN file"
            >
              <FileText className="w-3 h-3" /> Export All PGN
            </button>
          )}
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="bg-[#292440] p-3 rounded-2xl border border-[#443B60] shadow-xs">
        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#B8AFD1] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search players, event, opening, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#201D35] border border-[#443B60] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F3EFFB] placeholder-[#8C81A8] focus:outline-none focus:border-[#B7A5E8]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-[#B8AFD1] hover:text-[#F3EFFB]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Games List - Responsive Grid for Wider Layout */}
      <div className="flex-1 min-h-[220px]">
        {filteredGames.length === 0 ? (
          <div className="bg-[#292440] p-8 rounded-2xl border border-[#443B60] text-center space-y-2 shadow-xs">
            <FolderOpen className="w-8 h-8 text-[#B7A5E8]/40 mx-auto" />
            <p className="text-[#B8AFD1] text-xs font-medium">
              {games.length === 0 ? 'No games saved in your library yet.' : 'No games match your search.'}
            </p>
            {games.length === 0 && (
              <button
                onClick={() => onSaveCurrentGame()}
                className="mt-2 py-2 px-4 bg-[#B7A5E8] hover:bg-[#C4B5FD] text-[#171525] font-semibold text-xs rounded-xl transition shadow-xs tracking-wide"
              >
                Save Current Board to Library
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
            {filteredGames.map((game) => {
              const isActive = activeGameId === game.id;
              const res = game.metadata.result || '*';
              const moveCount = Math.ceil((game.treeNodes?.length || 1) / 2);

              return (
                <div
                  key={game.id}
                  className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-2.5 ${
                    isActive 
                      ? 'border-[#B7A5E8] bg-[#332D4D] shadow-xs' 
                      : 'border-[#443B60] bg-[#292440] hover:border-[#B7A5E8]/40 hover:bg-[#332D4D]/60 shadow-xs'
                  }`}
                >
                  {/* Title & Result Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingGameId === game.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="bg-[#201D35] border border-[#B7A5E8] rounded-xl px-2.5 py-1 text-xs text-[#F3EFFB] w-full focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={handleConfirmRename}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingGameId(null)}
                            className="text-[#B8AFD1] hover:text-[#F3EFFB]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h4 
                          className="font-semibold text-[#F3EFFB] text-xs truncate cursor-pointer hover:text-[#B7A5E8] transition"
                          onClick={() => onOpenGame(game)}
                          title={game.title}
                        >
                          {game.title}
                        </h4>
                      )}

                      {/* Players & Ratings */}
                      {(game.metadata.white || game.metadata.black) && (
                        <div className="text-[11px] text-[#B8AFD1] font-medium truncate pt-0.5">
                          <span>{game.metadata.white || 'White'}</span>
                          {game.metadata.whiteElo && <span className="text-[#B8AFD1] font-mono text-[10px] ml-0.5">({game.metadata.whiteElo})</span>}
                          <span className="text-[#8C81A8] mx-1">vs</span>
                          <span>{game.metadata.black || 'Black'}</span>
                          {game.metadata.blackElo && <span className="text-[#B8AFD1] font-mono text-[10px] ml-0.5">({game.metadata.blackElo})</span>}
                        </div>
                      )}

                      {/* Subtitle / Details */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#B8AFD1] pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-[#B7A5E8]" />
                          {game.metadata.date || new Date(game.createdAt).toISOString().slice(0, 10)}
                        </span>
                        <span>•</span>
                        <span>{moveCount} moves</span>
                        {game.eco && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[#B7A5E8] font-medium">{game.eco}</span>
                          </>
                        )}
                        {game.openingName && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]" title={game.openingName}>{game.openingName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Result Pill */}
                    <span
                      className={`font-mono font-medium text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                        res === '1-0'
                          ? 'bg-[#B7A5E8]/20 text-[#B7A5E8] border-[#B7A5E8]/35'
                          : res === '0-1'
                          ? 'bg-[#d3503c]/20 text-[#d3503c] border-[#d3503c]/35'
                          : res === '1/2-1/2'
                          ? 'bg-[#B7A5E8]/15 text-[#B8AFD1] border-[#443B60]'
                          : 'bg-white/[0.05] text-[#B8AFD1] border-[#443B60]'
                      }`}
                    >
                      {res}
                    </span>
                  </div>

                  {/* Review summary badges if reviewed */}
                  {game.reviewReport && (
                    <div className="flex items-center justify-between bg-[#201D35] px-2.5 py-1.5 rounded-xl text-[10px] border border-[#443B60]">
                      <span className="flex items-center gap-1 text-[#B8AFD1]">
                        <Award className="w-3 h-3 text-[#B7A5E8]" />
                        Accuracy:
                      </span>
                      {game.reviewReport.schemaVersion === CURRENT_REVIEW_SCHEMA_VERSION ? (
                        <div className="flex items-center gap-3 font-mono font-medium">
                          <span className="text-[#F3EFFB]">
                            W: <span className="text-[#B7A5E8]">{game.reviewReport.whiteAccuracy}%</span>
                          </span>
                          <span className="text-[#F3EFFB]">
                            B: <span className="text-[#B7A5E8]">{game.reviewReport.blackAccuracy}%</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#B7A5E8] font-mono text-[9px]">Re-analysis needed</span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons Toolbar */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#443B60] text-[10px]">
                    <button
                      onClick={() => onOpenGame(game)}
                      className="text-[#B7A5E8] hover:text-[#F3EFFB] font-medium flex items-center gap-1 transition"
                    >
                      Open in Board
                    </button>

                    <div className="flex items-center gap-2 text-[#B8AFD1]">
                      <button
                        onClick={() => handleStartRename(game)}
                        className="hover:text-[#F3EFFB] transition p-1 hover:bg-white/[0.06] rounded-lg"
                        title="Rename game"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicateGame(game)}
                        className="hover:text-[#F3EFFB] transition p-1 hover:bg-white/[0.06] rounded-lg"
                        title="Duplicate game"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onExportMultiPgn([game.id])}
                        className="hover:text-[#F3EFFB] transition p-1 hover:bg-white/[0.06] rounded-lg"
                        title="Download PGN"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setGameToDelete(game)}
                        className="hover:text-[#d3503c] transition p-1 hover:bg-[#d3503c]/15 rounded-lg"
                        title="Delete game"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {gameToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#292440] border border-[#443B60] p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl text-[#F3EFFB]">
            <h4 className="font-bold text-[#d3503c] text-sm flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />
              Delete Saved Game?
            </h4>
            <p className="text-xs text-[#B8AFD1]">
              Are you sure you want to delete <strong className="text-[#F3EFFB]">"{gameToDelete.title}"</strong>? This will permanently remove its moves, variations, and review reports.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setGameToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#201D35] text-[#B8AFD1] border border-[#443B60] hover:text-[#F3EFFB] hover:bg-[#332D4D] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-delete-game-btn"
                onClick={() => {
                  onDeleteGame(gameToDelete.id);
                  setGameToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#d3503c] hover:bg-[#b8412f] text-white font-medium text-xs shadow-xs"
              >
                Delete Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-PGN Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#292440] border border-[#443B60] p-5 rounded-2xl max-w-md w-full space-y-3 shadow-2xl text-[#F3EFFB]">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-[#F3EFFB] text-sm flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#B7A5E8]" />
                Import Single or Multi-Game PGN
              </h4>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatus(null);
                }}
                className="text-[#B8AFD1] hover:text-[#F3EFFB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#B8AFD1]">
              Paste standard PGN text or multiple games separated by headers. Valid games will be added to your library.
            </p>

            <textarea
              rows={6}
              value={pgnInputText}
              onChange={(e) => setPgnInputText(e.target.value)}
              placeholder={`[Event "World Championship"]\n[White "Carlsen"]\n[Black "Nepo"]\n\n1. e4 e5 ...`}
              className="w-full bg-[#201D35] border border-[#443B60] rounded-xl p-2.5 text-xs font-mono text-[#F3EFFB] placeholder-[#8C81A8] focus:outline-none focus:border-[#B7A5E8]"
            />

            <div className="flex items-center justify-between text-xs">
              <label className="text-xs text-[#B7A5E8] hover:underline cursor-pointer flex items-center gap-1 font-medium">
                <Upload className="w-3.5 h-3.5" /> Upload .pgn file
                <input 
                  type="file" 
                  accept=".pgn" 
                  onChange={handleFilePgnUpload} 
                  className="hidden" 
                />
              </label>

              {importStatus && (
                <span className="text-[11px] text-[#B7A5E8] font-medium">
                  {importStatus}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#443B60]">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatus(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#201D35] text-[#B8AFD1] border border-[#443B60] hover:text-[#F3EFFB] hover:bg-[#332D4D] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleMultiPgnImportSubmit}
                disabled={!pgnInputText.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-[#B7A5E8] hover:bg-[#C4B5FD] disabled:bg-[#201D35] disabled:text-[#8C81A8] text-[#171525] font-semibold text-xs shadow-xs"
              >
                Import Games
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#292440] border border-[#443B60] p-5 rounded-2xl max-w-md w-full space-y-3 shadow-2xl text-[#F3EFFB]">
            <h4 className="font-bold text-[#F3EFFB] text-sm flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#B7A5E8]" />
              Restore RazborChess Library Backup
            </h4>
            <p className="text-xs text-[#B8AFD1]">
              Choose how you would like to import the library backup:
            </p>

            <div className="space-y-2">
              <label className="flex items-start gap-2 bg-[#201D35] p-3 rounded-xl border border-[#443B60] cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                  className="mt-0.5 accent-[#B7A5E8]"
                />
                <div>
                  <span className="font-semibold text-[#F3EFFB] block text-xs">Merge with Existing Library (Safe)</span>
                  <span className="text-[11px] text-[#B8AFD1]">Keeps your existing saved games and adds new non-duplicate games.</span>
                </div>
              </label>

              <label className="flex items-start gap-2 bg-[#d3503c]/15 p-3 rounded-xl border border-[#d3503c]/30 cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  value="overwrite"
                  checked={restoreMode === 'overwrite'}
                  onChange={() => setRestoreMode('overwrite')}
                  className="mt-0.5 accent-[#d3503c]"
                />
                <div>
                  <span className="font-semibold text-[#F3EFFB] block text-xs">Overwrite Library</span>
                  <span className="text-[11px] text-[#B8AFD1]">Replaces all currently saved games with the backup file.</span>
                </div>
              </label>
            </div>

            {restoreError && (
              <div className="text-[#d3503c] text-xs bg-[#d3503c]/15 p-2.5 rounded-xl border border-[#d3503c]/30">
                {restoreError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#443B60]">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreError(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#201D35] text-[#B8AFD1] border border-[#443B60] hover:text-[#F3EFFB] hover:bg-[#332D4D] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-3.5 py-1.5 rounded-xl bg-[#B7A5E8] hover:bg-[#C4B5FD] text-[#171525] font-semibold text-xs shadow-xs"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
