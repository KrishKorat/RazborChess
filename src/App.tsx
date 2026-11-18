import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  RotateCcw, 
  RotateCw, 
  Upload, 
  Download, 
  Cpu, 
  Sliders, 
  Award, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CornerUpLeft,
  Eye,
  EyeOff,
  FolderOpen,
  Keyboard,
  ShieldCheck
} from 'lucide-react';
import { VariationTree, TreeNode } from './services/tree/variationTree';
import { Chess, Square as ChessSquare } from 'chess.js';
import { ChessBoardView } from './components/ChessBoardView';
import { VariationExplorer } from './components/VariationExplorer';
import { ImportExportModal } from './components/ImportExportModal';
import { EvaluationBar } from './components/EvaluationBar';
import { GameLibraryView } from './components/GameLibraryView';
import { UnifiedAnalysisWorkspace } from './components/UnifiedAnalysisWorkspace';
import { useEngine } from './hooks/useEngine';
import { getEvalCache, convertUciPvToSan, normalizeFen, populateEvalCacheFromReview } from './services/engine/evalCache';
import { GameReviewService, ReviewProgress } from './services/review/gameReviewService';
import { calculateMoveDeltas, classifyMove } from './services/review/moveClassifier';
import { detectGamePhase } from './services/review/phaseDetector';
import { logClassificationDetails, logClassificationPending } from './services/review/classificationLogger';
import { getStockfishService } from './services/engine/stockfishService';
import { getIndexedDbService } from './services/storage/indexedDbService';
import { parseMultiGamePgn, parsedGameToSavedGame, exportMultiGamePgn, generateGameTitle } from './services/storage/pgnLibrary';
import { GameMetadata, GameReviewReport, GameReviewStep, CURRENT_REVIEW_SCHEMA_VERSION } from './types/chess';
import { SavedGame } from './types/storage';

