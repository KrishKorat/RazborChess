import React, { useState, useEffect } from 'react';
import { Download, Upload, Copy, Check, FileText, X, AlertCircle } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPgn: (pgn: string) => { success: boolean; error?: string };
  onImportFen: (fen: string) => { success: boolean; error?: string };
  exportPgnText: string;
  initialTab?: 'import' | 'export';
}

const SAMPLE_GAMES = [
  {
    name: 'Morphy vs Duke of Brunswick (Opera Game, 1858)',
    pgn: `[Event "Paris Opera House"]
[Site "Paris"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
  },
  {
    name: 'Kasparov vs Topalov (Immortal, 1999)',
    pgn: `[Event "Hoogovens Group A"]
[Site "Wijk aan Zee"]
[Date "1999.01.20"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
  },
  {
    name: 'Fischer vs Byrne (Game of the Century, 1956)',
    pgn: `[Event "Third Rosenwald Trophy"]
[Site "New York"]
[Date "1956.10.17"]
[White "Donald Byrne"]
[Black "Robert James Fischer"]
[Result "0-1"]

1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`,
  },
];

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onImportPgn,
  onImportFen,
  exportPgnText,
  initialTab = 'import',
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialTab);
  const [inputText, setInputText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMessage(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleImport = () => {
    setErrorMessage(null);
    const trimmed = inputText.trim();
    if (!trimmed) {
      setErrorMessage('Please paste PGN or FEN text.');
      return;
    }

    // Check if input looks like a FEN (usually 6 fields separated by spaces with slashes)
    if (trimmed.includes('/') && trimmed.split(/\s+/).length >= 2 && !trimmed.includes('[')) {
      const res = onImportFen(trimmed);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.error || 'Invalid FEN string');
      }
      return;
    }

    // Otherwise treat as PGN
    const res = onImportPgn(trimmed);
    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Invalid PGN format');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('File exceeds size limit of 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      setErrorMessage(null);
    };
    reader.readAsText(file);
  };

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(exportPgnText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPgn = () => {
    const blob = new Blob([exportPgnText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `razborchess-game-${new Date().toISOString().slice(0, 10)}.pgn`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#292440] border border-[#443B60] rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden max-h-[85vh] text-[#F3EFFB]">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-[#443B60] bg-[#201D35] px-4">
          <div className="flex">
            <button
              onClick={() => { setActiveTab('import'); setErrorMessage(null); }}
              className={`py-3 px-4 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition ${
                activeTab === 'import'
                  ? 'text-[#B7A5E8] border-b-2 border-[#B7A5E8] bg-[#B7A5E8]/15'
                  : 'text-[#B8AFD1] hover:text-[#F3EFFB]'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-[#B7A5E8]" />
              <span>Import PGN / FEN</span>
            </button>
            <button
              onClick={() => { setActiveTab('export'); setErrorMessage(null); }}
              className={`py-3 px-4 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition ${
                activeTab === 'export'
                  ? 'text-[#B7A5E8] border-b-2 border-[#B7A5E8] bg-[#B7A5E8]/15'
                  : 'text-[#B8AFD1] hover:text-[#F3EFFB]'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-[#B7A5E8]" />
              <span>Export PGN</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#B8AFD1] hover:text-[#F3EFFB] rounded-lg hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs bg-[#292440]">
          {errorMessage && (
            <div className="bg-[#d3503c]/20 border border-[#d3503c]/40 text-[#F3EFFB] p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#d3503c] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'import' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[#F3EFFB] font-semibold tracking-wide mb-1">
                  Paste PGN Game or FEN Position:
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste PGN (e.g. 1. e4 e5 2. Nf3...) or FEN string..."
                  rows={6}
                  className="w-full bg-[#201D35] border border-[#443B60] rounded-xl p-3 text-[#F3EFFB] font-mono text-[11px] placeholder-[#8C81A8] focus:outline-none focus:border-[#B7A5E8]"
                />
              </div>

              {/* File upload */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer bg-[#201D35] hover:bg-[#332D4D] border border-[#443B60] px-3 py-1.5 rounded-xl transition text-[#F3EFFB] text-xs font-medium tracking-wide">
                  <FileText className="w-3.5 h-3.5 text-[#B7A5E8]" />
                  <span>Choose .pgn file</span>
                  <input
                    type="file"
                    accept=".pgn,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[10px] text-[#B8AFD1]">Max size: 2MB</span>
              </div>

              {/* Quick load sample games */}
              <div className="pt-2 border-t border-[#443B60]">
                <span className="block text-[#B8AFD1] text-[11px] font-semibold tracking-wide mb-1.5">
                  Load Famous Historical Games:
                </span>
                <div className="flex flex-col gap-1.5">
                  {SAMPLE_GAMES.map((game, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputText(game.pgn)}
                      className="text-left py-2 px-3 rounded-xl bg-[#201D35] hover:bg-[#332D4D] border border-[#443B60] text-[#B8AFD1] hover:text-[#F3EFFB] transition text-[11px] truncate"
                    >
                      <span className="text-[#B7A5E8]">★</span> {game.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[#F3EFFB] font-semibold tracking-wide mb-1">
                  Current Game PGN:
                </label>
                <textarea
                  readOnly
                  value={exportPgnText}
                  rows={8}
                  className="w-full bg-[#201D35] border border-[#443B60] rounded-xl p-3 text-[#F3EFFB] font-mono text-[11px] select-all focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPgn}
                  className="flex-1 py-2.5 px-3 bg-[#201D35] hover:bg-[#332D4D] text-[#F3EFFB] rounded-xl font-medium border border-[#443B60] flex items-center justify-center gap-1.5 transition tracking-wide text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#B7A5E8]" />}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
                <button
                  onClick={handleDownloadPgn}
                  className="flex-1 py-2.5 px-3 bg-[#B7A5E8] hover:bg-[#C4B5FD] text-[#171525] font-semibold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs tracking-wide text-xs border border-[#B7A5E8]/40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .pgn</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {activeTab === 'import' && (
          <div className="p-3 bg-[#201D35] border-t border-[#443B60] flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-[#B8AFD1] hover:text-[#F3EFFB] transition font-medium tracking-wide"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 text-xs bg-[#B7A5E8] hover:bg-[#C4B5FD] text-[#171525] font-semibold rounded-xl transition shadow-xs tracking-wide border border-[#B7A5E8]/40"
            >
              Load Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
