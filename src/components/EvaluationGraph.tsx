import React, { useMemo, useState, useEffect } from 'react';
import { TreeNode, VariationTree } from '../services/tree/variationTree';
import { EvalCache, normalizeFen } from '../services/engine/evalCache';
import { GameReviewReport } from '../types/chess';

interface EvaluationGraphProps {
  tree: VariationTree;
  currentNodeId: string;
  evalCache: EvalCache;
  onSelectNode: (nodeId: string) => void;
  reviewReport?: GameReviewReport | null;
  isReviewing?: boolean;
}

export const EvaluationGraph: React.FC<EvaluationGraphProps> = ({
  tree,
  currentNodeId,
  evalCache,
  onSelectNode,
  reviewReport,
  isReviewing = false,
}) => {
  // Subscribe to evalCache updates so the graph updates in real-time as positions are analyzed
  const [cacheVersion, setCacheVersion] = useState<number>(() => evalCache.getVersion?.() ?? 0);

  useEffect(() => {
    if (!evalCache.subscribe) return;
    return evalCache.subscribe(() => {
      setCacheVersion(evalCache.getVersion());
    });
  }, [evalCache]);

  // Construct full line from root through current node to the end of this branch
  const pathNodes = useMemo(() => {
    const pathToCurrent = tree.getPathToNode(currentNodeId);
    const fullLine: TreeNode[] = [...pathToCurrent];
    let tail = pathToCurrent[pathToCurrent.length - 1];

    while (tail && tail.children.length > 0) {
      const nextId = tail.children[0];
      const nextNode = tree.getNode(nextId);
      if (!nextNode) break;
      fullLine.push(nextNode);
      tail = nextNode;
    }

    return fullLine;
  }, [tree, currentNodeId]);

  // Dimensions
  const height = 70;
  const width = 360;
  const centerY = height / 2;
  const maxPawnCap = 8; // clamp evaluation range to +/- 8 pawns for graph scale

  // Compute graph coordinates for each node
  const points = useMemo(() => {
    const total = pathNodes.length;
    if (total === 0) return [];

    return pathNodes.map((node, index) => {
      const x = total === 1 ? width / 2 : 12 + (index / (total - 1)) * (width - 24);

      // Check multiple evaluation sources:
      // 1. Cache
      // 2. Tree node's attached review data
      // 3. Game review report matching ply or FEN
      const cached = evalCache.get(node.fen);
      const nodeReviewEval = node.review?.playedMoveEval;
      const reportStep = reviewReport?.moves?.find(
        (m) => m.ply === node.ply || normalizeFen(m.fenAfter) === normalizeFen(node.fen)
      );
      const reportEval = reportStep?.playedMoveEval;

      // For root node (ply 0), check bestMoveEval of the opening position
      const rootEval = node.id === 'root'
        ? (reviewReport?.moves?.[0]?.bestMoveEval || node.review?.bestMoveEval)
        : undefined;

      const evalData = cached?.evaluation || nodeReviewEval || reportEval || rootEval;

      let y = centerY;
      let scoreText = 'Unanalyzed';
      let hasEval = false;

      if (evalData && (typeof evalData.score === 'number' || typeof evalData.mate === 'number')) {
        hasEval = true;
        const { score, mate } = evalData;
        let pawns = 0;

        if (typeof mate === 'number') {
          pawns = mate > 0 ? maxPawnCap : -maxPawnCap;
          scoreText = mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
        } else {
          pawns = Math.max(-maxPawnCap, Math.min(maxPawnCap, (score ?? 0) / 100));
          scoreText = pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
        }

        // Positive pawns (White) go up: y = centerY - (pawns / maxPawnCap) * (height / 2 - 8)
        y = centerY - (pawns / maxPawnCap) * (centerY - 8);
      }

      return {
        node,
        index,
        x,
        y,
        hasEval,
        scoreText,
        isCurrent: node.id === currentNodeId,
        isMainline: tree.isMainlineNode(node.id),
      };
    });
  }, [pathNodes, evalCache, currentNodeId, tree, centerY, reviewReport, cacheVersion]);

  // Construct SVG path string for contiguous evaluated segments
  // Never fabricate or interpolate artificial curves across unanalyzed gaps
  const pathD = useMemo(() => {
    let d = '';
    let inSegment = false;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (pt.hasEval) {
        if (!inSegment) {
          d += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} `;
          inSegment = true;
        } else {
          d += `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} `;
        }
      } else {
        inSegment = false;
      }
    }
    return d.trim();
  }, [points]);

  const evaluatedCount = points.filter((p) => p.hasEval).length;

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex justify-between items-center text-[11px] text-[#9AAAC9] font-medium">
        <span className="text-[#EDF2FF] font-semibold flex items-center gap-1.5">
          <span>Evaluation Graph</span>
          <span className="text-[10px] text-[#8EA6F0] font-normal">
            {isReviewing
              ? `Analyzing (${evaluatedCount}/${points.length})`
              : `(${evaluatedCount}/${points.length} evaluated)`}
          </span>
        </span>
        <span className="font-mono text-[10px] text-[#9AAAC9]">Scale: ±8.0</span>
      </div>

      <div className="relative w-full overflow-hidden bg-[#0D1428]/60 p-1.5 rounded-xl border border-[#304263]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-12 sm:h-14 overflow-visible cursor-pointer"
        >
          {/* Background Gradient Area */}
          <defs>
            <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8EA6F0" stopOpacity="0.30" />
              <stop offset="50%" stopColor="#6685DB" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#0D1428" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Center Equality Reference Line */}
          <line
            x1="8"
            y1={centerY}
            x2={width - 8}
            y2={centerY}
            stroke="#304263"
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Evaluated Line Segments */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#8EA6F0"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Plot Points */}
          {points.map((pt) => {
            return (
              <g
                key={pt.node.id}
                onClick={() => onSelectNode(pt.node.id)}
                className="group cursor-pointer"
              >
                {/* Active selection halo */}
                {pt.isCurrent && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="6.5"
                    fill="none"
                    stroke="#B9A9E8"
                    strokeWidth="2.5"
                    className="animate-pulse"
                  />
                )}

                {/* Point dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.isCurrent ? '3.5' : '2.5'}
                  fill={
                    pt.hasEval
                      ? pt.isCurrent
                        ? '#FFFFFF'
                        : pt.isMainline
                        ? '#8EA6F0'
                        : '#B9A9E8'
                      : '#304263'
                  }
                  stroke={pt.hasEval ? '#131E36' : '#304263'}
                  strokeWidth="1.2"
                  className="transition-transform group-hover:scale-125"
                />

                {/* Hover Tooltip Native SVG */}
                <title>
                  {`${pt.node.san || 'Start'} (Ply ${pt.node.ply}) - ${pt.scoreText}`}
                </title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
