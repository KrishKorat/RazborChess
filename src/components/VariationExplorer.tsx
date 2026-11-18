import React, { useState } from 'react';
import { 
  GitBranch, 
  ArrowUpRight, 
  Trash2, 
  CornerUpLeft, 
  MessageSquare, 
  Sparkles, 
  Check, 
  Plus
} from 'lucide-react';
import { VariationTree, TreeNode } from '../services/tree/variationTree';
import { MultiPvEvaluation } from '../types/chess';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface VariationExplorerProps {
  tree: VariationTree;
  currentNode: TreeNode;
  multiPvLines: MultiPvEvaluation[];
  onSelectNode: (nodeId: string) => void;
  onPromoteVariation: (nodeId: string) => void;
  onDeleteVariation: (nodeId: string) => void;
  onSetComment: (nodeId: string, comment: string) => void;
  onSetNag: (nodeId: string, nag: string) => void;
  onPlayEngineMove: (uciMove: string) => void;
  onReturnToMainline: () => void;
}

export const VariationExplorer: React.FC<VariationExplorerProps> = ({
  tree,
  currentNode,
  multiPvLines,
  onSelectNode,
  onPromoteVariation,
  onDeleteVariation,
  onSetComment,
  onSetNag,
  onPlayEngineMove,
  onReturnToMainline,
}) => {
  const [commentInput, setCommentInput] = useState<string>(currentNode.comment || '');
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);

  const isMainline = tree.isMainlineNode(currentNode.id);
  const childrenNodes = currentNode.children
    .map((id) => tree.getNode(id))
    .filter((n): n is TreeNode => !!n);

  const parentNode = currentNode.parentId ? tree.getNode(currentNode.parentId) : null;
  const siblingNodes = parentNode
    ? parentNode.children
        .map((id) => tree.getNode(id))
        .filter((n): n is TreeNode => !!n && n.id !== currentNode.id)
    : [];

  const handleSaveComment = () => {
    onSetComment(currentNode.id, commentInput);
    setIsEditingComment(false);
  };

  const nagOptions = ['!', '?', '!!', '??', '!?', '?!'];

  return (
    <div className="flex flex-col h-full space-y-3 text-xs overflow-y-auto pr-1 text-[#F3F5FF]">
      {/* Active Position Context Banner */}
      <div className="bg-[#1C2949] p-3 rounded-md border border-[#344567] space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-[#A9B8F2]" />
            <span className="font-semibold text-[#F3F5FF]">Position Context</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
            isMainline 
              ? 'bg-[#243454] text-[#A9B8F2] border-[#344567]' 
              : 'bg-[#151F3B] text-[#A7B3D0] border-[#344567]'
          }`}>
            {isMainline ? 'Mainline' : 'Variation Branch'}
          </span>
        </div>

        <div className="text-[11px] text-[#A7B3D0] flex items-center justify-between">
          <span>Ply {currentNode.ply} {currentNode.san ? `(${currentNode.san})` : '(Start)'}</span>
          {!isMainline && (
            <button
              onClick={onReturnToMainline}
              className="text-[10px] text-[#A9B8F2] hover:underline flex items-center gap-1 font-medium"
            >
              <CornerUpLeft className="w-3 h-3" />
              <span>Return to Mainline</span>
            </button>
          )}
        </div>
      </div>

      {/* Alternative Continuations from this position */}
      <div className="bg-[#1C2949] p-3 rounded-md border border-[#344567] space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-[#A7B3D0] font-medium pb-1 border-b border-[#344567]">
          <span>Available Continuations ({childrenNodes.length})</span>
          <span className="text-[10px] text-[#A7B3D0]/80">Play move or click branch</span>
        </div>

        {childrenNodes.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {childrenNodes.map((child, idx) => {
              const isChildMain = idx === 0;
              return (
                <div
                  key={child.id}
                  className="bg-[#151F3B] p-2 rounded border border-[#344567] flex items-center justify-between"
                >
                  <button
                    onClick={() => onSelectNode(child.id)}
                    className="flex items-center gap-2 hover:text-[#A9B8F2] transition text-left"
                  >
                    <span className="font-mono font-bold text-[#F3F5FF]">
                      {child.color === 'w' ? `${child.moveNumber}. ` : `${child.moveNumber}... `}
                      {child.san}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                      isChildMain ? 'text-[#A9B8F2] bg-[#243454] border-[#344567]' : 'text-[#A7B3D0] bg-[#1C2949] border-[#344567]'
                    }`}>
                      {isChildMain ? 'Primary Line' : `Variation #${idx}`}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    {!isChildMain && (
                      <button
                        onClick={() => onPromoteVariation(child.id)}
                        className="p-1 text-[#A7B3D0] hover:text-[#A9B8F2] hover:bg-[#243454] rounded transition"
                        title="Promote to Mainline"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingNodeId(child.id)}
                      className="p-1 text-[#A7B3D0] hover:text-[#FCA5A5] hover:bg-red-950/40 rounded transition"
                      title="Delete Variation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-[#A7B3D0] italic text-[11px]">
            No continuations played yet from this position. Play a move on the board to branch.
          </div>
        )}
      </div>

      {/* Sibling Variations (Alternatives from the previous move) */}
      {siblingNodes.length > 0 && (
        <div className="bg-[#1C2949] p-3 rounded-md border border-[#344567] space-y-2 shadow-sm">
          <div className="text-[#A7B3D0] font-medium pb-1 border-b border-[#344567] flex justify-between items-center">
            <span>Alternative Choices from Previous Move</span>
            <span className="text-[10px] text-[#A7B3D0]/80">{siblingNodes.length} alternatives</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {siblingNodes.map((sibling) => (
              <button
                key={sibling.id}
                onClick={() => onSelectNode(sibling.id)}
                className="py-1 px-2.5 rounded bg-[#151F3B] hover:bg-[#243454] border border-[#344567] text-[#F3F5FF] font-mono text-[11px] flex items-center gap-1 transition"
              >
                <span>{sibling.san}</span>
                {sibling.nag && <span className="text-[#A9B8F2] font-bold">{sibling.nag}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Engine MultiPV Candidate Integration */}
      {multiPvLines.length > 0 && (
        <div className="bg-[#1C2949] p-3 rounded-md border border-[#344567] space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#F3F5FF]">
            <span className="font-semibold text-[#F3F5FF] flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#A9B8F2]" />
              Engine Candidate Variations
            </span>
            <span className="text-[10px] text-[#A7B3D0]">Stockfish 19</span>
          </div>
          <p className="text-[10px] text-[#A7B3D0]">
            Click to play an engine recommendation into this variation branch:
          </p>

          <div className="space-y-1.5 pt-0.5">
            {multiPvLines.map((line) => (
              <div
                key={line.id}
                className="bg-[#151F3B] p-2 rounded border border-[#344567] flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[#A9B8F2] font-bold">#{line.id}</span>
                  <span className="text-[#F3F5FF] font-semibold">{line.bestMove}</span>
                  <span className="text-[#A7B3D0] text-[10px]">
                    ({(line.score / 100).toFixed(2)})
                  </span>
                </div>
                <button
                  onClick={() => onPlayEngineMove(line.bestMove)}
                  className="py-1 px-2 bg-[#243454] hover:bg-[#7895E8] text-[#A9B8F2] hover:text-white rounded font-semibold text-[10px] flex items-center gap-1 transition border border-[#344567]"
                >
                  <Plus className="w-3 h-3" />
                  <span>Play as Branch</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Move Annotation & Comment Editor */}
      {currentNode.id !== 'root' && (
        <div className="bg-[#1C2949] p-3 rounded-md border border-[#344567] space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#F3F5FF]">
            <span className="font-semibold text-[#F3F5FF] flex items-center gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-[#A9B8F2]" />
              Move Notes & Annotations
            </span>
          </div>

          {/* Glyph / NAG selector */}
          <div className="flex items-center gap-1 pt-1">
            <span className="text-[10px] text-[#A7B3D0] mr-1">Glyph:</span>
            {nagOptions.map((nag) => (
              <button
                key={nag}
                onClick={() => onSetNag(currentNode.id, currentNode.nag === nag ? '' : nag)}
                className={`py-0.5 px-2 rounded font-mono font-bold text-xs border transition ${
                  currentNode.nag === nag
                    ? 'bg-[#7895E8] text-white border-[#7895E8] shadow-sm'
                    : 'bg-[#151F3B] text-[#F3F5FF] border-[#344567] hover:bg-[#243454]'
                }`}
              >
                {nag}
              </button>
            ))}
          </div>

          {/* Comment text */}
          <div className="pt-1">
            {isEditingComment ? (
              <div className="space-y-1.5">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add notes for this move..."
                  rows={2}
                  className="w-full bg-[#151F3B] border border-[#344567] rounded p-2 text-[#F3F5FF] text-xs focus:outline-none focus:border-[#7895E8]"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setIsEditingComment(false)}
                    className="px-2 py-1 text-[#A7B3D0] hover:text-[#F3F5FF] text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveComment}
                    className="px-3 py-1 bg-[#7895E8] hover:bg-[#6885D8] text-white font-semibold rounded text-[11px] flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3 h-3" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => { setCommentInput(currentNode.comment || ''); setIsEditingComment(true); }}
                className="bg-[#151F3B] p-2 rounded border border-[#344567] text-[#A7B3D0] hover:border-[#7895E8] cursor-pointer min-h-[32px] text-[11px] italic"
              >
                {currentNode.comment || 'Click here to add notes or analysis ideas...'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deletingNodeId}
        variationName={deletingNodeId ? tree.getNode(deletingNodeId)?.san || 'branch' : ''}
        onConfirm={() => {
          if (deletingNodeId) {
            onDeleteVariation(deletingNodeId);
            setDeletingNodeId(null);
          }
        }}
        onCancel={() => setDeletingNodeId(null)}
      />
    </div>
  );
};
