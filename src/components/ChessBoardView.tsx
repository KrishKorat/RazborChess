import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { PromotionDialog } from './PromotionDialog';
import { BoardClassificationMarker } from './BoardClassificationMarker';
import { MoveClassification } from '../types/chess';
import { getClassificationSquareHighlight } from '../services/review/classificationDisplay';

interface ChessBoardViewProps {
  fen: string;
  isFlipped: boolean;
  lastMove?: { from: string; to: string } | null;
  classificationHighlight?: { from: string; to: string; classification: MoveClassification } | null;
  isCheck: boolean;
  kingSquare?: string | null;
  onMakeMove: (from: string, to: string, promotion?: string) => boolean;
  onGetLegalMoves: (square: string) => string[];
  isPromotionMove: (from: string, to: string) => boolean;
  turnColor: 'w' | 'b';
  customArrows?: Array<[Square, Square, string?]>;
  showArrows?: boolean;
  classificationMarker?: { square: string; classification: MoveClassification } | null;
  showClassificationMarkers?: boolean;
}

export const ChessBoardView: React.FC<ChessBoardViewProps> = ({
  fen,
  isFlipped,
  lastMove,
  classificationHighlight,
  isCheck,
  kingSquare,
  onMakeMove,
  onGetLegalMoves,
  isPromotionMove,
  turnColor,
  customArrows = [],
  showArrows = true,
  classificationMarker,
  showClassificationMarkers = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>(480);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  // Resize board dynamically to fit container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const size = Math.floor(Math.min(clientWidth, clientHeight));
        if (size > 100) {
          setBoardWidth(size);
        }
      }
    };

    updateSize();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(updateSize);
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateSize);

    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Clear selections when position changes externally
  useEffect(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [fen]);

  // Handle Drag & Drop move
  const handlePieceDrop = (sourceSquare: Square, targetSquare: Square): boolean => {
    if (sourceSquare === targetSquare) return false;

    // Check if promotion is needed
    if (isPromotionMove(sourceSquare, targetSquare)) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return true;
    }

    const success = onMakeMove(sourceSquare, targetSquare);
    if (success) {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
    return success;
  };

  // Handle Click-to-Move
  const handleSquareClick = (square: Square) => {
    // If a piece is already selected and clicked square is among legal moves
    if (selectedSquare && legalMoves.includes(square)) {
      if (isPromotionMove(selectedSquare, square)) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }

      const success = onMakeMove(selectedSquare, square);
      if (success) {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
      return;
    }

    // Select new square
    const destinations = onGetLegalMoves(square);
    if (destinations.length > 0) {
      setSelectedSquare(square);
      setLegalMoves(destinations);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Promotion confirmation
  const handlePromotionSelect = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion) {
      onMakeMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Custom highlights & legal move indicators
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, Record<string, string | number>> = {};

    // 1. Move highlighting:
    // If classificationHighlight is provided, use the coordinated move classification colors!
    if (classificationHighlight && classificationHighlight.from && classificationHighlight.to) {
      const colors = getClassificationSquareHighlight(classificationHighlight.classification);
      styles[classificationHighlight.from] = { 
        backgroundColor: colors.sourceRgba,
        transition: 'background-color 150ms ease-in-out',
      };
      styles[classificationHighlight.to] = { 
        backgroundColor: colors.targetRgba,
        transition: 'background-color 150ms ease-in-out',
      };
    } else if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(102, 133, 219, 0.30)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(102, 133, 219, 0.45)' };
    }

    // 2. Highlight selected square (Royal blue accent)
    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: 'rgba(102, 133, 219, 0.55)' };
    }

    // 3. Highlight in-check King square (Muted red alert)
    if (isCheck && kingSquare) {
      styles[kingSquare] = {
        background: 'radial-gradient(circle, #DC2626 0%, rgba(220, 38, 38, 0.65) 50%, transparent 85%)',
      };
    }

    // 4. Legal destination indicators
    let chessInstance: Chess | null = null;
    try {
      chessInstance = new Chess(fen);
    } catch {
      chessInstance = null;
    }

    for (const dest of legalMoves) {
      const isCapture = chessInstance ? Boolean(chessInstance.get(dest as Square)) : false;
      if (isCapture) {
        styles[dest] = {
          background: 'radial-gradient(circle, transparent 52%, rgba(142, 166, 240, 0.75) 53%, rgba(142, 166, 240, 0.75) 72%, transparent 73%)',
          borderRadius: '50%',
          cursor: 'pointer',
        };
      } else {
        styles[dest] = {
          background: 'radial-gradient(circle, rgba(142, 166, 240, 0.75) 24%, rgba(142, 166, 240, 0.3) 25%, transparent 26%)',
          borderRadius: '50%',
          cursor: 'pointer',
        };
      }
    }

    return styles;
  }, [lastMove, classificationHighlight, selectedSquare, isCheck, kingSquare, legalMoves, fen]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center relative select-none"
    >
      <div 
        style={{ width: boardWidth, height: boardWidth }}
        className="rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden border border-[#304263] relative bg-[#131E36]"
      >
        <Chessboard
          position={fen}
          boardWidth={boardWidth}
          boardOrientation={isFlipped ? 'black' : 'white'}
          onPieceDrop={handlePieceDrop}
          onSquareClick={handleSquareClick}
          customSquareStyles={customSquareStyles}
          customArrows={showArrows ? (customArrows as any) : []}
          customDarkSquareStyle={{ backgroundColor: '#4E6F9F' }}
          customLightSquareStyle={{ backgroundColor: '#DFE7F5' }}
          customNotationStyle={{ fontWeight: 600, fontSize: '11px', color: '#8EA6F0' }}
          showBoardNotation={true}
          animationDuration={200}
        />

        {/* On-Board Move Classification Marker on Destination Square */}
        {showClassificationMarkers && classificationMarker && (
          <BoardClassificationMarker
            square={classificationMarker.square as Square}
            classification={classificationMarker.classification}
            boardWidth={boardWidth}
            isFlipped={isFlipped}
          />
        )}
      </div>

      <PromotionDialog
        isOpen={!!pendingPromotion}
        color={turnColor}
        onSelect={handlePromotionSelect}
        onCancel={() => setPendingPromotion(null)}
      />
    </div>
  );
};
