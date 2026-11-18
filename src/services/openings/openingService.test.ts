import { describe, it, expect } from 'vitest';
import { identifyOpeningFromMoves, identifyOpeningFromPath } from './openingService';
import { VariationTree } from '../tree/variationTree';

describe('Opening Recognition Engine', () => {
  it('correctly identifies Caro-Kann Defense: 1. e4 c6 2. d4 d5', () => {
    const opening = identifyOpeningFromMoves(['e4', 'c6', 'd4', 'd5']);
    expect(opening.name).toBe('Caro-Kann Defense');
    expect(opening.eco).toBe('B12');
  });

  it('correctly identifies Ruy Lopez: 1. e4 e5 2. Nf3 Nc6 3. Bb5', () => {
    const opening = identifyOpeningFromMoves(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    expect(opening.name).toBe('Ruy Lopez');
    expect(opening.eco).toBe('C60');
  });

  it('correctly identifies Nimzo-Indian Defense: 1. d4 Nf6 2. c4 e6 3. Nc3 Bb4', () => {
    const opening = identifyOpeningFromMoves(['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4']);
    expect(opening.name).toBe('Nimzo-Indian Defense');
    expect(opening.eco).toBe('E20');
  });

  it('identifies variations specifically: Caro-Kann Classical Variation (B18)', () => {
    const opening = identifyOpeningFromMoves('e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5');
    expect(opening.name).toBe('Caro-Kann Defense');
    expect(opening.variation).toBe('Classical Variation');
    expect(opening.eco).toBe('B18');
    expect(opening.fullName).toBe('Caro-Kann Defense: Classical Variation');
  });

  it('handles transpositions reaching the same position', () => {
    // 1. d4 c6 2. e4 d5 reaches the same Caro-Kann B12 position as 1. e4 c6 2. d4 d5
    const opening = identifyOpeningFromMoves(['d4', 'c6', 'e4', 'd5']);
    expect(opening.name).toBe('Caro-Kann Defense');
    expect(opening.eco).toBe('B12');
  });

  it('retains deepest matched opening on out-of-book continuation moves', () => {
    // 1. e4 c6 2. d4 d5 3. a3 (3. a3 is not in book)
    const opening = identifyOpeningFromMoves(['e4', 'c6', 'd4', 'd5', 'a3']);
    expect(opening.name).toBe('Caro-Kann Defense');
    expect(opening.eco).toBe('B12');
  });

  it('classifies completely unrecognized moves as Unclassified Opening', () => {
    const opening = identifyOpeningFromMoves(['h4', 'h5', 'a4', 'a5']);
    expect(opening.name).toBe('Unclassified Opening');
    expect(opening.fullName).toBe('Unclassified Opening');
  });

  it('returns Starting Position when no moves have been played', () => {
    const opening = identifyOpeningFromMoves([]);
    expect(opening.name).toBe('Starting Position');
  });

  it('dynamically updates opening during undo, redo, and tree navigation', () => {
    const tree = new VariationTree();

    // Move 1: 1. e4 (e2 -> e4)
    const n1 = tree.addMove('e2', 'e4')!;
    expect(n1).not.toBeNull();
    let opening = identifyOpeningFromPath(tree.getPathToNode(n1.id));
    expect(opening.name).toBe("King's Pawn Opening");

    // Move 2: 1...c6 (c7 -> c6)
    const n2 = tree.addMove('c7', 'c6')!;
    opening = identifyOpeningFromPath(tree.getPathToNode(n2.id));
    expect(opening.name).toBe('Caro-Kann Defense');
    expect(opening.eco).toBe('B10');

    // Move 3: 2. d4 (d2 -> d4)
    tree.addMove('d2', 'd4');
    // Move 4: 2...d5 (d7 -> d5)
    const n4 = tree.addMove('d7', 'd5')!;
    opening = identifyOpeningFromPath(tree.getPathToNode(n4.id));
    expect(opening.name).toBe('Caro-Kann Defense');
    expect(opening.eco).toBe('B12');

    // Move 5 & 6: 3. Nc3 (b1 -> c3) dxe4 (d5 -> e4)
    tree.addMove('b1', 'c3');
    tree.addMove('d5', 'e4');
    // Move 7 & 8: 4. Nxe4 (c3 -> e4) Bf5 (c8 -> f5)
    tree.addMove('c3', 'e4');
    const n8 = tree.addMove('c8', 'f5')!;
    opening = identifyOpeningFromPath(tree.getPathToNode(n8.id));
    expect(opening.name).toBe('Caro-Kann Defense');
    expect(opening.variation).toBe('Classical Variation');
    expect(opening.eco).toBe('B18');

    // Simulate Undo: navigate back to n4 (2...d5)
    opening = identifyOpeningFromPath(tree.getPathToNode(n4.id));
    expect(opening.name).toBe('Caro-Kann Defense');
    expect(opening.eco).toBe('B12');
    expect(opening.variation).toBeUndefined();

    // Simulate Undo further back to root
    opening = identifyOpeningFromPath(tree.getPathToNode('root'));
    expect(opening.name).toBe('Starting Position');
  });
});
