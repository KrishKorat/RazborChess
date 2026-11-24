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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#292440] border-t-2 border-t-[#d3503c] border border-[#443B60] rounded-2xl p-5 shadow-2xl max-w-sm w-full text-center text-[#F3EFFB]">
        <div className="w-10 h-10 rounded-xl bg-[#d3503c]/15 border border-[#d3503c]/35 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-[#d3503c]" />
        </div>
        <h3 className="text-sm font-semibold text-[#F3EFFB] tracking-wide mb-1">Delete Variation Branch?</h3>
        <p className="text-xs text-[#B8AFD1] mb-4">
          Are you sure you want to delete <span className="text-[#F3EFFB] font-mono font-medium">"{variationName}"</span> and all of its follow-up moves? This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-3 bg-[#201D35] hover:bg-[#332D4D] text-[#B8AFD1] hover:text-[#F3EFFB] rounded-xl text-xs font-medium tracking-wide border border-[#443B60] transition min-h-[36px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-3 bg-[#d3503c] hover:bg-[#b8412f] text-white rounded-xl text-xs font-medium tracking-wide transition shadow-xs min-h-[36px]"
          >
            Delete Branch
          </button>
        </div>
      </div>
    </div>
  );
};
