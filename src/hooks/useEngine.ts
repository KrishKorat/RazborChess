import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StockfishService, 
  getStockfishService, 
  EngineOptions 
} from '../services/engine/stockfishService';
import { 
  EngineStatus, 
  MoveEvaluation, 
  MultiPvEvaluation 
} from '../types/chess';
import { scoreToWinPercentage } from '../services/engine/uciParser';
import { normalizeFen } from '../services/engine/evalCache';

export function useEngine(initialOptions?: Partial<EngineOptions>) {
  const engineRef = useRef<StockfishService | null>(null);
  
  const [status, setStatus] = useState<EngineStatus>({
    isReady: false,
    isSearching: false,
    version: 'Stockfish 19 WASM (connecting...)',
    depth: 0,
    maxDepth: initialOptions?.depth ?? 16,
    multiPv: initialOptions?.multiPv ?? 1,
    nps: 0,
    hashSizeMb: initialOptions?.hashSizeMb ?? 16,
  });

  const [evaluation, setEvaluation] = useState<MoveEvaluation | null>(null);
  const [multiPvLines, setMultiPvLines] = useState<MultiPvEvaluation[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEngineEnabled, setIsEngineEnabled] = useState<boolean>(true);

  // Initialize service
  useEffect(() => {
    const service = getStockfishService(initialOptions);
    engineRef.current = service;

    const unsubStatus = service.onStatus((s) => {
      setStatus(s);
    });

    const unsubEval = service.onEvaluation((primary, lines, searchFen) => {
      if (searchFen && primary) {
        primary.fen = searchFen;
      }
      setEvaluation(primary);
      setMultiPvLines(lines);
    });

    const unsubError = service.onError((err) => {
      setErrorMessage(err.message);
    });

    // Auto-initiate engine handshake
    service.init().catch((err) => {
      setErrorMessage(`Failed to start engine: ${err.message}`);
    });

    return () => {
      unsubStatus();
      unsubEval();
      unsubError();
    };
  }, []);

  const evaluatePosition = useCallback((fen: string, moves?: string[], targetDepth?: number) => {
    if (!isEngineEnabled) return;
    if (engineRef.current) {
      // Invalidate current live evaluation if FEN is changing to prevent cross-FEN bleed
      setEvaluation((prev) => {
        if (prev && prev.fen && normalizeFen(prev.fen) !== normalizeFen(fen)) {
          return null;
        }
        return prev;
      });
      setMultiPvLines((prev) => {
        if (prev.length > 0 && prev[0].fen && normalizeFen(prev[0].fen) !== normalizeFen(fen)) {
          return [];
        }
        return prev;
      });
      engineRef.current.evaluatePosition(fen, moves, targetDepth);
    }
  }, [isEngineEnabled]);

  const stopSearch = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stopSearch();
    }
  }, []);

  const updateOptions = useCallback((newOpts: Partial<EngineOptions>) => {
    if (engineRef.current) {
      engineRef.current.updateOptions(newOpts);
      setStatus(engineRef.current.getStatus());
    }
  }, []);

  const toggleEngine = useCallback((enable?: boolean) => {
    setIsEngineEnabled((prev) => {
      const next = enable !== undefined ? enable : !prev;
      if (!next && engineRef.current) {
        engineRef.current.stopSearch();
      }
      return next;
    });
  }, []);

  // Compute win rate percentage (for eval bar height)
  const winRate = evaluation 
    ? scoreToWinPercentage(evaluation.score, evaluation.mate)
    : 50;

  return {
    status,
    evaluation,
    multiPvLines,
    errorMessage,
    isEngineEnabled,
    winRate,
    evaluatePosition,
    stopSearch,
    updateOptions,
    toggleEngine,
  };
}
