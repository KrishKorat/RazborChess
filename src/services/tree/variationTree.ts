import { Chess } from 'chess.js';
import { GameMetadata, GameReviewStep, MoveClassification } from '../../types/chess';

export interface TreeNode {
  id: string;
  parentId: string | null;
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  from: string;
  to: string;
  san: string;
  uci: string;
  promotion?: string;
  captured?: string;
  fen: string;
  children: string[]; // Ordered list of child node IDs. index 0 is primary / mainline from this point.
  comment?: string;
  nag?: string; // e.g. "!", "?", "!!", "??", "!?", "?!"
  review?: GameReviewStep;
  classification?: MoveClassification;
}

export class VariationTree {
  private nodes: Map<string, TreeNode> = new Map();
  private rootId: string = 'root';
  private currentNodeId: string = 'root';
  private nodeCounter: number = 0;
  private initialFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  constructor(startingFen?: string) {
    if (startingFen) {
      this.initialFen = startingFen;
    }
    this.createRootNode(this.initialFen);
  }

  private createRootNode(fen: string): void {
    const rootNode: TreeNode = {
      id: 'root',
      parentId: null,
      ply: 0,
      moveNumber: 0,
      color: 'b',
      from: '',
      to: '',
      san: '',
      uci: '',
      fen,
      children: [],
    };
    this.nodes.clear();
    this.nodes.set('root', rootNode);
    this.rootId = 'root';
    this.currentNodeId = 'root';
    this.nodeCounter = 0;
  }

  public getRootNode(): TreeNode {
    return this.nodes.get(this.rootId)!;
  }

  public getNode(id: string): TreeNode | undefined {
    return this.nodes.get(id);
  }

  public getCurrentNode(): TreeNode {
    return this.nodes.get(this.currentNodeId) || this.getRootNode();
  }

  public getCurrentNodeId(): string {
    return this.currentNodeId;
  }

  public getFen(): string {
    return this.getCurrentNode().fen;
  }

  public getAllNodes(): Map<string, TreeNode> {
    return new Map(this.nodes);
  }

