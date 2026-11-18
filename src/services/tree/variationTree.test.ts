import { describe, it, expect, beforeEach } from 'vitest';
import { VariationTree } from './variationTree';

describe('VariationTree (Poly-Tree Data Structure)', () => {
  let tree: VariationTree;

  beforeEach(() => {
    tree = new VariationTree();
  });

  it('initializes with a root node at ply 0', () => {
    const root = tree.getRootNode();
    expect(root.id).toBe('root');
    expect(root.ply).toBe(0);
    expect(root.children.length).toBe(0);
    expect(tree.getCurrentNodeId()).toBe('root');
  });

  it('adds sequential mainline moves', () => {
    const m1 = tree.addMove('e2', 'e4');
    expect(m1).not.toBeNull();
    expect(m1?.san).toBe('e4');
    expect(tree.isMainlineNode(m1!.id)).toBe(true);

    const m2 = tree.addMove('e7', 'e5');
    expect(m2).not.toBeNull();
    expect(m2?.san).toBe('e5');
    expect(tree.isMainlineNode(m2!.id)).toBe(true);

    const m3 = tree.addMove('g1', 'f3');
    expect(m3?.san).toBe('Nf3');
    expect(tree.getPathToNode().length).toBe(4); // root + 3 moves
  });

  it('supports multiple alternative branches from the same position without overwriting mainline', () => {
    // Mainline: 1. e4 e5 2. Nf3
    tree.addMove('e2', 'e4'); // node_1
    const e5Node = tree.addMove('e7', 'e5'); // node_2
    const nf3Node = tree.addMove('g1', 'f3'); // node_3

    // Go back to move 1 (e4, node_1) and play alternative 1... c5 (Sicilian)
    tree.selectNode('node_1');
    const c5Node = tree.addMove('c7', 'c5'); // node_4
    expect(c5Node).not.toBeNull();
    expect(c5Node?.san).toBe('c5');

    // Go back to node_1 and play alternative 1... e6 (French)
    tree.selectNode('node_1');
    const e6Node = tree.addMove('e7', 'e6'); // node_5
    expect(e6Node).not.toBeNull();
    expect(e6Node?.san).toBe('e6');

    // Verify node_1 now has 3 distinct children: e5, c5, e6
    const e4Node = tree.getNode('node_1')!;
    expect(e4Node.children.length).toBe(3);
    expect(e4Node.children[0]).toBe(e5Node!.id);
    expect(e4Node.children[1]).toBe(c5Node!.id);
    expect(e4Node.children[2]).toBe(e6Node!.id);

    // Verify the original continuation (2. Nf3) under 1... e5 is 100% intact
    expect(tree.getNode(e5Node!.id)!.children[0]).toBe(nf3Node!.id);

    // Verify mainline status
    expect(tree.isMainlineNode(e5Node!.id)).toBe(true);
    expect(tree.isMainlineNode(c5Node!.id)).toBe(false);
    expect(tree.isMainlineNode(e6Node!.id)).toBe(false);
  });

  it('supports arbitrary deeply nested sub-variations', () => {
    // 1. e4 e5 2. Nf3 Nc6 3. Bb5
    tree.addMove('e2', 'e4');
    tree.addMove('e7', 'e5');
    tree.addMove('g1', 'f3');
    const nc6 = tree.addMove('b8', 'c6')!;
    tree.addMove('f1', 'b5'); // 3. Bb5 (Ruy Lopez)

    // Sub-variation on move 3: 3. Bc4 (Italian Game)
    tree.selectNode(nc6.id);
    const bc4 = tree.addMove('f1', 'c4')!; // 3. Bc4
    expect(bc4.san).toBe('Bc4');

    // Deep sub-variation on move 3... Nf6 (Two Knights) vs 3... Bc5 (Giuoco Piano)
    const bc5 = tree.addMove('f8', 'c5')!;
    tree.selectNode(bc4.id);
    const nf6 = tree.addMove('g8', 'f6')!;

    expect(tree.getNode(bc4.id)!.children.length).toBe(2);
    expect(tree.getNode(bc4.id)!.children).toContain(bc5.id);
    expect(tree.getNode(bc4.id)!.children).toContain(nf6.id);
  });

  it('promotes an alternative variation to become the new mainline', () => {
    // 1. e4 e5 (main) vs 1. e4 c5 (variation)
    const e4 = tree.addMove('e2', 'e4')!;
    const e5 = tree.addMove('e7', 'e5')!;
    tree.addMove('g1', 'f3');

    // Branch to c5
    tree.selectNode(e4.id);
    const c5 = tree.addMove('c7', 'c5')!;
    tree.addMove('g1', 'f3');

    expect(tree.isMainlineNode(e5.id)).toBe(true);
    expect(tree.isMainlineNode(c5.id)).toBe(false);

    // Promote c5 to mainline
    const promoted = tree.promoteVariation(c5.id);
    expect(promoted).toBe(true);

    // Now c5 is at index 0 of e4.children
    expect(tree.getNode(e4.id)!.children[0]).toBe(c5.id);
    expect(tree.getNode(e4.id)!.children[1]).toBe(e5.id);

    expect(tree.isMainlineNode(c5.id)).toBe(true);
    expect(tree.isMainlineNode(e5.id)).toBe(false);
  });

  it('deletes a variation and all its descendants cleanly without affecting siblings', () => {
    const e4 = tree.addMove('e2', 'e4')!;
    const e5 = tree.addMove('e7', 'e5')!;
    tree.addMove('g1', 'f3');

    // Branch: 1... c5 2. Nf3 d6
    tree.selectNode(e4.id);
    const c5 = tree.addMove('c7', 'c5')!;
    const nf3_alt = tree.addMove('g1', 'f3')!;
    const d6 = tree.addMove('d7', 'd6')!;

    expect(tree.getAllNodes().has(c5.id)).toBe(true);
    expect(tree.getAllNodes().has(d6.id)).toBe(true);

    // Delete c5 variation
    const deleted = tree.deleteVariation(c5.id);
    expect(deleted).toBe(true);

    // c5 and its descendants (nf3_alt, d6) should be removed from nodes
    expect(tree.getAllNodes().has(c5.id)).toBe(false);
    expect(tree.getAllNodes().has(nf3_alt.id)).toBe(false);
    expect(tree.getAllNodes().has(d6.id)).toBe(false);

    // e4's children should only contain e5 now
    expect(tree.getNode(e4.id)!.children).toEqual([e5.id]);

    // Current node should return to parent (e4)
    expect(tree.getCurrentNodeId()).toBe(e4.id);
  });

  it('exports full variation tree to PGN with RAV format', () => {
    tree.addMove('e2', 'e4');
    tree.addMove('e7', 'e5');
    tree.addMove('g1', 'f3');

    // Add variation 1... c5
    tree.selectNode('node_1');
    tree.addMove('c7', 'c5');

    const pgn = tree.exportPgn();
    expect(pgn).toContain('1. e4 e5 ( 1... c5 ) 2. Nf3');
  });

  it('imports PGN with nested variations and comments', () => {
    const pgnWithVariations = `
    [Event "Test Variations"]
    1. e4 e5 ( 1... c5 2. Nf3 ) ( 1... e6 ) 2. Nf3 { Great knight move } Nc6 *
    `;

    const res = tree.importPgn(pgnWithVariations);
    expect(res.success).toBe(true);

    // Check root has e4
    const root = tree.getRootNode();
    expect(root.children.length).toBe(1);

    const e4 = tree.getNode(root.children[0])!;
    expect(e4.san).toBe('e4');
    // e4 should have 3 children: e5, c5, e6
    expect(e4.children.length).toBe(3);

    const e5 = tree.getNode(e4.children[0])!;
    expect(e5.san).toBe('e5');

    const c5 = tree.getNode(e4.children[1])!;
    expect(c5.san).toBe('c5');

    const e6 = tree.getNode(e4.children[2])!;
    expect(e6.san).toBe('e6');

    // Check comment on 2. Nf3
    const nf3 = tree.getNode(e5.children[0])!;
    expect(nf3.san).toBe('Nf3');
    expect(nf3.comment).toBe('Great knight move');
  });
});
