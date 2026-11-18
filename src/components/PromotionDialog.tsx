import React from 'react';

interface PromotionDialogProps {
  isOpen: boolean;
  color: 'w' | 'b';
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

export const PromotionDialog: React.FC<PromotionDialogProps> = ({
  isOpen,
  color,
  onSelect,
  onCancel,
}) => {
  if (!isOpen) return null;

  const pieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; label: string; symbol: string }> = [
    { type: 'q', label: 'Queen', symbol: color === 'w' ? '♕' : '♛' },
    { type: 'r', label: 'Rook', symbol: color === 'w' ? '♖' : '♜' },
    { type: 'b', label: 'Bishop', symbol: color === 'w' ? '♗' : '♝' },
    { type: 'n', label: 'Knight', symbol: color === 'w' ? '♘' : '♞' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10172D]/80 backdrop-blur-sm p-4">
      <div className="bg-[#1C2949] border border-[#344567] rounded-lg p-5 shadow-2xl max-w-sm w-full mx-4 text-center text-[#F3F5FF]">
        <h3 className="text-sm font-semibold text-[#F3F5FF] mb-1">Promote Pawn</h3>
        <p className="text-xs text-[#A7B3D0] mb-4">Choose a piece to promote your pawn to:</p>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {pieces.map((p) => (
            <button
              key={p.type}
              onClick={() => onSelect(p.type)}
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#151F3B] hover:bg-[#243454] border border-[#344567] hover:border-[#7895E8] transition group shadow-sm min-h-[64px]"
            >
              <span className="text-4xl text-[#F3F5FF] group-hover:scale-110 transition-transform select-none">
                {p.symbol}
              </span>
              <span className="text-[11px] font-medium text-[#A7B3D0] mt-1 group-hover:text-[#A9B8F2]">{p.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-[#A7B3D0] hover:text-[#F3F5FF] transition underline font-medium p-1"
        >
          Cancel Move
        </button>
      </div>
    </div>
  );
};