export default function App() {
  const [tree] = useState(() => new VariationTree());
  const [evalCache] = useState(() => getEvalCache());

  const [currentNode, setCurrentNode] = useState<TreeNode>(() => tree.getCurrentNode());
  const [fen, setFen] = useState<string>(() => tree.getFen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [metadata, setMetadata] = useState<GameMetadata>({
    white: 'White',
    black: 'Black',
  });

  const [isCheck, setIsCheck] = useState<boolean>(false);
  const [isCheckmate, setIsCheckmate] = useState<boolean>(false);
  const [isDraw, setIsDraw] = useState<boolean>(false);
  const [isStalemate, setIsStalemate] = useState<boolean>(false);
  const [kingSquare, setKingSquare] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'analysis' | 'variations' | 'review' | 'library' | 'settings'>('analysis');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'import' | 'export'>('import');

  // Storage and Library State
  const storage = useMemo(() => getIndexedDbService(), []);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const setSaveStatus = (_status: 'saved' | 'saving' | 'idle') => {};

  // Best-Move Arrows Settings
  const [showArrows, setShowArrows] = useState<boolean>(true);
  const [maxArrows, setMaxArrows] = useState<number>(1);
  const [showClassificationMarkers, setShowClassificationMarkers] = useState<boolean>(true);

  // Game Review state
  const [reviewReport, setReviewReport] = useState<GameReviewReport | null>(null);
  const [reviewProgress, setReviewProgress] = useState<ReviewProgress | null>(null);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const reviewServiceRef = useRef<GameReviewService | null>(null);

  // Best-move preview state in Game Review
  const [previewMoveState, setPreviewMoveState] = useState<{
    fen: string;
    lastMove: { from: string; to: string } | null;
    bestMoveSan: string;
    playedMoveSan: string;
    ply: number;
  } | null>(null);

  // Engine service integration
  const {
    status,
    evaluation,
    multiPvLines,
    errorMessage,
    evaluatePosition,
    stopSearch,
    updateOptions,
  } = useEngine({ depth: 16, multiPv: 1, hashSizeMb: 16 });

  const debounceTimerRef = useRef<any>(null);
  const isReviewingRef = useRef(isReviewing);
  useEffect(() => {
    isReviewingRef.current = isReviewing;
  }, [isReviewing]);

  // Synchronize incoming evaluation into evalCache strictly for the evaluated FEN
  useEffect(() => {
    if (evaluation && evaluation.fen) {
      const currentNorm = normalizeFen(fen);
      const evalNorm = normalizeFen(evaluation.fen);
      if (currentNorm === evalNorm && (evaluation.bestMove || typeof evaluation.mate === 'number') && typeof evaluation.score === 'number') {
        evalCache.set(fen, evaluation, multiPvLines);
      }
    }
  }, [evaluation, multiPvLines, fen, evalCache]);

  // Synchronize state with VariationTree
  const syncTreeState = useCallback(() => {
    setPreviewMoveState(null);
    const node = tree.getCurrentNode();
    const currentFen = node.fen;

    setCurrentNode({ ...node });
    setFen(currentFen);

    setLastMove(node.from && node.to ? { from: node.from, to: node.to } : null);

    const chess = new Chess(currentFen);
    const check = chess.inCheck();
    const mate = chess.isCheckmate();
    setIsCheck(check);
    setIsCheckmate(mate);
    setIsDraw(chess.isDraw());
    setIsStalemate(chess.isStalemate());

    const turn = chess.turn();
    if (check) {
      const board = chess.board();
      let kSq: string | null = null;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            kSq = p.square;
            break;
          }
        }
        if (kSq) break;
      }
      setKingSquare(kSq);
    } else {
      setKingSquare(null);
    }

    // Debounced engine position evaluation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (isReviewingRef.current) {
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      if (!mate) {
        evaluatePosition(currentFen);
      } else {
        stopSearch();
      }
    }, 150);
  }, [tree, evaluatePosition, stopSearch]);

  const hasLoadedWorkspaceRef = useRef(false);

  // Initial sync and restore from IndexedDB on mount ONLY
  useEffect(() => {
    if (hasLoadedWorkspaceRef.current) return;

    let isMounted = true;
    const initData = async () => {
      try {
        const games = await storage.getAllGames();
        if (!isMounted) return;
        setSavedGames(games);

        const ws = await storage.getWorkspace();
        if (!isMounted) return;
        evalCache.clear();
        if (ws && ws.treeNodes && ws.treeNodes.length > 0) {
          tree.restoreTree(ws.treeNodes, ws.currentNodeId, ws.initialFen);
          if (ws.activeGameId) setActiveGameId(ws.activeGameId);
          if (ws.metadata) setMetadata(ws.metadata);
          let loadedReport: GameReviewReport | null = null;
          // Invalidate legacy review reports lacking current schema version
          if (ws.reviewReport && ws.reviewReport.schemaVersion === CURRENT_REVIEW_SCHEMA_VERSION) {
            loadedReport = ws.reviewReport;
            setReviewReport(ws.reviewReport);
          } else {
            setReviewReport(null);
          }
          if (typeof ws.isFlipped === 'boolean') setIsFlipped(ws.isFlipped);
          if (ws.activeTab) setActiveTab(ws.activeTab === 'review' ? 'analysis' : (ws.activeTab as any));
          populateEvalCacheFromReview(evalCache, loadedReport, tree);
          syncTreeState();
        } else {
          syncTreeState();
        }
        hasLoadedWorkspaceRef.current = true;
      } catch (err) {
        console.warn('Could not restore workspace from IndexedDB:', err);
        if (isMounted) syncTreeState();
        hasLoadedWorkspaceRef.current = true;
      }
    };

    initData();
    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [storage, tree, syncTreeState]);

  // Debounced auto-save workspace to IndexedDB
  const autoSaveTimerRef = useRef<any>(null);
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus('saving');
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const nodes = Array.from(tree.getAllNodes().values());
        await storage.saveWorkspace({
          activeGameId,
          treeNodes: nodes,
          currentNodeId: tree.getCurrentNodeId(),
          initialFen: tree.getRootNode().fen,
          metadata,
          reviewReport,
          isFlipped,
          activeTab,
          timestamp: Date.now(),
        });
        setSaveStatus('saved');
      } catch (e) {
        setSaveStatus('saved');
      }
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [currentNode, fen, metadata, reviewReport, activeGameId, isFlipped, activeTab, storage, tree]);

  // Tab visibility management: pause live engine calculations in hidden tabs to protect battery and memory
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        if (!isReviewing) {
          stopSearch();
        }
      } else if (document.visibilityState === 'visible') {
        if (!isReviewing && activeTab === 'analysis' && !isCheckmate) {
          evaluatePosition(fen);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isReviewing, activeTab, isCheckmate, fen, stopSearch, evaluatePosition]);

  // Make move on board
  const handleMakeMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    const result = tree.addMove(from, to, promotion);
    if (result) {
      syncTreeState();
      return true;
    }
    return false;
  }, [tree, syncTreeState]);

  // Play engine candidate move into the tree
  const handlePlayEngineMove = useCallback((uciMove: string) => {
    if (!uciMove || uciMove.length < 4) return;
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.length > 4 ? uciMove.slice(4, 5) : undefined;
    handleMakeMove(from, to, promotion);
  }, [handleMakeMove]);

  // Navigation handlers
  const handleSelectNode = useCallback((nodeId: string) => {
    if (tree.selectNode(nodeId)) {
      syncTreeState();
    }
  }, [tree, syncTreeState]);

  const handleFirstMove = useCallback(() => {
    tree.goToRoot();
    syncTreeState();
  }, [tree, syncTreeState]);

  const handlePrevMove = useCallback(() => {
    if (tree.goToPrevious()) {
      syncTreeState();
    }
  }, [tree, syncTreeState]);

  const handleNextMove = useCallback(() => {
    if (tree.goToNext()) {
      syncTreeState();
    }
  }, [tree, syncTreeState]);

  const handleLastMove = useCallback(() => {
    tree.goToLastInLine();
    syncTreeState();
  }, [tree, syncTreeState]);

  const handleResetGame = useCallback(() => {
    evalCache.clear();
    tree.reset();
    setActiveGameId(null);
    setMetadata({ white: 'White', black: 'Black' });
    setReviewReport(null);
    setReviewProgress(null);
    syncTreeState();
  }, [tree, syncTreeState, evalCache]);

  const handleReturnToMainline = useCallback(() => {
    const path = tree.getPathToNode();
    for (let i = path.length - 1; i >= 0; i--) {
      if (tree.isMainlineNode(path[i].id)) {
        tree.selectNode(path[i].id);
        syncTreeState();
        return;
      }
    }
    tree.goToRoot();
    syncTreeState();
  }, [tree, syncTreeState]);

  const handlePromoteVariation = useCallback((nodeId: string) => {
    if (tree.promoteVariation(nodeId)) {
      syncTreeState();
    }
  }, [tree, syncTreeState]);

  const handleDeleteVariation = useCallback((nodeId: string) => {
    if (tree.deleteVariation(nodeId)) {
      syncTreeState();
    }
  }, [tree, syncTreeState]);

  const handleSetComment = useCallback((nodeId: string, comment: string) => {
    tree.setComment(nodeId, comment);
    syncTreeState();
  }, [tree, syncTreeState]);

  const handleSetNag = useCallback((nodeId: string, nag: string) => {
    tree.setNag(nodeId, nag);
    syncTreeState();
  }, [tree, syncTreeState]);

  // Legal moves calculation from current position
  const getLegalMoves = useCallback((square: string): string[] => {
    const chess = new Chess(fen);
    return chess.moves({ square: square as any, verbose: true }).map((m) => m.to);
  }, [fen]);

  const isPromotionMove = useCallback((from: string, to: string): boolean => {
    const chess = new Chess(fen);
    const piece = chess.get(from as any);
    if (!piece || piece.type !== 'p') return false;
    if ((piece.color === 'w' && from[1] === '7' && to[1] === '8') ||
        (piece.color === 'b' && from[1] === '2' && to[1] === '1')) {
      const moves = chess.moves({ square: from as any, verbose: true });
      return moves.some((m) => m.to === to && m.promotion);
    }
    return false;
  }, [fen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPreviewMoveState(null);
        handlePrevMove();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPreviewMoveState(null);
        handleNextMove();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleFirstMove();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleLastMove();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevMove, handleNextMove, handleFirstMove, handleLastMove]);

  // Import / Export handlers
  const handleImportPgn = useCallback((pgn: string) => {
    const res = tree.importPgn(pgn);
    if (res.success) {
      evalCache.clear();
      setReviewReport(null);
      setReviewProgress(null);
      let meta: GameMetadata = { white: 'White', black: 'Black' };
      try {
        const temp = new Chess();
        temp.loadPgn(pgn, { strict: false });
        const h = temp.header();
        meta = {
          white: h['White'] || 'White',
          black: h['Black'] || 'Black',
          whiteElo: h['WhiteElo'] || undefined,
          blackElo: h['BlackElo'] || undefined,
          event: h['Event'] || undefined,
          site: h['Site'] || undefined,
          date: h['Date'] || undefined,
          round: h['Round'] || undefined,
          result: h['Result'] || '*',
        };
        setMetadata(meta);
      } catch (e) {
        setMetadata({ white: 'White', black: 'Black' });
      }

      // Automatically save imported game into IndexedDB library (async in background)
      const title = generateGameTitle(meta);
      const importedGame: SavedGame = {
        id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title,
        pgn,
        startingFen: tree.getRootNode().fen,
        currentFen: tree.getFen(),
        treeNodes: Array.from(tree.getAllNodes().values()),
        currentNodeId: tree.getCurrentNodeId(),
        metadata: meta,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        source: 'imported',
      };
      storage.saveGame(importedGame).then(async () => {
        setActiveGameId(importedGame.id);
        const updated = await storage.getAllGames();
        setSavedGames(updated);
      }).catch((e) => {
        console.warn('Auto-save of imported game skipped:', e);
      });

      syncTreeState();
    }
    return res;
  }, [tree, syncTreeState, storage]);

  const handleImportFen = useCallback((fenStr: string) => {
    try {
      const test = new Chess(fenStr.trim());
      evalCache.clear();
      tree.reset(test.fen());
      setReviewReport(null);
      setReviewProgress(null);
      syncTreeState();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Invalid FEN' };
    }
  }, [tree, syncTreeState, evalCache]);

  // Automated Game Review Actions
  const handleStartReview = useCallback(async (targetDepth: number, forceFresh: boolean = false) => {
    if (isReviewingRef.current) return;
    stopSearch();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const service = new GameReviewService(getStockfishService(), evalCache);
    reviewServiceRef.current = service;
    setIsReviewing(true);
    setReviewProgress({
      currentStep: 0,
      totalSteps: tree.getMainlinePath().filter((n) => n.id !== 'root').length,
      percentage: 0,
      currentMoveSan: '',
      isCompleted: false,
      isCancelled: false,
    });

    try {
      const report = await service.runReview(
        tree, 
        targetDepth, 
        (prog, partialReport) => {
          setReviewProgress(prog);
          if (partialReport) {
            setReviewReport(partialReport);
          }
        },
        forceFresh
      );
      setReviewReport(report);
      populateEvalCacheFromReview(evalCache, report, tree);
      syncTreeState();

      // Immediately persist review report into active workspace in IndexedDB
      try {
        const nodes = Array.from(tree.getAllNodes().values());
        await storage.saveWorkspace({
          activeGameId,
          treeNodes: nodes,
          currentNodeId: tree.getCurrentNodeId(),
          initialFen: tree.getRootNode().fen,
          metadata,
          reviewReport: report,
          isFlipped,
          activeTab: 'review',
          timestamp: Date.now(),
        });
      } catch (wsErr) {
        console.warn('Immediate workspace save after review error:', wsErr);
      }

      // Persist review report into saved game, or create one if none exists yet
      let gameToSave: SavedGame | undefined;
      const currentPgn = tree.exportPgn(metadata);

      if (activeGameId) {
        gameToSave = await storage.getGame(activeGameId);
      }
      if (!gameToSave) {
        gameToSave = await storage.findMatchingGame({ id: activeGameId, pgn: currentPgn });
      }

      const now = Date.now();
      if (gameToSave) {
        // Update existing game without creating duplicates
        gameToSave.reviewReport = report;
        gameToSave.treeNodes = Array.from(tree.getAllNodes().values());
        gameToSave.currentNodeId = tree.getCurrentNodeId();
        gameToSave.currentFen = tree.getFen();
        gameToSave.metadata = metadata;
        gameToSave.pgn = currentPgn;
        gameToSave.analyzedAt = now;
        gameToSave.updatedAt = now;
        await storage.saveGame(gameToSave);
        setActiveGameId(gameToSave.id);
      } else {
        // Create new analyzed game
        const fullMainline = tree.getMainlinePath();
        const moveCount = Math.ceil((fullMainline.length - 1) / 2);
        const title = generateGameTitle(metadata, moveCount);
        const newGame: SavedGame = {
          id: `game_${now}_${Math.random().toString(36).substring(2, 7)}`,
          title,
          pgn: currentPgn,
          startingFen: tree.getRootNode().fen,
          currentFen: tree.getFen(),
          treeNodes: Array.from(tree.getAllNodes().values()),
          currentNodeId: tree.getCurrentNodeId(),
          metadata,
          reviewReport: report,
          createdAt: now,
          updatedAt: now,
          analyzedAt: now,
          source: 'review',
        };
        await storage.saveGame(newGame);
        setActiveGameId(newGame.id);
      }

      const updated = await storage.getAllGames();
      setSavedGames(updated);
    } catch (err) {
      console.error('Game review failed:', err);
    } finally {
      setIsReviewing(false);
      reviewServiceRef.current = null;
    }
  }, [tree, evalCache, activeGameId, storage, stopSearch, syncTreeState, metadata, isFlipped, activeTab]);

  const handleCancelReview = useCallback(() => {
    if (reviewServiceRef.current) {
      reviewServiceRef.current.cancel();
    }
    setIsReviewing(false);
  }, []);

  const handleSelectReviewMove = useCallback((ply: number) => {
    setPreviewMoveState(null);
    const mainline = tree.getMainlinePath();
    const target = mainline.find((n) => n.ply === ply);
    if (target) {
      handleSelectNode(target.id);
    }
  }, [tree, handleSelectNode]);

  const handlePreviewBestMove = useCallback((step: GameReviewStep) => {
    if (!step.fenBefore) return;
    try {
      const chess = new Chess(step.fenBefore);
      let res = null;
      const uci = step.bestMoveEval?.bestMove;
      if (uci && uci.length >= 4) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
        res = chess.move({ from, to, promotion });
      }
      if (!res && step.bestMoveSan) {
        res = chess.move(step.bestMoveSan);
      }
      if (res) {
        setPreviewMoveState({
          fen: chess.fen(),
          lastMove: { from: res.from, to: res.to },
          bestMoveSan: res.san,
          playedMoveSan: step.san,
          ply: step.ply,
        });
      }
    } catch (e) {
      console.error('Failed to preview best move:', e);
    }
  }, []);

  const handleExitPreview = useCallback(() => {
    setPreviewMoveState(null);
  }, []);

  // Clear best-move preview on tab switch
  useEffect(() => {
    if (activeTab !== 'review' && previewMoveState) {
      setPreviewMoveState(null);
    }
  }, [activeTab, previewMoveState]);

  // --- Game Library Actions ---

  const handleSaveCurrentGame = useCallback(async (customTitle?: string) => {
    try {
      setSaveStatus('saving');
      const nodes = Array.from(tree.getAllNodes().values());
      const pgn = tree.exportPgn(metadata);
      const fullMainline = tree.getMainlinePath();
      const moveCount = Math.ceil((fullMainline.length - 1) / 2);
      const defaultTitle = generateGameTitle(metadata, moveCount);

      // Check if matching game already exists
      let existing: SavedGame | undefined;
      if (activeGameId) {
        existing = await storage.getGame(activeGameId);
      }
      if (!existing) {
        existing = await storage.findMatchingGame({ id: activeGameId, pgn });
      }

      const now = Date.now();
      const game: SavedGame = {
        id: existing?.id || activeGameId || `game_${now}_${Math.random().toString(36).substring(2, 7)}`,
        title: customTitle || existing?.title || defaultTitle,
        pgn,
        startingFen: tree.getRootNode().fen,
        currentFen: tree.getFen(),
        treeNodes: nodes,
        currentNodeId: tree.getCurrentNodeId(),
        metadata,
        reviewReport: reviewReport || existing?.reviewReport || undefined,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        analyzedAt: (reviewReport || existing?.reviewReport) ? (existing?.analyzedAt || now) : undefined,
        source: existing?.source || 'manual',
      };

      await storage.saveGame(game);
      setActiveGameId(game.id);
      const updated = await storage.getAllGames();
      setSavedGames(updated);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save game to library:', err);
      setSaveStatus('saved');
    }
  }, [activeGameId, tree, metadata, reviewReport, storage]);

  const handleOpenGame = useCallback((game: SavedGame) => {
    evalCache.clear();
    tree.restoreTree(game.treeNodes, game.currentNodeId, game.startingFen);
    setActiveGameId(game.id);
    setMetadata(game.metadata || { white: 'White', black: 'Black' });
    let validReport: GameReviewReport | null = null;
    // Invalidate legacy review reports lacking current schema version
    if (game.reviewReport && game.reviewReport.schemaVersion === CURRENT_REVIEW_SCHEMA_VERSION) {
      validReport = game.reviewReport;
      setReviewReport(game.reviewReport);
    } else {
      setReviewReport(null);
    }
    setReviewProgress(null);
    setActiveTab('analysis');
    populateEvalCacheFromReview(evalCache, validReport, tree);
    syncTreeState();
  }, [tree, syncTreeState, evalCache]);

  const handleDeleteGame = useCallback(async (gameId: string) => {
    await storage.deleteGame(gameId);
    if (activeGameId === gameId) {
      setActiveGameId(null);
    }
    const updated = await storage.getAllGames();
    setSavedGames(updated);
  }, [activeGameId, storage]);

  const handleDuplicateGame = useCallback(async (game: SavedGame) => {
    const clone: SavedGame = {
      ...game,
      id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: `${game.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await storage.saveGame(clone);
    const updated = await storage.getAllGames();
    setSavedGames(updated);
  }, [storage]);

  const handleRenameGame = useCallback(async (gameId: string, newTitle: string) => {
    const game = await storage.getGame(gameId);
    if (game) {
      game.title = newTitle;
      game.updatedAt = Date.now();
      await storage.saveGame(game);
      const updated = await storage.getAllGames();
      setSavedGames(updated);
    }
  }, [storage]);

  const handleImportMultiPgn = useCallback(async (pgnText: string): Promise<number> => {
    const parsed = parseMultiGamePgn(pgnText);
    if (parsed.length === 0) {
      throw new Error('No valid games found in PGN.');
    }
    for (const p of parsed) {
      const saved = parsedGameToSavedGame(p, 'imported');
      await storage.saveGame(saved);
    }
    const updated = await storage.getAllGames();
    setSavedGames(updated);
    return parsed.length;
  }, [storage]);

  const handleExportMultiPgn = useCallback((gameIds?: string[]) => {
    const targets = gameIds && gameIds.length > 0 
      ? savedGames.filter((g) => gameIds.includes(g.id))
      : savedGames;
    if (targets.length === 0) return;
    const pgnContent = exportMultiGamePgn(targets);
    const blob = new Blob([pgnContent], { type: 'application/x-chess-pgn;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `razborchess-library-${new Date().toISOString().slice(0, 10)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  }, [savedGames]);

  const handleExportBackup = useCallback(async () => {
    const backup = await storage.exportBackup();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `razborchess-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [storage]);

  const handleImportBackup = useCallback(async (backupJson: string, mode: 'overwrite' | 'merge') => {
    const data = JSON.parse(backupJson);
    await storage.importBackup(data, mode);
    const updated = await storage.getAllGames();
    setSavedGames(updated);
  }, [storage]);

  // Best-Move Arrows Calculation (Prevents stale arrows)
  const currentArrows: Array<[ChessSquare, ChessSquare, string?]> = useMemo(() => {
    if (!showArrows || !evaluation || multiPvLines.length === 0) {
      return [];
    }

    const arrowColors = [
      'rgba(129, 182, 76, 0.85)', // #1: vibrant green
      'rgba(27, 172, 166, 0.85)', // #2: teal
      'rgba(92, 139, 176, 0.85)', // #3: slate blue
      'rgba(230, 145, 44, 0.85)', // #4: amber
      'rgba(213, 164, 125, 0.85)', // #5: tan
    ];

    const arrows: Array<[ChessSquare, ChessSquare, string?]> = [];
    const limit = Math.min(maxArrows, multiPvLines.length);

    for (let i = 0; i < limit; i++) {
      const line = multiPvLines[i];
      if (line.bestMove && line.bestMove.length >= 4) {
        const from = line.bestMove.slice(0, 2) as ChessSquare;
        const to = line.bestMove.slice(2, 4) as ChessSquare;
        arrows.push([from, to, arrowColors[i % arrowColors.length]]);
      }
    }

    return arrows;
  }, [showArrows, evaluation, multiPvLines, maxArrows]);

  // Dynamically classify moves played on the analysis board when evaluations are available
  useEffect(() => {
    if (currentNode.id === 'root' || currentNode.ply === 0) return;
    if (isReviewingRef.current) return;

    // 1. If node is on mainline and reviewReport has it with matching UCI/SAN, attach it
    if (reviewReport?.moves && tree.isMainlineNode(currentNode.id)) {
      const step = reviewReport.moves.find(
        (m) => m.ply === currentNode.ply && (m.uci.toLowerCase() === currentNode.uci.toLowerCase() || m.san === currentNode.san)
      );
      if (step?.classification) {
        currentNode.classification = step.classification;
        currentNode.review = step;
        setCurrentNode((prev) => ({ ...prev, classification: step.classification, review: step }));
        return;
      }
    }

    // 2. Otherwise compute from engine evaluation
    const parentNode = currentNode.parentId ? tree.getNode(currentNode.parentId) : null;
    const fenBefore = parentNode ? parentNode.fen : tree.getRootNode().fen;
    const fenAfter = currentNode.fen;

    const normBefore = normalizeFen(fenBefore);
    const normAfter = normalizeFen(fenAfter);

    // Retrieve evalBefore: must be for fenBefore with valid bestMove and score
    const cachedBefore = evalCache.get(fenBefore, 8);
    const liveBefore = (evaluation && evaluation.fen && normalizeFen(evaluation.fen) === normBefore && (evaluation.bestMove || typeof evaluation.mate === 'number')) 
      ? evaluation 
      : null;
    const evalBefore = cachedBefore?.evaluation || liveBefore;
    const multiPvBefore = cachedBefore?.multiPv || [];
    const evalBeforeCached = Boolean(cachedBefore);

    // Retrieve evalAfter: must be for fenAfter with valid bestMove and score
    const cachedAfter = evalCache.get(fenAfter, 8);
    const liveAfter = (evaluation && evaluation.fen && normalizeFen(evaluation.fen) === normAfter && (evaluation.bestMove || typeof evaluation.mate === 'number')) 
      ? evaluation 
      : null;
    const evalAfter = cachedAfter?.evaluation || liveAfter;
    const evalAfterCached = Boolean(cachedAfter);

    // CRITICAL: If either evaluation is missing, incomplete, or from wrong FEN, DO NOT classify as Best!
    if (!evalBefore || !evalAfter || (!evalBefore.bestMove && typeof evalBefore.mate !== 'number') || (!evalAfter.bestMove && typeof evalAfter.mate !== 'number')) {
      // Evaluation is pending
      logClassificationPending({
        fenBefore,
        fenAfter,
        playedUci: currentNode.uci,
        playedSan: currentNode.san,
        activeColor: currentNode.color,
        evalBeforeAvailable: Boolean(evalBefore && (evalBefore.bestMove || typeof evalBefore.mate === 'number')),
        evalAfterAvailable: Boolean(evalAfter && (evalAfter.bestMove || typeof evalAfter.mate === 'number')),
        reason: !evalBefore ? 'Waiting for engine evaluation of position before move' : 'Waiting for engine evaluation of position after move',
        source: 'live_board',
      });
      return;
    }

    // Verify search depths are valid numbers
    if (typeof evalBefore.depth !== 'number' || typeof evalAfter.depth !== 'number') {
      return;
    }

    // Check if node was already classified at equal or deeper search depth
    const existingDepth = currentNode.review?.bestMoveEval?.depth || 0;
    const currentMinDepth = Math.min(evalBefore.depth, evalAfter.depth);
    if (currentNode.classification && existingDepth >= currentMinDepth) {
      return;
    }

    const deltas = calculateMoveDeltas(evalBefore, evalAfter, currentNode.color);
    const classification = classifyMove(
      currentNode.uci,
      evalBefore.bestMove,
      deltas.centipawnLoss,
      deltas.winRateBefore,
      deltas.winRateAfter,
      deltas.winRateDelta,
      fenBefore,
      fenAfter,
      currentNode.san,
      multiPvBefore,
      deltas.mateBefore,
      deltas.mateAfter,
      deltas.scoreBefore,
      deltas.scoreAfter
    );

    const bestSanList = convertUciPvToSan(fenBefore, [evalBefore.bestMove]);
    const bestMoveSan = bestSanList[0] || evalBefore.bestMove;

    const step: GameReviewStep = {
      ply: currentNode.ply,
      moveNumber: currentNode.moveNumber,
      color: currentNode.color,
      san: currentNode.san,
      uci: currentNode.uci,
      fenBefore,
      fenAfter,
      playedMoveEval: evalAfter,
      bestMoveEval: evalBefore,
      centipawnLoss: deltas.centipawnLoss,
      winRateBefore: deltas.winRateBefore,
      winRateAfter: deltas.winRateAfter,
      winRateDelta: deltas.winRateDelta,
      classification,
      phase: detectGamePhase(fenBefore),
      bestMoveSan,
    };

    currentNode.classification = classification;
    currentNode.review = step;
    setCurrentNode((prev) => ({ ...prev, classification, review: step }));

    // Log diagnostic details to console
    logClassificationDetails({
      fenBefore,
      fenAfter,
      playedUci: currentNode.uci,
      playedSan: currentNode.san,
      bestUci: evalBefore.bestMove,
      bestSan: bestMoveSan,
      activeColor: currentNode.color,
      evalBefore: {
        scoreWhiteCp: evalBefore.score,
        scoreSideToMoveCp: currentNode.color === 'w' ? evalBefore.score : -evalBefore.score,
        mateWhite: evalBefore.mate,
        mateSideToMove: currentNode.color === 'w' ? evalBefore.mate : (evalBefore.mate ? -evalBefore.mate : undefined),
        depth: evalBefore.depth,
        isFromCache: evalBeforeCached,
      },
      evalAfter: {
        scoreWhiteCp: evalAfter.score,
        scoreSideToMoveCp: (currentNode.color === 'w' ? 'b' : 'w') === 'w' ? evalAfter.score : -evalAfter.score,
        mateWhite: evalAfter.mate,
        mateSideToMove: (currentNode.color === 'w' ? 'b' : 'w') === 'w' ? evalAfter.mate : (evalAfter.mate ? -evalAfter.mate : undefined),
        depth: evalAfter.depth,
        isFromCache: evalAfterCached,
      },
      deltas: {
        centipawnLoss: deltas.centipawnLoss,
        winRateBefore: deltas.winRateBefore,
        winRateAfter: deltas.winRateAfter,
        winRateDelta: deltas.winRateDelta,
        scoreBeforeMover: deltas.scoreBefore,
        scoreAfterMover: deltas.scoreAfter,
      },
      classification,
      source: 'live_board',
    });
  }, [currentNode.id, currentNode.ply, currentNode.uci, fen, evaluation, evalCache, tree, reviewReport]);

  // Destination square classification marker for current move
  const currentClassificationMarker = useMemo(() => {
    if (currentNode.id === 'root' || currentNode.ply === 0) return null;

    // 1. Direct classification on the node
    let classification = currentNode.classification || currentNode.review?.classification;

    // 2. If node is on mainline and matches review report
    if (!classification && reviewReport?.moves && tree.isMainlineNode(currentNode.id)) {
      const reportStep = reviewReport.moves.find(
        (m) => m.ply === currentNode.ply && (m.uci.toLowerCase() === currentNode.uci.toLowerCase() || m.san === currentNode.san)
      );
      if (reportStep?.classification) {
        classification = reportStep.classification;
      }
    }

    if (!classification) return null;

    const square = (
      currentNode.to ||
      (currentNode as any).to ||
      (currentNode.uci && currentNode.uci.length >= 4 ? currentNode.uci.slice(2, 4) : null)
    ) as ChessSquare | null;

    if (!square) return null;
    return {
      square,
      classification,
    };
  }, [currentNode, reviewReport, tree]);

  // Board square classification highlight (both origin and destination)
  const activeClassificationHighlight = useMemo(() => {
    if (!currentClassificationMarker || currentNode.id === 'root' || currentNode.ply === 0) return null;
    const from = (
      currentNode.from ||
      (currentNode as any).from ||
      (currentNode.uci && currentNode.uci.length >= 4 ? currentNode.uci.slice(0, 2) : null)
    ) as string | null;
    const to = currentClassificationMarker.square;
    if (!from || !to) return null;
    return {
      from,
      to,
      classification: currentClassificationMarker.classification,
    };
  }, [currentClassificationMarker, currentNode]);

  const turnColor = (fen.split(' ')[1] || 'w') as 'w' | 'b';
  const isMainline = tree.isMainlineNode(currentNode.id);

  // Active evaluation prioritized lookup:
  // 1. Live engine search evaluation strictly matching current FEN
  // 2. Evaluated cache entry
  // 3. Current node's attached review evaluation
  // 4. Root position evaluation from review report if at root
  // 5. Matching move evaluation from review report
  const currentEngineEval = evaluation && evaluation.fen && normalizeFen(evaluation.fen) === normalizeFen(fen)
    ? evaluation
    : null;

  const activeEval = useMemo(() => {
    if (currentEngineEval) return currentEngineEval;

    const cached = evalCache.get(fen)?.evaluation;
    if (cached) return cached;

    if (currentNode.review?.playedMoveEval) {
      return currentNode.review.playedMoveEval;
    }

    if (currentNode.id === 'root') {
      const rootEval = reviewReport?.moves?.[0]?.bestMoveEval || currentNode.review?.bestMoveEval;
      if (rootEval) return rootEval;
    }

    const normFen = normalizeFen(fen);
    const stepMatch = reviewReport?.moves?.find((m) => 
      normalizeFen(m.fenAfter) === normFen || (currentNode.id === 'root' && normalizeFen(m.fenBefore) === normFen)
    );
    if (stepMatch?.playedMoveEval) return stepMatch.playedMoveEval;

    return null;
  }, [currentEngineEval, evalCache, fen, currentNode, reviewReport]);

  // Single reliable source of truth for board orientation and player panel positioning:
  // When White is at bottom (!isFlipped):
  //   - Bottom player panel = White (matches White pieces at the bottom of the board)
  //   - Top player panel = Black (matches Black pieces at the top of the board)
  // When Black is at bottom (isFlipped):
  //   - Bottom player panel = Black (matches Black pieces at the bottom of the board)
  //   - Top player panel = White (matches White pieces at the top of the board)
  const topPlayerColor = !isFlipped ? 'b' : 'w';
  const topPlayerName = !isFlipped ? (metadata.black || 'Black') : (metadata.white || 'White');
  const topPlayerElo = !isFlipped ? metadata.blackElo : metadata.whiteElo;
  const isTopPlayerTurn = turnColor === topPlayerColor;

  const bottomPlayerColor = !isFlipped ? 'w' : 'b';
  const bottomPlayerName = !isFlipped ? (metadata.white || 'White') : (metadata.black || 'Black');
  const bottomPlayerElo = !isFlipped ? metadata.whiteElo : metadata.blackElo;
  const isBottomPlayerTurn = turnColor === bottomPlayerColor;

  return (
    <div className="flex flex-col h-screen w-full bg-[#0D1428] text-[#EDF2FF] overflow-hidden select-none">
      {/* Top Header */}
      <header className="h-14 border-b border-[#304263] bg-[#131E36] px-3 sm:px-6 flex items-center justify-between select-none shrink-0 shadow-md z-20">
        <div className="flex items-center gap-2.5">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#EDF2FF] flex items-center gap-2">
            <span className="text-[#8EA6F0] text-2xl sm:text-3xl leading-none select-none drop-shadow-[0_0_10px_rgba(102,133,219,0.7)] font-serif" aria-hidden="true">♚</span>
            RazborChess
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Toggle Best-Move Arrows */}
          <button
            onClick={() => setShowArrows(!showArrows)}
            className={`p-2 sm:p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border transition ${
              showArrows 
                ? 'bg-[#6685DB] text-white border-[#6685DB] shadow-sm' 
                : 'bg-[#192744] text-[#9AAAC9] border-[#304263] hover:text-[#EDF2FF] hover:bg-[#202F50]'
            }`}
            title={showArrows ? 'Engine Best-Move Arrows: On' : 'Engine Best-Move Arrows: Off'}
          >
            {showArrows ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Toggle On-Board Move Classification Icons */}
          <button
            onClick={() => setShowClassificationMarkers(!showClassificationMarkers)}
            className={`p-2 sm:p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border transition ${
              showClassificationMarkers 
                ? 'bg-[#6685DB] text-white border-[#6685DB] shadow-sm' 
                : 'bg-[#192744] text-[#9AAAC9] border-[#304263] hover:text-[#EDF2FF] hover:bg-[#202F50]'
            }`}
            title={showClassificationMarkers ? 'On-Board Classification Icons: On' : 'On-Board Classification Icons: Off'}
          >
            <Award className="w-4 h-4" />
          </button>

          {/* Quick Action Buttons */}
          <button 
            onClick={() => {
              setModalInitialTab('import');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs bg-[#192744] hover:bg-[#202F50] text-[#EDF2FF] px-3 py-2 rounded-xl transition font-medium border border-[#304263] min-h-[36px] shadow-xs"
            title="Import FEN or PGN"
          >
            <Download className="w-4 h-4 text-[#8EA6F0]" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button 
            onClick={() => {
              setModalInitialTab('export');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs bg-[#192744] hover:bg-[#202F50] text-[#EDF2FF] px-3 py-2 rounded-xl transition font-medium border border-[#304263] min-h-[36px] shadow-xs"
            title="Export PGN"
          >
            <Upload className="w-4 h-4 text-[#9AAAC9]" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button 
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-2 sm:p-2 min-h-[36px] min-w-[36px] flex items-center justify-center bg-[#192744] hover:bg-[#202F50] text-[#9AAAC9] hover:text-[#EDF2FF] rounded-xl border border-[#304263] transition shadow-xs"
            title="Flip Board"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-950/40 border-b border-red-800/50 text-red-300 px-4 py-2 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Workspace Layout (Two primary areas: Board with Players Above/Below | Wider Two-Column Analysis Panel) */}
      <div className="flex-1 min-h-0 flex flex-col xl:flex-row items-center justify-start xl:justify-center overflow-y-auto xl:overflow-hidden p-2 sm:p-2.5 xl:py-2.5 xl:px-4 gap-3 xl:gap-6 bg-[#0D1428] text-[#EDF2FF] max-w-[1800px] mx-auto w-full">
        {/* Dominant Chessboard & Player Info Column (Above & Below Board) */}
        <div className="flex flex-col items-center justify-center relative min-w-0 shrink-0 select-none py-1 w-full max-w-[min(calc(100vw-24px),600px)]">
          {/* Top Player Panel (Black when normal orientation; White when flipped) */}
          <div 
            data-testid="top-player-panel"
            className="w-full max-w-[min(calc(100vw-24px),600px)] h-9 mb-1.5 px-3 sm:px-3.5 rounded-2xl border border-[#304263] bg-[#192744] flex items-center justify-between text-xs shadow-md shrink-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                topPlayerColor === 'w' ? 'bg-[#EDF2FF] border-[#8EA6F0] shadow-xs' : 'bg-[#0D1428] border-[#304263]'
              }`} />
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-xs sm:text-sm text-[#EDF2FF] truncate" title={topPlayerName}>
                  {topPlayerName}
                </span>
                {topPlayerElo && (
                  <span className="text-[11px] font-mono text-[#8EA6F0] font-semibold shrink-0">
                    ({topPlayerElo})
                  </span>
                )}
              </div>
            </div>
            {isTopPlayerTurn ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[#8EA6F0] bg-[#6685DB]/15 px-2 py-0.5 rounded-full border border-[#6685DB]/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8EA6F0]"></span>
                To Move
              </span>
            ) : (
              <span className="w-0 shrink-0" aria-hidden="true" />
            )}
          </div>

          {/* Large Chessboard & Eval Bar Container: Height targets 540–620px */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 h-[min(calc(100vw-36px),560px)] sm:h-[min(calc(100vw-48px),560px)] xl:h-[min(calc(100vw-24px),calc(100vh-9.75rem),600px)] shrink-0">
            {/* Real-time Dynamic Eval Bar */}
            <EvaluationBar
              scoreCp={activeEval?.score ?? 0}
              mate={activeEval?.mate}
              isFlipped={isFlipped}
              isSearching={status.isSearching}
              hasEvaluation={!!activeEval}
            />

            {/* Real Interactive Chessboard: Clean 1:1 Aspect Ratio without Redundant Padding */}
            <div 
              id="board-wrapper" 
              className="h-full aspect-square relative flex items-center justify-center select-none"
            >
              {previewMoveState && (
                <div className="absolute top-2 left-2 right-2 z-20 bg-[#192744]/95 border border-[#6685DB] text-[#EDF2FF] px-3 py-2 rounded-xl text-xs flex items-center justify-between shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="w-3.5 h-3.5 text-[#8EA6F0] shrink-0" />
                    <span className="truncate text-[11px]">
                      Previewing best: <strong className="text-emerald-400 font-mono font-bold">{previewMoveState.bestMoveSan}</strong> (Played: {previewMoveState.playedMoveSan})
                    </span>
                  </div>
                  <button
                    onClick={handleExitPreview}
                    className="px-2.5 py-1 bg-[#6685DB] hover:bg-[#5774C9] text-white rounded-lg text-[10px] font-semibold transition shrink-0 ml-2 shadow-xs"
                  >
                    Return
                  </button>
                </div>
              )}
              <ChessBoardView
                fen={previewMoveState ? previewMoveState.fen : fen}
                isFlipped={isFlipped}
                lastMove={previewMoveState ? previewMoveState.lastMove : lastMove}
                isCheck={isCheck}
                kingSquare={kingSquare}
                turnColor={turnColor}
                onMakeMove={handleMakeMove}
                onGetLegalMoves={getLegalMoves}
                isPromotionMove={isPromotionMove}
                customArrows={currentArrows}
                showArrows={showArrows}
                classificationMarker={currentClassificationMarker}
                showClassificationMarkers={showClassificationMarkers}
                classificationHighlight={activeClassificationHighlight}
              />
            </div>
          </div>

          {/* Bottom Player Panel (White when normal orientation; Black when flipped) */}
          <div 
            data-testid="bottom-player-panel"
            className="w-full max-w-[min(calc(100vw-24px),600px)] h-9 mt-1.5 px-3 sm:px-3.5 rounded-2xl border border-[#304263] bg-[#192744] flex items-center justify-between text-xs shadow-md shrink-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                bottomPlayerColor === 'w' ? 'bg-[#EDF2FF] border-[#8EA6F0] shadow-xs' : 'bg-[#0D1428] border-[#304263]'
              }`} />
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-xs sm:text-sm text-[#EDF2FF] truncate" title={bottomPlayerName}>
                  {bottomPlayerName}
                </span>
                {bottomPlayerElo && (
                  <span className="text-[11px] font-mono text-[#8EA6F0] font-semibold shrink-0">
                    ({bottomPlayerElo})
                  </span>
                )}
              </div>
            </div>
            {isBottomPlayerTurn ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[#8EA6F0] bg-[#6685DB]/15 px-2 py-0.5 rounded-full border border-[#6685DB]/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8EA6F0]"></span>
                To Move
              </span>
            ) : (
              <span className="w-0 shrink-0" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Right Side: Unified Two-Column Analysis & Library Panel */}
        <div className="w-full xl:flex-1 xl:min-w-[580px] 2xl:min-w-[720px] max-w-[min(calc(100vw-24px),960px)] flex flex-col bg-[#192744] rounded-3xl border border-[#304263] shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden shrink-0 xl:shrink min-h-[500px] h-[580px] xl:h-full xl:max-h-[min(calc(100vh-5rem),684px)] min-h-0 my-1 xl:my-0">
          {/* Panel Navigation Tabs */}
          <div className="flex border-b border-[#304263] bg-[#131E36] text-xs overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex-1 py-3 px-4 min-h-[44px] whitespace-nowrap flex items-center justify-center gap-1.5 font-semibold transition text-xs ${
                activeTab === 'analysis' 
                  ? 'text-[#EDF2FF] border-b-2 border-[#6685DB] font-bold bg-[#192744]' 
                  : 'text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50]/60'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-[#8EA6F0]" />
              <span>Analysis</span>
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 py-3 px-4 min-h-[44px] whitespace-nowrap flex items-center justify-center gap-1.5 font-semibold transition text-xs ${
                activeTab === 'library' 
                  ? 'text-[#EDF2FF] border-b-2 border-[#6685DB] font-bold bg-[#192744]' 
                  : 'text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50]/60'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#8EA6F0]" />
              <span>Library</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-3 px-4 min-h-[44px] flex items-center justify-center transition ${
                activeTab === 'settings' 
                  ? 'text-[#EDF2FF] border-b-2 border-[#6685DB] font-bold bg-[#192744]' 
                  : 'text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50]/60'
              }`}
              title="Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-[#8EA6F0]" />
            </button>
          </div>

          {/* Panel Body Content */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#131E36]">
            {activeTab === 'analysis' && (
              <UnifiedAnalysisWorkspace
                tree={tree}
                currentNode={currentNode}
                metadata={metadata}
                reviewReport={reviewReport}
                reviewProgress={reviewProgress}
                isReviewing={isReviewing}
                evalCache={evalCache}
                isCheck={isCheck}
                isCheckmate={isCheckmate}
                isDraw={isDraw}
                isStalemate={isStalemate}
                onSelectNode={handleSelectNode}
                onPrevMove={handlePrevMove}
                onNextMove={handleNextMove}
                onFirstMove={handleFirstMove}
                onLastMove={handleLastMove}
                onResetGame={handleResetGame}
                onReturnToMainline={handleReturnToMainline}
                isMainline={isMainline}
                onStartReview={handleStartReview}
                onCancelReview={handleCancelReview}
                onSelectReviewMove={handleSelectReviewMove}
                isPreviewingBestMove={!!previewMoveState && previewMoveState.ply === currentNode.ply}
                onPreviewBestMove={handlePreviewBestMove}
                onExitPreview={handleExitPreview}
              />
            )}

            {activeTab === 'variations' && (
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                <VariationExplorer
                  tree={tree}
                  currentNode={currentNode}
                  multiPvLines={multiPvLines}
                  onSelectNode={handleSelectNode}
                  onPromoteVariation={handlePromoteVariation}
                  onDeleteVariation={handleDeleteVariation}
                  onSetComment={handleSetComment}
                  onSetNag={handleSetNag}
                  onPlayEngineMove={handlePlayEngineMove}
                  onReturnToMainline={handleReturnToMainline}
                />
              </div>
            )}

            {activeTab === 'library' && (
              <GameLibraryView
                games={savedGames}
                activeGameId={activeGameId}
                onOpenGame={handleOpenGame}
                onSaveCurrentGame={handleSaveCurrentGame}
                onDeleteGame={handleDeleteGame}
                onDuplicateGame={handleDuplicateGame}
                onRenameGame={handleRenameGame}
                onImportMultiPgn={handleImportMultiPgn}
                onExportMultiPgn={handleExportMultiPgn}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
              />
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4 text-xs text-[#EDF2FF] overflow-y-auto h-full p-3 sm:p-4">
                <div className="bg-[#192744] p-4 rounded-2xl border border-[#304263] space-y-4 shadow-sm">
                  <h3 className="font-bold text-[#EDF2FF] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-[#8EA6F0]" />
                    Engine & Analysis Configuration
                  </h3>

                  {/* Best Move Arrows */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#9AAAC9] text-[11px] font-medium">Best-Move Arrows:</span>
                      <button
                        onClick={() => setShowArrows(!showArrows)}
                        className={`px-3 py-1 min-h-[30px] rounded-xl text-xs font-semibold transition ${
                          showArrows ? 'bg-[#6685DB] text-white shadow-xs' : 'bg-[#202F50] text-[#9AAAC9] border border-[#304263] hover:text-[#EDF2FF]'
                        }`}
                      >
                        {showArrows ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {showArrows && (
                      <div className="space-y-1">
                        <span className="text-[#9AAAC9] text-[10px]">Candidate Arrows on Board:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[1, 2, 3].map((num) => (
                            <button
                              key={num}
                              onClick={() => setMaxArrows(num)}
                              className={`py-1.5 min-h-[30px] rounded-xl font-mono text-xs border transition ${
                                maxArrows === num 
                                  ? 'bg-[#6685DB] text-white font-bold border-[#6685DB] shadow-xs' 
                                  : 'bg-[#202F50] text-[#EDF2FF] border-[#304263] hover:bg-[#202F50]/80'
                              }`}
                            >
                              {num} Arrow{num > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* On-Board Move Classification Markers */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#304263]">
                      <span className="text-[#9AAAC9] text-[11px] font-medium">On-Board Classification Icons:</span>
                      <button
                        onClick={() => setShowClassificationMarkers(!showClassificationMarkers)}
                        className={`px-3 py-1 min-h-[30px] rounded-xl text-xs font-semibold transition ${
                          showClassificationMarkers ? 'bg-[#6685DB] text-white shadow-xs' : 'bg-[#202F50] text-[#9AAAC9] border border-[#304263] hover:text-[#EDF2FF]'
                        }`}
                      >
                        {showClassificationMarkers ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>

                  {/* Target Depth */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9AAAC9] font-medium">Target Search Depth:</span>
                      <span className="font-mono text-[#8EA6F0] font-bold">{status.maxDepth} ply</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="25" 
                      value={status.maxDepth}
                      onChange={(e) => updateOptions({ depth: parseInt(e.target.value, 10) })}
                      className="w-full accent-[#6685DB] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#9AAAC9]">
                      <span>10 (Fast)</span>
                      <span>16 (Balanced)</span>
                      <span>25 (Deep)</span>
                    </div>
                  </div>

                  {/* MultiPV Variations */}
                  <div className="space-y-1.5">
                    <span className="text-[#9AAAC9] text-[11px] font-medium">MultiPV (Candidate Lines):</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          onClick={() => updateOptions({ multiPv: val })}
                          className={`py-1.5 min-h-[30px] rounded-xl font-mono text-xs border transition ${
                            status.multiPv === val 
                              ? 'bg-[#6685DB] text-white font-bold border-[#6685DB] shadow-xs' 
                              : 'bg-[#202F50] text-[#EDF2FF] border-[#304263] hover:bg-[#202F50]/80'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hash Size */}
                  <div className="space-y-1.5">
                    <span className="text-[#9AAAC9] text-[11px] font-medium">Hash Memory Size:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[16, 32, 64].map((size) => (
                        <button
                          key={size}
                          onClick={() => updateOptions({ hashSizeMb: size })}
                          className={`py-1.5 min-h-[30px] rounded-xl font-mono text-xs border transition ${
                            status.hashSizeMb === size 
                              ? 'bg-[#6685DB] text-white font-bold border-[#6685DB] shadow-xs' 
                              : 'bg-[#202F50] text-[#EDF2FF] border-[#304263] hover:bg-[#202F50]/80'
                          }`}
                        >
                          {size} MB
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Keyboard Shortcuts Reference */}
                <div className="bg-[#192744] p-4 rounded-2xl border border-[#304263] space-y-2.5 shadow-sm">
                  <h3 className="font-bold text-[#EDF2FF] flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5 text-[#8EA6F0]" />
                    Keyboard Shortcuts
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#131E36] p-2 rounded-xl border border-[#304263] flex items-center justify-between">
                      <span className="text-[#9AAAC9]">Previous Move</span>
                      <kbd className="px-2 py-0.5 bg-[#202F50] rounded-lg border border-[#304263] text-[#EDF2FF] font-mono text-[10px] shadow-xs">←</kbd>
                    </div>
                    <div className="bg-[#131E36] p-2 rounded-xl border border-[#304263] flex items-center justify-between">
                      <span className="text-[#9AAAC9]">Next Move</span>
                      <kbd className="px-2 py-0.5 bg-[#202F50] rounded-lg border border-[#304263] text-[#EDF2FF] font-mono text-[10px] shadow-xs">→</kbd>
                    </div>
                    <div className="bg-[#131E36] p-2 rounded-xl border border-[#304263] flex items-center justify-between">
                      <span className="text-[#9AAAC9]">First Move</span>
                      <kbd className="px-2 py-0.5 bg-[#202F50] rounded-lg border border-[#304263] text-[#EDF2FF] font-mono text-[10px] shadow-xs">↑</kbd>
                    </div>
                    <div className="bg-[#131E36] p-2 rounded-xl border border-[#304263] flex items-center justify-between">
                      <span className="text-[#9AAAC9]">Latest Move</span>
                      <kbd className="px-2 py-0.5 bg-[#202F50] rounded-lg border border-[#304263] text-[#EDF2FF] font-mono text-[10px] shadow-xs">↓</kbd>
                    </div>
                    <div className="bg-[#131E36] p-2 rounded-xl border border-[#304263] flex items-center justify-between col-span-2">
                      <span className="text-[#9AAAC9]">Flip Board Orientation</span>
                      <kbd className="px-2 py-0.5 bg-[#202F50] rounded-lg border border-[#304263] text-[#EDF2FF] font-mono text-[10px] shadow-xs">F</kbd>
                    </div>
                  </div>
                </div>

                {/* Open-Source Attribution & Privacy */}
                <div className="bg-[#192744] p-4 rounded-2xl border border-[#304263] space-y-2.5 shadow-sm">
                  <h3 className="font-bold text-[#EDF2FF] flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#8EA6F0]" />
                    Engine Attribution & Privacy
                  </h3>
                  <div className="text-[11px] text-[#9AAAC9] space-y-1.5 leading-relaxed">
                    <p>
                      <strong className="text-[#EDF2FF]">Engine:</strong> Official Stockfish 19 WASM (single-threaded build, licensed under GNU GPL v3.0). Powered in-browser via Web Workers.
                    </p>
                    <p>
                      <strong className="text-[#EDF2FF]">100% Client-Side Privacy:</strong> All game storage, variations, and Stockfish evaluations run completely within your browser using local IndexedDB. No games or telemetry are sent to external servers.
                    </p>
                    <p className="text-[10px] text-[#9AAAC9] pt-2 border-t border-[#304263]">
                      <strong>Disclaimer:</strong> RazborChess is an independent open-source educational project and is not affiliated with, sponsored by, or endorsed by Chess.com or Lichess. Move classifications and estimated ratings are transparent heuristics.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Move Navigation Controls (for secondary tabs; Analysis tab has its own integrated controls) */}
          {activeTab !== 'analysis' && (
            <div className="h-14 border-t border-[#304263] bg-[#192744] px-3 sm:px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button 
                  onClick={handleFirstMove}
                  disabled={currentNode.id === 'root'}
                  className="p-2 sm:p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50] disabled:opacity-25 disabled:hover:bg-transparent rounded-xl transition"
                  title="First Move (Up Arrow)"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={handlePrevMove}
                  disabled={currentNode.id === 'root'}
                  className="p-2 sm:p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50] disabled:opacity-25 disabled:hover:bg-transparent rounded-xl transition"
                  title="Previous Move (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleNextMove}
                  disabled={currentNode.children.length === 0}
                  className="p-2 sm:p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50] disabled:opacity-25 disabled:hover:bg-transparent rounded-xl transition"
                  title="Next Move (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleLastMove}
                  disabled={currentNode.children.length === 0}
                  className="p-2 sm:p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-[#9AAAC9] hover:text-[#EDF2FF] hover:bg-[#202F50] disabled:opacity-25 disabled:hover:bg-transparent rounded-xl transition"
                  title="Last Move (Down Arrow)"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!isMainline && (
                  <button
                    onClick={handleReturnToMainline}
                    className="px-3 py-1.5 min-h-[34px] text-[11px] bg-[#202F50] text-[#8EA6F0] border border-[#304263] rounded-xl hover:bg-[#202F50]/80 flex items-center gap-1.5 transition font-semibold shadow-xs"
                    title="Return to Mainline"
                  >
                    <CornerUpLeft className="w-3 h-3" />
                    <span>Mainline</span>
                  </button>
                )}
                <button 
                  onClick={handleResetGame}
                  className="p-2 min-h-[36px] text-[#9AAAC9] hover:text-[#F87171] hover:bg-red-950/30 rounded-xl transition text-xs flex items-center gap-1"
                  title="Reset to Starting Position"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Reset</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImportPgn={handleImportPgn}
        onImportFen={handleImportFen}
        exportPgnText={tree.exportPgn(metadata)}
        initialTab={modalInitialTab}
      />
    </div>
  );
}
