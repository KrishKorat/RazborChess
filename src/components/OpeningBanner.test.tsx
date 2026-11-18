import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { OpeningBanner } from './OpeningBanner';
import { OpeningInfo } from '../services/openings/openingService';

describe('OpeningBanner', () => {
  it('renders starting position correctly', () => {
    const opening: OpeningInfo = {
      name: 'Starting Position',
      fullName: 'Starting Position',
      movesCount: 0,
    };
    render(<OpeningBanner opening={opening} />);
    expect(screen.getByText('Starting Position')).toBeInTheDocument();
  });

  it('renders unclassified opening correctly', () => {
    const opening: OpeningInfo = {
      name: 'Unclassified Opening',
      fullName: 'Unclassified Opening',
      movesCount: 0,
    };
    render(<OpeningBanner opening={opening} />);
    expect(screen.getByText('Unclassified Opening')).toBeInTheDocument();
  });

  it('renders recognized opening with variation and ECO code', () => {
    const opening: OpeningInfo = {
      name: 'Caro-Kann Defense',
      variation: 'Classical Variation',
      eco: 'B18',
      fullName: 'Caro-Kann Defense: Classical Variation',
      movesCount: 8,
    };
    render(<OpeningBanner opening={opening} />);
    expect(screen.getByText('Caro-Kann Defense')).toBeInTheDocument();
    expect(screen.getByText('Classical Variation · ECO B18')).toBeInTheDocument();
    expect(screen.getByText('B18')).toBeInTheDocument();
  });

  it('renders recognized opening without variation', () => {
    const opening: OpeningInfo = {
      name: 'Ruy Lopez',
      eco: 'C60',
      fullName: 'Ruy Lopez',
      movesCount: 5,
    };
    render(<OpeningBanner opening={opening} />);
    expect(screen.getByText('Ruy Lopez')).toBeInTheDocument();
    expect(screen.getByText('ECO C60')).toBeInTheDocument();
    expect(screen.getByText('C60')).toBeInTheDocument();
  });
});
