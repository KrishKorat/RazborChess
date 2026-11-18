import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvaluationGraph } from './EvaluationGraph';
import { VariationTree } from '../services/tree/variationTree';
import { EvalCache } from '../services/engine/evalCache';

describe('EvaluationGraph', () => {
  it('renders graph title and unanalyzed count when tree is at root', () => {
    const tree = new VariationTree();
    const evalCache = new EvalCache();
    const onSelectNode = vi.fn();

    render(
      <EvaluationGraph
        tree={tree}
        currentNodeId="root"
        evalCache={evalCache}
        onSelectNode={onSelectNode}
      />
    );

    expect(screen.getByText(/Evaluation Graph/i)).toBeInTheDocument();
    expect(screen.getByText(/\(0\/1 evaluated\)/i)).toBeInTheDocument();
  });

  it('updates evaluated count when positions exist in cache without fabricating values', () => {
    const tree = new VariationTree();
    tree.addMove('e2', 'e4');
    tree.addMove('e7', 'e5');

    const evalCache = new EvalCache();
    // Cache only the first move position
    evalCache.set(tree.getRootNode().fen, {
      depth: 16,
      score: 25,
      pv: ['e2e4'],
      bestMove: 'e2e4',
    });

    render(
      <EvaluationGraph
        tree={tree}
        currentNodeId="node_1"
        evalCache={evalCache}
        onSelectNode={vi.fn()}
      />
    );

    // 1 position cached out of 3 plies (root, e4, e5)
    expect(screen.getByText(/\(1\/3 evaluated\)/i)).toBeInTheDocument();
  });

  it('immediately displays evaluations when provided via reviewReport for loaded games', () => {
    const tree = new VariationTree();
    tree.addMove('e2', 'e4');
    tree.addMove('e7', 'e5');

    const evalCache = new EvalCache(); // empty cache
    const mockReport: any = {
      schemaVersion: 2,
      whiteAccuracy: 88,
      blackAccuracy: 85,
      whiteAcpl: 30,
      blackAcpl: 35,
      moves: [
        {
          ply: 1,
          san: 'e4',
          fenBefore: tree.getRootNode().fen,
          fenAfter: tree.getNode('node_1')!.fen,
          playedMoveEval: { depth: 14, score: 30, bestMove: 'e2e4', pv: ['e2e4'] },
          bestMoveEval: { depth: 14, score: 25, bestMove: 'e2e4', pv: ['e2e4'] },
          centipawnLoss: 0,
          winRateBefore: 54,
          winRateAfter: 54,
          winRateDelta: 0,
          classification: 'best',
          phase: 'opening',
        },
        {
          ply: 2,
          san: 'e5',
          fenBefore: tree.getNode('node_1')!.fen,
          fenAfter: tree.getNode('node_2')!.fen,
          playedMoveEval: { depth: 14, score: 20, bestMove: 'e7e5', pv: ['e7e5'] },
          bestMoveEval: { depth: 14, score: 30, bestMove: 'e7e5', pv: ['e7e5'] },
          centipawnLoss: 10,
          winRateBefore: 54,
          winRateAfter: 52,
          winRateDelta: 2,
          classification: 'excellent',
          phase: 'opening',
        },
      ],
    };

    render(
      <EvaluationGraph
        tree={tree}
        currentNodeId="node_2"
        evalCache={evalCache}
        onSelectNode={vi.fn()}
        reviewReport={mockReport}
      />
    );

    // Root (from moves[0].bestMoveEval), e4 (from moves[0].playedMoveEval), e5 (from moves[1].playedMoveEval) = 3/3
    expect(screen.getByText(/\(3\/3 evaluated\)/i)).toBeInTheDocument();
  });
});