  /**
   * Restores a serialized array of tree nodes into this tree.
   */
  public restoreTree(nodes: TreeNode[], currentNodeId?: string, startingFen?: string): void {
    if (!nodes || nodes.length === 0) {
      this.reset(startingFen);
      return;
    }

    this.nodes.clear();
    let maxCounter = 0;

    for (const node of nodes) {
      this.nodes.set(node.id, { ...node, children: [...node.children] });
      if (node.id.startsWith('node_')) {
        const num = parseInt(node.id.replace('node_', ''), 10);
        if (!isNaN(num) && num > maxCounter) {
          maxCounter = num;
        }
      }
    }

    this.rootId = 'root';
    if (!this.nodes.has('root')) {
      this.createRootNode(startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    } else if (startingFen) {
      this.initialFen = startingFen;
    }

    this.nodeCounter = maxCounter;
    this.currentNodeId = (currentNodeId && this.nodes.has(currentNodeId)) ? currentNodeId : this.rootId;
  }

  /**
   * Adds or navigates to a move from the currentNode.
   * If the move already exists as a child, it navigates to it without duplicating.
   * Otherwise, it creates a new branch child node, preserving all existing branches.
   */
  public addMove(from: string, to: string, promotion?: string, comment?: string, nag?: string): TreeNode | null {
    const current = this.getCurrentNode();
    const chess = new Chess(current.fen);

    try {
      const moveResult = chess.move({
        from,
        to,
        promotion: promotion || undefined,
      });

      if (!moveResult) return null;

      const uci = `${from}${to}${moveResult.promotion || ''}`;

      // 1. Check if this exact move already exists among the children of the current node
      for (const childId of current.children) {
        const child = this.nodes.get(childId);
        if (child && child.uci === uci) {
          // Move already exists: navigate to it
          this.currentNodeId = child.id;
          return child;
        }
      }

      // 2. Create a new tree node
      this.nodeCounter++;
      const newNodeId = `node_${this.nodeCounter}`;
      const moveNumber = current.color === 'w' ? current.moveNumber : current.moveNumber + 1;

      const newNode: TreeNode = {
        id: newNodeId,
        parentId: current.id,
        ply: current.ply + 1,
        moveNumber,
        color: moveResult.color,
        from: moveResult.from,
        to: moveResult.to,
        san: moveResult.san,
        uci,
        promotion: moveResult.promotion,
        captured: moveResult.captured,
        fen: chess.fen(),
        children: [],
        comment,
        nag,
      };

      this.nodes.set(newNodeId, newNode);
      current.children.push(newNodeId);
      this.currentNodeId = newNodeId;

      return newNode;
    } catch (e) {
      return null;
    }
  }

  /**
   * Selects a node by ID.
   */
  public selectNode(id: string): boolean {
    if (this.nodes.has(id)) {
      this.currentNodeId = id;
      return true;
    }
    return false;
  }

  /**
   * Navigates to the parent of the current node.
   */
  public goToPrevious(): boolean {
    const current = this.getCurrentNode();
    if (current.parentId && this.nodes.has(current.parentId)) {
      this.currentNodeId = current.parentId;
      return true;
    }
    return false;
  }

  /**
   * Navigates to the primary (mainline) child of the current node.
   */
  public goToNext(): boolean {
    const current = this.getCurrentNode();
    if (current.children.length > 0) {
      const nextId = current.children[0];
      if (this.nodes.has(nextId)) {
        this.currentNodeId = nextId;
        return true;
      }
    }
    return false;
  }

  /**
   * Navigates to the root position.
   */
  public goToRoot(): void {
    this.currentNodeId = this.rootId;
  }

  /**
   * Navigates to the end of the current branch line.
   */
  public goToLastInLine(): void {
    let curr = this.getCurrentNode();
    while (curr.children.length > 0) {
      const nextId = curr.children[0];
      const nextNode = this.nodes.get(nextId);
      if (!nextNode) break;
      curr = nextNode;
    }
    this.currentNodeId = curr.id;
  }

  /**
   * Promotes a node to become the primary variation (children[0]) of its parent.
   * If deep is true, recursively promotes all ancestor nodes up to root.
   */
  public promoteVariation(nodeId: string, deep: boolean = true): boolean {
    if (nodeId === this.rootId) return false;

    let targetNode = this.nodes.get(nodeId);
    if (!targetNode || !targetNode.parentId) return false;

    while (targetNode && targetNode.parentId) {
      const parent = this.nodes.get(targetNode.parentId);
      if (!parent) break;

      const idx = parent.children.indexOf(targetNode.id);
      if (idx > 0) {
        // Move targetNode to index 0
        parent.children.splice(idx, 1);
        parent.children.unshift(targetNode.id);
      }

      if (!deep) break;
      targetNode = parent;
    }

    return true;
  }

  /**
   * Deletes a variation node and all its descendants.
   */
  public deleteVariation(nodeId: string): boolean {
    if (nodeId === this.rootId) return false;

    const node = this.nodes.get(nodeId);
    if (!node || !node.parentId) return false;

    const parent = this.nodes.get(node.parentId);
    if (!parent) return false;

    // Remove from parent's children list
    const idx = parent.children.indexOf(nodeId);
    if (idx !== -1) {
      parent.children.splice(idx, 1);
    }

    // Check if currentNodeId is within the subtree to be deleted
    const isCurrentInSubtree = this.isDescendantOf(this.currentNodeId, nodeId);
    if (this.currentNodeId === nodeId || isCurrentInSubtree) {
      this.currentNodeId = parent.id;
    }

    // Recursively delete node and its descendants
    this.deleteSubtreeRecursive(nodeId);

    return true;
  }

  private isDescendantOf(checkNodeId: string, ancestorNodeId: string): boolean {
    let curr = this.nodes.get(checkNodeId);
    while (curr && curr.parentId) {
      if (curr.parentId === ancestorNodeId) return true;
      curr = this.nodes.get(curr.parentId);
    }
    return false;
  }

  private deleteSubtreeRecursive(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    for (const childId of node.children) {
      this.deleteSubtreeRecursive(childId);
    }

    this.nodes.delete(nodeId);
  }

  /**
   * Sets comment or annotation glyph on a node.
   */
  public setComment(nodeId: string, comment?: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.comment = comment || undefined;
    }
  }

