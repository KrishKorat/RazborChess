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
    <div className="flex flex-col h-full space-y-3 text-xs text-[#F3EFFB] overflow-y-auto pr-1">
      {/* 1. Header & Filter Bar */}
      <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#B7A5E8]" />
            <h3 className="font-semibold text-[#F3EFFB] text-sm">Game & Review Statistics</h3>
          </div>
          <span className="text-[10px] text-[#B8AFD1] font-mono">
            {stats.totalGames} {stats.totalGames === 1 ? 'game' : 'games'} considered
          </span>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] pt-1 border-t border-[#443B60]">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[#B8AFD1]">Date:</span>
            <select
              value={filter.dateRange}
              onChange={(e) => setFilter({ ...filter, dateRange: e.target.value as any })}
              className="bg-[#201D35] border border-[#443B60] text-[10px] text-[#F3EFFB] rounded-xl px-2 py-0.5 focus:outline-none"
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
            <span className="text-[#B8AFD1]">Side:</span>
            {(['all', 'white', 'black'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFilter({ ...filter, color: c })}
                className={`px-2 py-0.5 rounded-xl capitalize transition border ${
                  filter.color === c
                    ? 'bg-[#B7A5E8] text-[#171525] font-semibold border-[#B7A5E8]/40 shadow-xs'
                    : 'bg-[#201D35] text-[#B8AFD1] border-[#443B60] hover:text-[#F3EFFB]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Result Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[#B8AFD1] font-medium text-[10px]">Result:</span>
            {(['all', 'win', 'loss', 'draw'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilter({ ...filter, result: r })}
                className={`px-2 py-0.5 rounded-xl capitalize transition border font-semibold text-[10px] ${
                  filter.result === r
                    ? 'bg-[#B7A5E8] text-[#171525] border-[#B7A5E8]/40 shadow-xs'
                    : 'bg-[#201D35] text-[#B8AFD1] border-[#443B60] hover:text-[#F3EFFB]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Reviewed Only Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer text-[10px] text-[#B8AFD1]">
          <input
            type="checkbox"
            checked={filter.onlyReviewed}
            onChange={(e) => setFilter({ ...filter, onlyReviewed: e.target.checked })}
            className="rounded bg-[#201D35] border-[#443B60] text-[#B7A5E8] accent-[#B7A5E8] focus:ring-0 cursor-pointer"
          />
          <span>Show only games with completed Stockfish reviews</span>
        </label>
      </div>

      {stats.totalGames === 0 ? (
        <div className="bg-[#292440] p-8 rounded-2xl border border-[#443B60] text-center space-y-2 shadow-xs">
          <BarChart3 className="w-8 h-8 text-[#B8AFD1] mx-auto" />
          <p className="text-[#B8AFD1] text-xs">No saved games found matching the selected filters.</p>
        </div>
      ) : (
        <>
          {/* 2. Key Metrics Summary Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Win Rate Card */}
            <div className="bg-[#292440] p-3 rounded-2xl border border-[#443B60] space-y-1 shadow-xs">
              <span className="text-[10px] text-[#B8AFD1] uppercase font-semibold tracking-wider flex items-center gap-1">
                <Percent className="w-3 h-3 text-[#B7A5E8]" />
                Win Rate
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#F3EFFB]">{stats.winRate}%</span>
                <span className="text-[10px] text-[#B8AFD1] font-mono">
                  {stats.whiteWins}W / {stats.draws}D / {stats.blackWins}L
                </span>
              </div>
              <div className="text-[10px] text-[#B8AFD1]">
                {stats.totalGames} total games ({stats.totalReviewed} reviewed)
              </div>
            </div>

            {/* Average Accuracy Card */}
            <div className="bg-[#292440] p-3 rounded-2xl border border-[#443B60] space-y-1 shadow-xs">
              <span className="text-[10px] text-[#B8AFD1] uppercase font-semibold tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3 text-[#B7A5E8]" />
                Avg Accuracy
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#F3EFFB]">
                  {stats.avgWhiteAccuracy !== null ? `${stats.avgWhiteAccuracy}%` : 'N/A'}
                </span>
                {stats.avgBlackAccuracy !== null && (
                  <span className="text-xs font-mono text-[#B8AFD1]">
                    (B: {stats.avgBlackAccuracy}%)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#B8AFD1]">
                Avg ACPL: <span className="font-mono text-[#B7A5E8] font-semibold">{stats.avgAcpl !== null ? `${stats.avgAcpl} cp` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* 3. Move Classification Aggregation */}
          <div className="bg-[#292440] p-3 rounded-2xl border border-[#443B60] space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-[11px] font-semibold uppercase tracking-wider text-[#B7A5E8]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B7A5E8]" />
                Move Classifications Across All Games
              </span>
              <span className="text-[10px] text-[#B8AFD1] font-mono">
                {stats.totalMovesAnalyzed} moves analyzed
              </span>
            </div>

            {stats.totalReviewed === 0 ? (
              <p className="text-[11px] text-[#B8AFD1] py-2">
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
                      className={`p-1.5 rounded-xl border ${conf.bgColor} ${conf.borderColor} flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`font-mono font-bold ${conf.color}`}>{conf.symbol}</span>
                        <span className="text-[#F3EFFB] font-medium truncate max-w-[60px]">{conf.label}</span>
                      </div>
                      <span className={`font-mono font-bold ${count > 0 ? conf.color : 'text-[#B8AFD1]'}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Phase Performance Breakdown */}
          <div className="bg-[#292440] p-3 rounded-2xl border border-[#443B60] space-y-1.5 shadow-xs">
            <span className="text-[11px] font-semibold text-[#F3EFFB] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#B7A5E8]" />
              Phase Accuracy Average
            </span>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="bg-[#201D35] p-2 rounded-xl border border-[#443B60]">
                <div className="text-[#B8AFD1] uppercase font-semibold text-[9px] mb-0.5">Opening</div>
                <div className="font-mono text-[#F3EFFB] text-xs font-bold">
                  {stats.phaseAccuracy.opening !== null ? `${stats.phaseAccuracy.opening}%` : 'N/A'}
                </div>
              </div>

              <div className="bg-[#201D35] p-2 rounded-xl border border-[#443B60]">
                <div className="text-[#B8AFD1] uppercase font-semibold text-[9px] mb-0.5">Middlegame</div>
                <div className="font-mono text-[#F3EFFB] text-xs font-bold">
                  {stats.phaseAccuracy.middlegame !== null ? `${stats.phaseAccuracy.middlegame}%` : 'N/A'}
                </div>
              </div>

              <div className="bg-[#201D35] p-2 rounded-xl border border-[#443B60]">
                <div className="text-[#B8AFD1] uppercase font-semibold text-[9px] mb-0.5">Endgame</div>
                <div className="font-mono text-[#F3EFFB] text-xs font-bold">
                  {stats.phaseAccuracy.endgame !== null ? `${stats.phaseAccuracy.endgame}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Performance History Table */}
          {stats.performanceHistory.length > 0 && (
            <div className="bg-[#292440] p-3 rounded-2xl border border-[#443B60] space-y-2 shadow-xs">
              <span className="text-[11px] font-semibold text-[#F3EFFB] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#B7A5E8]" />
                Recent Reviewed Matches
              </span>

              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                {stats.performanceHistory.slice(0, 10).map((h, idx) => (
                  <div
                    key={`${h.gameId}_${idx}`}
                    onClick={() => onOpenGame && onOpenGame(h.gameId)}
                    className="p-1.5 rounded-xl bg-[#201D35] hover:bg-white/[0.06] border border-[#443B60] text-[10px] flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#B8AFD1] font-mono text-[9px]">{h.date}</span>
                      <span className="text-[#F3EFFB] font-medium truncate max-w-[130px]">
                        {h.white} vs {h.black}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-[#B8AFD1] font-bold">{h.result}</span>
                      {typeof h.whiteAcc === 'number' && (
                        <span className="text-[#B7A5E8] font-bold">
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
