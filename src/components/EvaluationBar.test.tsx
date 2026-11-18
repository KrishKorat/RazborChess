import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvaluationBar } from './EvaluationBar';

describe('EvaluationBar', () => {
  it('renders neutral 0.0 when hasEvaluation is false or equal', () => {
    render(
      <EvaluationBar
        scoreCp={0}
        isFlipped={false}
        isSearching={false}
        hasEvaluation={false}
      />
    );
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  it('renders positive centipawn score for White advantage', () => {
    render(
      <EvaluationBar
        scoreCp={180}
        isFlipped={false}
        isSearching={false}
        hasEvaluation={true}
      />
    );
    expect(screen.getByText('+1.8')).toBeInTheDocument();
  });

  it('renders negative centipawn score for Black advantage', () => {
    render(
      <EvaluationBar
        scoreCp={-240}
        isFlipped={false}
        isSearching={false}
        hasEvaluation={true}
      />
    );
    expect(screen.getByText('-2.4')).toBeInTheDocument();
  });

  it('renders mate score correctly (White mate vs Black mate)', () => {
    const { rerender } = render(
      <EvaluationBar
        scoreCp={0}
        mate={3}
        isFlipped={false}
        isSearching={false}
        hasEvaluation={true}
      />
    );
    expect(screen.getByText('M3')).toBeInTheDocument();

    rerender(
      <EvaluationBar
        scoreCp={0}
        mate={-2}
        isFlipped={false}
        isSearching={false}
        hasEvaluation={true}
      />
    );
    expect(screen.getByText('-M2')).toBeInTheDocument();
  });
});