  public setNag(nodeId: string, nag?: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.nag = nag || undefined;
    }
  }

  /**
   * Checks if a node is currently on the primary mainline (all ancestors are index 0).
   */
  public isMainlineNode(nodeId: string): boolean {
    if (nodeId === this.rootId) return true;

    let curr = this.nodes.get(nodeId);
    while (curr && curr.parentId) {
      const parent = this.nodes.get(curr.parentId);
      if (!parent || parent.children[0] !== curr.id) {
        return false;
      }
      curr = parent;
    }
    return true;
  }

  /**
   * Returns path of node IDs from root to the specified node (or currentNode).
   */
  public getPathToNode(nodeId?: string): TreeNode[] {
    const targetId = nodeId || this.currentNodeId;
    const path: TreeNode[] = [];
    let curr = this.nodes.get(targetId);

    while (curr) {
      path.unshift(curr);
      curr = curr.parentId ? this.nodes.get(curr.parentId) : undefined;
    }

    return path;
  }

  /**
   * Returns the entire mainline path from root down to the last mainline node.
   */
  public getMainlinePath(): TreeNode[] {
    const path: TreeNode[] = [];
    let curr: TreeNode | undefined = this.getRootNode();

    while (curr) {
      path.push(curr);
      if (curr.children.length === 0) break;
      curr = this.nodes.get(curr.children[0]);
    }

    return path;
  }

  /**
   * Resets the entire tree.
   */
  public reset(startingFen?: string): void {
    this.initialFen = startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    this.createRootNode(this.initialFen);
  }

  /**
   * Exports the entire variation tree into a standard PGN string with RAV parentheses.
   */
  public exportPgn(headers: Partial<GameMetadata> | Record<string, string | undefined> = {}): string {
    let pgn = '';

    // Headers
    const allHeaders: Record<string, string> = {
      Event: 'RazborChess Analysis',
      Site: 'RazborChess',
      Date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      Round: '1',
      White: 'White',
      Black: 'Black',
      Result: '*',
    };

    if (headers.white) allHeaders.White = headers.white;
    if (headers.black) allHeaders.Black = headers.black;
    if (headers.event) allHeaders.Event = headers.event;
    if (headers.site) allHeaders.Site = headers.site;
    if (headers.date) allHeaders.Date = headers.date;
    if (headers.round) allHeaders.Round = headers.round;
    if (headers.result) allHeaders.Result = headers.result;
    if (headers.whiteElo) allHeaders.WhiteElo = headers.whiteElo;
    if (headers.blackElo) allHeaders.BlackElo = headers.blackElo;

    for (const [key, val] of Object.entries(allHeaders)) {
      pgn += `[${key} "${val}"]\n`;
    }
    pgn += '\n';

    const root = this.getRootNode();
    const moveText = this.exportSubtreePgn(root);
    pgn += moveText.trim() + ' ' + (allHeaders.Result || '*');

    return pgn.trim();
  }

  private exportSubtreePgn(node: TreeNode): string {
    if (node.children.length === 0) return '';

    let text = '';
    const mainChildId = node.children[0];
    const mainChild = this.nodes.get(mainChildId);
    if (!mainChild) return '';

    // Format move
    if (mainChild.color === 'w') {
      text += `${mainChild.moveNumber}. ${mainChild.san}`;
    } else {
      // Black move: only prefix move number if starting from root
      if (node.id === 'root') {
        text += `${mainChild.moveNumber}... ${mainChild.san}`;
      } else {
        text += `${mainChild.san}`;
      }
    }

    if (mainChild.nag) text += ` ${mainChild.nag}`;
    if (mainChild.comment) text += ` { ${mainChild.comment} }`;
    text += ' ';

    // Alternative variations branching from the same parent
    if (node.children.length > 1) {
      for (let i = 1; i < node.children.length; i++) {
        const altChild = this.nodes.get(node.children[i]);
        if (altChild) {
          const altPrefix = altChild.color === 'w' 
            ? `${altChild.moveNumber}. ` 
            : `${altChild.moveNumber}... `;
          let altText = `( ${altPrefix}${altChild.san}`;
          if (altChild.nag) altText += ` ${altChild.nag}`;
          if (altChild.comment) altText += ` { ${altChild.comment} }`;
          altText += ' ' + this.exportSubtreePgn(altChild);
          text += altText.trim() + ' ) ';
        }
      }
    }

    text += this.exportSubtreePgn(mainChild);
    return text;
  }

  /**
   * Imports a PGN string with support for nested RAV variations ( ... ) and comments { ... }.
   */
  public importPgn(pgn: string): { success: boolean; error?: string } {
    try {
      const trimmed = pgn.trim();
      if (!trimmed) {
        return { success: false, error: 'PGN cannot be empty.' };
      }

      this.reset();

      // Extract move text after headers
      const lines = trimmed.split('\n');
      const moveLines: string[] = [];
      for (const line of lines) {
        const l = line.trim();
        if (l.startsWith('[') && l.endsWith(']')) {
          continue; // header tag
        }
        moveLines.push(l);
      }

      const body = moveLines.join(' ');
      return this.parsePgnBody(body);
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to parse PGN variations' };
    }
  }

  private parsePgnBody(body: string): { success: boolean; error?: string } {
    // Tokenizer handling comments { }, variations ( ), and move tokens
    const tokens: string[] = [];
    let i = 0;
    while (i < body.length) {
      const ch = body[i];

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      if (ch === '(' || ch === ')') {
        tokens.push(ch);
        i++;
        continue;
      }

      if (ch === '{') {
        const endIdx = body.indexOf('}', i);
        if (endIdx === -1) {
          tokens.push(body.substring(i));
          break;
        }
        tokens.push(body.substring(i, endIdx + 1));
        i = endIdx + 1;
        continue;
      }

      // Read standard word token
      let token = '';
      while (i < body.length && !/\s/.test(body[i]) && body[i] !== '(' && body[i] !== ')' && body[i] !== '{') {
        token += body[i];
        i++;
      }
      tokens.push(token);
    }

    // Parse tokens recursively with stack for variation levels
    const stack: string[] = [this.rootId];
    let lastAddedNodeId: string | null = null;

    for (let t = 0; t < tokens.length; t++) {
      const token = tokens[t];

      // Game result terminal tokens
      if (['1-0', '0-1', '1/2-1/2', '*'].includes(token)) {
        continue;
      }

      // Comment
      if (token.startsWith('{') && token.endsWith('}')) {
        const commentText = token.slice(1, -1).trim();
        if (lastAddedNodeId) {
          this.setComment(lastAddedNodeId, commentText);
        }
        continue;
      }

      // NAG or symbol
      if (token.startsWith('$') || ['!', '?', '!!', '??', '!?', '?!'].includes(token)) {
        if (lastAddedNodeId) {
          this.setNag(lastAddedNodeId, token);
        }
        continue;
      }

      // Start of alternative variation: branch from parent of last added move
      if (token === '(') {
        if (lastAddedNodeId) {
          const lastNode = this.nodes.get(lastAddedNodeId);
          if (lastNode && lastNode.parentId) {
            stack.push(lastNode.parentId);
            this.currentNodeId = lastNode.parentId;
          }
        }
        continue;
      }

      // End of alternative variation: pop stack and resume previous branch context
      if (token === ')') {
        if (stack.length > 1) {
          stack.pop();
          this.currentNodeId = stack[stack.length - 1];
          lastAddedNodeId = this.currentNodeId !== this.rootId ? this.currentNodeId : null;
        }
        continue;
      }

      // Move number (e.g. "1.", "1...", "24.")
      if (/^\d+\.+$/.test(token)) {
        continue;
      }

      // Otherwise it's a move string (e.g. "e4", "Nf3", "O-O", "e8=Q")
      const curr = this.getCurrentNode();
      const chess = new Chess(curr.fen);
      try {
        const res = chess.move(token);
        if (!res) {
          continue;
        }
        const newNode = this.addMove(res.from, res.to, res.promotion);
        if (newNode) {
          lastAddedNodeId = newNode.id;
          stack[stack.length - 1] = newNode.id;
        }
      } catch (err) {
        // Skip unparseable move token
      }
    }

    this.goToRoot();
    return { success: true };
  }
}
