import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  ShieldCheck, 
  Layers, 
  Percent
} from 'lucide-react';
import { SavedGame, StatsFilter } from '../types/storage';
import { computeAggregatedStats } from '../services/storage/statsService';
import { CLASSIFICATION_CONFIG } from './GameReviewDashboard';
import { MoveClassification } from '../types/chess';

export interface GameStatsDashboardProps {
  games: SavedGame[];
  onOpenGame?: (gameId: string) => void;
}

export const GameStatsDashboard: React.FC<GameStatsDashboardProps> = ({
  games,
  onOpenGame,
}) => {
  const [filter, setFilter] = useState<StatsFilter>({
    dateRange: 'all',
    color: 'all',
    result: 'all',
    onlyReviewed: false,
  });

  const stats = useMemo(() => {
    return computeAggregatedStats(games, filter);
  }, [games, filter]);

  return (
    <div className="flex flex-col h-full space-y-3 text-xs text-[#17243B] overflow-y-auto pr-1">
      {/* 1. Header & Filter Bar */}
      <div className="bg-[#FFFFFF] p-3 rounded-md border border-[#DCE4F0] space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#7895E8]" />
            <h3 className="font-semibold text-[#10172D] text-sm">Game & Review Statistics</h3>
          </div>
          <span className="text-[10px] text-[#68758B] font-mono">
            {stats.totalGames} {stats.totalGames === 1 ? 'game' : 'games'} considered
          </span>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] pt-1 border-t border-[#DCE4F0]">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[#68758B]">Date:</span>
            <select
              value={filter.dateRange}
              onChange={(e) => setFilter({ ...filter, dateRange: e.target.value as any })}
              className="bg-[#F4F7FC] border border-[#DCE4F0] text-[10px] text-[#17243B] rounded px-1.5 py-0.5 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="year">Past Year</option>
            </select>
          </div>

          {/* Color Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[#68758B]">Side:</span>
            {(['all', 'white', 'black'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFilter({ ...filter, color: c })}
                className={`px-1.5 py-0.5 rounded capitalize transition border ${
                  filter.color === c
                    ? 'bg-[#7895E8] text-white font-bold border-[#7895E8] shadow-sm'
                    : 'bg-[#F4F7FC] text-[#68758B] border-[#DCE4F0] hover:text-[#10172D]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Result Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[#68758B]">Result:</span>
            {(['all', 'win', 'loss', 'draw'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilter({ ...filter, result: r })}
                className={`px-1.5 py-0.5 rounded capitalize transition border ${
                  filter.result === r
                    ? 'bg-[#7895E8] text-white font-bold border-[#7895E8] shadow-sm'
                    : 'bg-[#F4F7FC] text-[#68758B] border-[#DCE4F0] hover:text-[#10172D]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Reviewed Only Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer text-[10px] text-[#68758B]">
          <input
            type="checkbox"
            checked={filter.onlyReviewed}
            onChange={(e) => setFilter({ ...filter, onlyReviewed: e.target.checked })}
            className="rounded bg-[#F4F7FC] border-[#DCE4F0] text-[#7895E8] accent-[#7895E8] focus:ring-0"
          />
          <span>Show only games with completed Stockfish reviews</span>
        </label>
      </div>

      {stats.totalGames === 0 ? (
        <div className="bg-[#FFFFFF] p-8 rounded-md border border-[#DCE4F0] text-center space-y-2 shadow-sm">
          <BarChart3 className="w-8 h-8 text-[#68758B] mx-auto" />
          <p className="text-[#68758B] text-xs">No saved games found matching the selected filters.</p>
        </div>
      ) : (
        <>
          {/* 2. Key Metrics Summary Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Win Rate Card */}
            <div className="bg-[#FFFFFF] p-2.5 rounded-md border border-[#DCE4F0] space-y-1 shadow-sm">
              <span className="text-[10px] text-[#68758B] uppercase font-semibold flex items-center gap-1">
                <Percent className="w-3 h-3 text-[#7895E8]" />
                Win Rate
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#10172D]">{stats.winRate}%</span>
                <span className="text-[10px] text-[#68758B] font-mono">
                  {stats.whiteWins}W / {stats.draws}D / {stats.blackWins}L
                </span>
              </div>
              <div className="text-[10px] text-[#68758B]">
                {stats.totalGames} total games ({stats.totalReviewed} reviewed)
              </div>
            </div>

            {/* Average Accuracy Card */}
            <div className="bg-[#FFFFFF] p-2.5 rounded-md border border-[#DCE4F0] space-y-1 shadow-sm">
              <span className="text-[10px] text-[#68758B] uppercase font-semibold flex items-center gap-1">
                <Award className="w-3 h-3 text-[#7895E8]" />
                Avg Accuracy
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#10172D]">
                  {stats.avgWhiteAccuracy !== null ? `${stats.avgWhiteAccuracy}%` : 'N/A'}
                </span>
                {stats.avgBlackAccuracy !== null && (
                  <span className="text-xs font-mono text-[#68758B]">
                    (B: {stats.avgBlackAccuracy}%)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#68758B]">
                Avg ACPL: <span className="font-mono text-[#7895E8] font-bold">{stats.avgAcpl !== null ? `${stats.avgAcpl} cp` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* 3. Move Classification Aggregation */}
          <div className="bg-[#FFFFFF] p-2.5 rounded-md border border-[#DCE4F0] space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-[11px] font-semibold text-[#10172D]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#7895E8]" />
                Move Classifications Across All Games
              </span>
              <span className="text-[10px] text-[#68758B] font-mono">
                {stats.totalMovesAnalyzed} moves analyzed
              </span>
            </div>

            {stats.totalReviewed === 0 ? (
              <p className="text-[11px] text-[#68758B] py-2">
                No reviewed games yet. Run "Game Review" on games in your library to see classification statistics.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                {(
                  [
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
                  ] as MoveClassification[]
                ).map((cat) => {
                  const conf = CLASSIFICATION_CONFIG[cat];
                  const count = stats.classifications[cat] || 0;

                  return (
                    <div
                      key={cat}
                      className={`p-1.5 rounded border ${conf.bgColor} ${conf.borderColor} flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`font-mono font-bold ${conf.color}`}>{conf.symbol}</span>
                        <span className="text-[#17243B] font-medium truncate max-w-[60px]">{conf.label}</span>
                      </div>
                      <span className={`font-mono font-bold ${count > 0 ? conf.color : 'text-[#68758B]'}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Phase Performance Breakdown */}
          <div className="bg-[#FFFFFF] p-2.5 rounded-md border border-[#DCE4F0] space-y-1.5 shadow-sm">
            <span className="text-[11px] font-semibold text-[#10172D] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#7895E8]" />
              Phase Accuracy Average
            </span>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="bg-[#F4F7FC] p-2 rounded border border-[#DCE4F0]">
                <div className="text-[#68758B] uppercase font-semibold text-[9px] mb-0.5">Opening</div>
                <div className="font-mono text-[#10172D] text-xs font-bold">
                  {stats.phaseAccuracy.opening !== null ? `${stats.phaseAccuracy.opening}%` : 'N/A'}
                </div>
              </div>

              <div className="bg-[#F4F7FC] p-2 rounded border border-[#DCE4F0]">
                <div className="text-[#68758B] uppercase font-semibold text-[9px] mb-0.5">Middlegame</div>
                <div className="font-mono text-[#10172D] text-xs font-bold">
                  {stats.phaseAccuracy.middlegame !== null ? `${stats.phaseAccuracy.middlegame}%` : 'N/A'}
                </div>
              </div>

              <div className="bg-[#F4F7FC] p-2 rounded border border-[#DCE4F0]">
                <div className="text-[#68758B] uppercase font-semibold text-[9px] mb-0.5">Endgame</div>
                <div className="font-mono text-[#10172D] text-xs font-bold">
                  {stats.phaseAccuracy.endgame !== null ? `${stats.phaseAccuracy.endgame}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Performance History Table */}
          {stats.performanceHistory.length > 0 && (
            <div className="bg-[#FFFFFF] p-2.5 rounded-md border border-[#DCE4F0] space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-[#10172D] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#7895E8]" />
                Recent Reviewed Matches
              </span>

              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                {stats.performanceHistory.slice(0, 10).map((h, idx) => (
                  <div
                    key={`${h.gameId}_${idx}`}
                    onClick={() => onOpenGame && onOpenGame(h.gameId)}
                    className="p-1.5 rounded bg-[#F4F7FC] hover:bg-[#EAF1FF] border border-[#DCE4F0] text-[10px] flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#68758B] font-mono text-[9px]">{h.date}</span>
                      <span className="text-[#10172D] font-medium truncate max-w-[130px]">
                        {h.white} vs {h.black}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-[#68758B] font-bold">{h.result}</span>
                      {typeof h.whiteAcc === 'number' && (
                        <span className="text-[#7895E8] font-bold">
                          {h.whiteAcc}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
