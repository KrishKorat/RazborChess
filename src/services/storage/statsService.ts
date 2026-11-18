import { SavedGame, StatsFilter, AggregatedStats } from '../../types/storage';
import { MoveClassification, CURRENT_REVIEW_SCHEMA_VERSION } from '../../types/chess';

export function computeAggregatedStats(
  games: SavedGame[],
  filter?: Partial<StatsFilter>
): AggregatedStats {
  const now = Date.now();
  const rangeMs: Record<string, number> = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    'year': 365 * 24 * 60 * 60 * 1000,
  };

  // Apply filters
  const filtered = games.filter((g) => {
    // 1. Date Range Filter
    if (filter?.dateRange && filter.dateRange !== 'all') {
      const limit = rangeMs[filter.dateRange];
      if (limit && now - g.createdAt > limit) {
        return false;
      }
    }

    // 2. Result Filter
    if (filter?.result && filter.result !== 'all') {
      const res = g.metadata.result;
      if (filter.result === 'win') {
        if (filter.color === 'white' && res !== '1-0') return false;
        if (filter.color === 'black' && res !== '0-1') return false;
        if (filter.color === 'all' && res !== '1-0' && res !== '0-1') return false;
      } else if (filter.result === 'loss') {
        if (filter.color === 'white' && res !== '0-1') return false;
        if (filter.color === 'black' && res !== '1-0') return false;
        if (filter.color === 'all' && res !== '1-0' && res !== '0-1') return false;
      } else if (filter.result === 'draw') {
        if (res !== '1/2-1/2') return false;
      }
    }

    // 3. Only Reviewed Filter
    if (filter?.onlyReviewed && !g.reviewReport) {
      return false;
    }

    return true;
  });

  let whiteWins = 0;
  let blackWins = 0;
  let draws = 0;
  let inProgress = 0;

  let totalWhiteAccuracy = 0;
  let whiteAccuracyCount = 0;

  let totalBlackAccuracy = 0;
  let blackAccuracyCount = 0;

  let totalAcpl = 0;
  let acplCount = 0;

  let totalMovesAnalyzed = 0;

  let openingAccSum = 0;
  let openingCount = 0;
  let middlegameAccSum = 0;
  let middlegameCount = 0;
  let endgameAccSum = 0;
  let endgameCount = 0;

  const classifications: Record<MoveClassification, number> = {
    forced: 0,
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    missed_win: 0,
    book: 0,
  };

  const performanceHistory: AggregatedStats['performanceHistory'] = [];

  for (const game of filtered) {
    const res = game.metadata.result;
    if (res === '1-0') whiteWins++;
    else if (res === '0-1') blackWins++;
    else if (res === '1/2-1/2') draws++;
    else inProgress++;

    const rep = game.reviewReport;
    if (rep && rep.schemaVersion === CURRENT_REVIEW_SCHEMA_VERSION) {
      // Accuracy counts
      if (typeof rep.whiteAccuracy === 'number') {
        totalWhiteAccuracy += rep.whiteAccuracy;
        whiteAccuracyCount++;
      }
      if (typeof rep.blackAccuracy === 'number') {
        totalBlackAccuracy += rep.blackAccuracy;
        blackAccuracyCount++;
      }

      // ACPL
      if (typeof rep.whiteAcpl === 'number') {
        totalAcpl += rep.whiteAcpl;
        acplCount++;
      }
      if (typeof rep.blackAcpl === 'number') {
        totalAcpl += rep.blackAcpl;
        acplCount++;
      }

      // Move classifications & total analyzed
      totalMovesAnalyzed += rep.moves.length;

      (Object.keys(rep.classificationCounts.white) as MoveClassification[]).forEach((cat) => {
        classifications[cat] += rep.classificationCounts.white[cat] || 0;
      });
      (Object.keys(rep.classificationCounts.black) as MoveClassification[]).forEach((cat) => {
        classifications[cat] += rep.classificationCounts.black[cat] || 0;
      });

      // Phase accuracy
      if (rep.whitePhaseAccuracy.opening > 0) {
        openingAccSum += rep.whitePhaseAccuracy.opening;
        openingCount++;
      }
      if (rep.blackPhaseAccuracy.opening > 0) {
        openingAccSum += rep.blackPhaseAccuracy.opening;
        openingCount++;
      }

      if (rep.whitePhaseAccuracy.middlegame > 0) {
        middlegameAccSum += rep.whitePhaseAccuracy.middlegame;
        middlegameCount++;
      }
      if (rep.blackPhaseAccuracy.middlegame > 0) {
        middlegameAccSum += rep.blackPhaseAccuracy.middlegame;
        middlegameCount++;
      }

      if (rep.whitePhaseAccuracy.endgame > 0) {
        endgameAccSum += rep.whitePhaseAccuracy.endgame;
        endgameCount++;
      }
      if (rep.blackPhaseAccuracy.endgame > 0) {
        endgameAccSum += rep.blackPhaseAccuracy.endgame;
        endgameCount++;
      }

      // Performance history entry
      performanceHistory.push({
        date: game.metadata.date || new Date(game.createdAt).toISOString().slice(0, 10),
        gameId: game.id,
        white: game.metadata.white || 'White',
        black: game.metadata.black || 'Black',
        result: game.metadata.result || '*',
        whiteAcc: rep.whiteAccuracy,
        blackAcc: rep.blackAccuracy,
        whiteAcpl: rep.whiteAcpl,
        blackAcpl: rep.blackAcpl,
      });
    }
  }

  // Calculate Win Rate based on chosen color filter
  let decisiveWins = 0;
  let totalDecisive = 0;
  if (filter?.color === 'white') {
    decisiveWins = whiteWins;
    totalDecisive = whiteWins + blackWins + draws;
  } else if (filter?.color === 'black') {
    decisiveWins = blackWins;
    totalDecisive = whiteWins + blackWins + draws;
  } else {
    // Both sides decisive games
    decisiveWins = whiteWins + blackWins;
    totalDecisive = whiteWins + blackWins + draws;
  }

  const winRate = totalDecisive > 0 ? Math.round((decisiveWins / totalDecisive) * 1000) / 10 : 0;

  return {
    totalGames: filtered.length,
    totalReviewed: whiteAccuracyCount,
    whiteWins,
    blackWins,
    draws,
    inProgress,
    winRate,
    avgWhiteAccuracy: whiteAccuracyCount > 0 ? Math.round((totalWhiteAccuracy / whiteAccuracyCount) * 10) / 10 : null,
    avgBlackAccuracy: blackAccuracyCount > 0 ? Math.round((totalBlackAccuracy / blackAccuracyCount) * 10) / 10 : null,
    avgAcpl: acplCount > 0 ? Math.round((totalAcpl / acplCount) * 10) / 10 : null,
    totalMovesAnalyzed,
    classifications,
    phaseAccuracy: {
      opening: openingCount > 0 ? Math.round((openingAccSum / openingCount) * 10) / 10 : null,
      middlegame: middlegameCount > 0 ? Math.round((middlegameAccSum / middlegameCount) * 10) / 10 : null,
      endgame: endgameCount > 0 ? Math.round((endgameAccSum / endgameCount) * 10) / 10 : null,
    },
    performanceHistory,
  };
}
