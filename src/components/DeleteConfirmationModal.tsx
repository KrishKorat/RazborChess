import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  variationName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  variationName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10172D]/80 backdrop-blur-sm p-4">
      <div className="bg-[#1C2949] border border-[#344567] rounded-lg p-5 shadow-2xl max-w-sm w-full text-center text-[#F3F5FF]">
        <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-700/60 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <h3 className="text-sm font-semibold text-[#F3F5FF] mb-1">Delete Variation Branch?</h3>
        <p className="text-xs text-[#A7B3D0] mb-4">
          Are you sure you want to delete <span className="text-[#F3F5FF] font-mono font-bold">"{variationName}"</span> and all of its follow-up moves? This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-3 bg-[#151F3B] hover:bg-[#243454] text-[#A7B3D0] hover:text-[#F3F5FF] rounded text-xs font-medium border border-[#344567] transition min-h-[36px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition shadow-sm min-h-[36px]"
          >
            Delete Branch
          </button>
        </div>
      </div>
    </div>
  );
};
