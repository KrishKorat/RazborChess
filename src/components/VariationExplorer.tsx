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
    <div className="flex flex-col h-full space-y-3 text-xs overflow-y-auto pr-1 text-[#F3EFFB]">
      {/* Active Position Context Banner */}
      <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-[#B7A5E8]" />
            <span className="font-semibold text-[#F3EFFB] tracking-wide">Position Context</span>
          </div>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold tracking-wide border ${
            isMainline 
              ? 'bg-[#B7A5E8]/20 text-[#B7A5E8] border-[#B7A5E8]/35' 
              : 'bg-[#201D35] text-[#B8AFD1] border-[#443B60]'
          }`}>
            {isMainline ? 'Mainline' : 'Variation Branch'}
          </span>
        </div>

        <div className="text-[11px] text-[#B8AFD1] flex items-center justify-between">
          <span>Ply {currentNode.ply} {currentNode.san ? `(${currentNode.san})` : '(Start)'}</span>
          {!isMainline && (
            <button
              onClick={onReturnToMainline}
              className="text-[10px] text-[#B7A5E8] hover:underline flex items-center gap-1 font-medium tracking-wide"
            >
              <CornerUpLeft className="w-3 h-3" />
              <span>Return to Mainline</span>
            </button>
          )}
        </div>
      </div>

      {/* Alternative Continuations from this position */}
      <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-[#B8AFD1] font-semibold tracking-wide pb-1 border-b border-[#443B60]">
          <span>Available Continuations ({childrenNodes.length})</span>
          <span className="text-[10px] text-[#8C81A8]">Play move or click branch</span>
        </div>

        {childrenNodes.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {childrenNodes.map((child, idx) => {
              const isChildMain = idx === 0;
              return (
                <div
                  key={child.id}
                  className="bg-[#201D35] p-2 rounded-xl border border-[#443B60] flex items-center justify-between"
                >
                  <button
                    onClick={() => onSelectNode(child.id)}
                    className="flex items-center gap-2 hover:text-[#B7A5E8] transition text-left"
                  >
                    <span className="font-mono font-bold text-[#F3EFFB]">
                      {child.color === 'w' ? `${child.moveNumber}. ` : `${child.moveNumber}... `}
                      {child.san}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium tracking-wide border ${
                      isChildMain ? 'text-[#B7A5E8] bg-[#B7A5E8]/20 border-[#B7A5E8]/30' : 'text-[#B8AFD1] bg-white/[0.04] border-[#443B60]'
                    }`}>
                      {isChildMain ? 'Primary Line' : `Variation #${idx}`}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    {!isChildMain && (
                      <button
                        onClick={() => onPromoteVariation(child.id)}
                        className="p-1 text-[#B8AFD1] hover:text-[#B7A5E8] hover:bg-white/[0.06] rounded-lg transition"
                        title="Promote to Mainline"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingNodeId(child.id)}
                      className="p-1 text-[#B8AFD1] hover:text-[#d3503c] hover:bg-[#d3503c]/15 rounded-lg transition"
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
          <div className="text-center py-4 text-[#B8AFD1] italic text-[11px]">
            No continuations played yet from this position. Play a move on the board to branch.
          </div>
        )}
      </div>

      {/* Sibling Variations (Alternatives from the previous move) */}
      {siblingNodes.length > 0 && (
        <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] space-y-2 shadow-xs">
          <div className="text-[#B8AFD1] font-semibold tracking-wide pb-1 border-b border-[#443B60] flex justify-between items-center">
            <span>Alternative Choices from Previous Move</span>
            <span className="text-[10px] text-[#8C81A8]">{siblingNodes.length} alternatives</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {siblingNodes.map((sibling) => (
              <button
                key={sibling.id}
                onClick={() => onSelectNode(sibling.id)}
                className="py-1 px-2.5 rounded-xl bg-[#201D35] hover:bg-[#332D4D] border border-[#443B60] hover:border-[#B7A5E8]/40 text-[#F3EFFB] font-mono text-[11px] flex items-center gap-1 transition"
              >
                <span>{sibling.san}</span>
                {sibling.nag && <span className="text-[#B7A5E8] font-bold">{sibling.nag}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Engine MultiPV Candidate Integration */}
      {multiPvLines.length > 0 && (
        <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-[#F3EFFB]">
            <span className="font-semibold text-[#F3EFFB] flex items-center gap-1.5 text-xs tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[#B7A5E8]" />
              Engine Candidate Variations
            </span>
            <span className="text-[10px] text-[#8C81A8] font-mono font-medium">Stockfish 19</span>
          </div>
          <p className="text-[10px] text-[#B8AFD1]">
            Click to play an engine recommendation into this variation branch:
          </p>

          <div className="space-y-1.5 pt-0.5">
            {multiPvLines.map((line) => (
              <div
                key={line.id}
                className="bg-[#201D35] p-2 rounded-xl border border-[#443B60] flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[#B7A5E8] font-bold">#{line.id}</span>
                  <span className="text-[#F3EFFB] font-semibold">{line.bestMove}</span>
                  <span className="text-[#B8AFD1] text-[10px]">
                    ({(line.score / 100).toFixed(2)})
                  </span>
                </div>
                <button
                  onClick={() => onPlayEngineMove(line.bestMove)}
                  className="py-1 px-2.5 bg-[#201D35] hover:bg-[#B7A5E8] text-[#B7A5E8] hover:text-[#171525] rounded-xl font-semibold tracking-wide text-[10px] flex items-center gap-1 transition border border-[#443B60]"
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
        <div className="bg-[#292440] p-3.5 rounded-2xl border border-[#443B60] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-[#F3EFFB]">
            <span className="font-semibold text-[#F3EFFB] flex items-center gap-1.5 text-xs tracking-wide">
              <MessageSquare className="w-3.5 h-3.5 text-[#B7A5E8]" />
              Move Notes &amp; Annotations
            </span>
          </div>

          {/* Glyph / NAG selector */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-[#B8AFD1] mr-1 font-semibold">Glyph:</span>
            {nagOptions.map((nag) => (
              <button
                key={nag}
                onClick={() => onSetNag(currentNode.id, currentNode.nag === nag ? '' : nag)}
                className={`py-0.5 px-2.5 rounded-xl font-mono font-medium text-xs border transition ${
                  currentNode.nag === nag
                    ? 'bg-[#B7A5E8] text-[#171525] font-semibold border-[#B7A5E8]/60 shadow-xs'
                    : 'bg-[#201D35] text-[#F3EFFB] border-[#443B60] hover:bg-[#332D4D]'
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
                  className="w-full bg-[#201D35] border border-[#443B60] rounded-xl p-2.5 text-[#F3EFFB] text-xs focus:outline-none focus:border-[#B7A5E8]"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setIsEditingComment(false)}
                    className="px-2.5 py-1 text-[#B8AFD1] hover:text-[#F3EFFB] text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveComment}
                    className="px-3 py-1 bg-[#B7A5E8] hover:bg-[#C4B5FD] text-[#171525] font-semibold rounded-xl text-[11px] flex items-center gap-1 shadow-xs"
                  >
                    <Check className="w-3 h-3" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => { setCommentInput(currentNode.comment || ''); setIsEditingComment(true); }}
                className="bg-[#201D35] p-2.5 rounded-xl border border-[#443B60] text-[#B8AFD1] hover:border-[#B7A5E8]/40 cursor-pointer min-h-[32px] text-[11px] italic"
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
