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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#292440] border border-[#443B60] rounded-2xl p-5 shadow-2xl max-w-sm w-full mx-4 text-center text-[#F3EFFB]">
        <h3 className="text-sm font-semibold text-[#F3EFFB] tracking-wide mb-1">Promote Pawn</h3>
        <p className="text-xs text-[#B8AFD1] mb-4">Choose a piece to promote your pawn:</p>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {pieces.map((p) => (
            <button
              key={p.type}
              onClick={() => onSelect(p.type)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#201D35] hover:bg-[#332D4D] border border-[#443B60] hover:border-[#B7A5E8]/50 hover:shadow-xs transition group shadow-xs min-h-[64px]"
            >
              <span className="text-4xl text-[#F3EFFB] group-hover:text-[#B7A5E8] group-hover:scale-110 transition-transform select-none">
                {p.symbol}
              </span>
              <span className="text-[10px] font-medium tracking-wide text-[#B8AFD1] mt-1 group-hover:text-[#B7A5E8]">{p.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-[#B8AFD1] hover:text-[#d3503c] transition font-medium tracking-wide p-1"
        >
          Cancel Move
        </button>
      </div>
    </div>
  );
};
