// TypeScript conversion of javascript-astar with turn minimization
// based on https://github.com/bgrins/javascript-astar

interface IGridNode {
  x: number;
  y: number;
  weight: number;
  f: number;
  g: number;
  h: number;
  visited: boolean;
  closed: boolean;
  parent: GridNode | null;
  direction: [number, number] | null;
  getCost(fromNeighbor: GridNode): number;
  isWall(): boolean;
}

function pathTo(node: GridNode): GridNode[] {
  const path: GridNode[] = [];
  let curr: GridNode | null = node;
  while (curr?.parent) {
    path.unshift(curr);
    curr = curr.parent;
  }
  return path;
}

function getDirection(from: GridNode, to: GridNode): [number, number] {
  return [to.x - from.x, to.y - from.y];
}

function getHeap<T>(scoreFunction: (element: T) => number): BinaryHeap<T> {
  return new BinaryHeap(scoreFunction);
}

const TURN_PENALTY = 5;

const astar = {
  search(
    graph: Graph,
    start: GridNode,
    end: GridNode,
    options: {
      closest?: boolean;
      heuristic?: (a: GridNode, b: GridNode) => number;
    } = {}
  ): GridNode[] {
    graph.cleanDirty();
    const heuristic = options.heuristic || astar.heuristics.manhattan;
    const closest = options.closest || false;

    const openHeap = getHeap<GridNode>((node) => node.f);
    let closestNode = start;

    start.h = heuristic(start, end);
    graph.markDirty(start);

    openHeap.push(start);

    while (openHeap.size() > 0) {
      const currentNode = openHeap.pop();

      if (currentNode === end) {
        return pathTo(currentNode);
      }

      currentNode.closed = true;

      for (const neighbor of graph.neighbors(currentNode)) {
        if (neighbor.closed || neighbor.isWall()) continue;

        const dir = getDirection(currentNode, neighbor);
        const isTurning =
          !currentNode.direction ||
          currentNode.direction[0] !== dir[0] ||
          currentNode.direction[1] !== dir[1];

        const turnCost = isTurning ? TURN_PENALTY : 0;
        const gScore = currentNode.g + neighbor.getCost(currentNode) + turnCost;
        const beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.direction = dir;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          graph.markDirty(neighbor);

          if (closest &&
              (neighbor.h < closestNode.h ||
               (neighbor.h === closestNode.h && neighbor.g < closestNode.g))) {
            closestNode = neighbor;
          }

          if (!beenVisited) {
            openHeap.push(neighbor);
          } else {
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    if (closest) {
      return pathTo(closestNode);
    }

    return [];
  },

  heuristics: {
    manhattan(pos0: GridNode, pos1: GridNode): number {
      return Math.abs(pos1.x - pos0.x) + Math.abs(pos1.y - pos0.y);
    },

    diagonal(pos0: GridNode, pos1: GridNode): number {
      const D = 1;
      const D2 = Math.SQRT2;
      const d1 = Math.abs(pos1.x - pos0.x);
      const d2 = Math.abs(pos1.y - pos0.y);
      return D * (d1 + d2) + (D2 - 2 * D) * Math.min(d1, d2);
    }
  },

  cleanNode(node: GridNode) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
    node.direction = null;
  }
};

class Graph {
  nodes: GridNode[] = [];
  grid: GridNode[][] = [];
  dirtyNodes: GridNode[] = [];
  diagonal: boolean;

  constructor(gridIn: number[][], options: { diagonal?: boolean } = {}) {
    this.diagonal = !!options.diagonal;
    for (let x = 0; x < gridIn.length; x++) {
      this.grid[x] = [];
      for (let y = 0; y < gridIn[x].length; y++) {
        const node = new GridNode(x, y, gridIn[x][y]);
        this.grid[x][y] = node;
        this.nodes.push(node);
      }
    }
    this.init();
  }

  init() {
    this.dirtyNodes = [];
    for (const node of this.nodes) {
      astar.cleanNode(node);
    }
  }

  cleanDirty() {
    for (const node of this.dirtyNodes) {
      astar.cleanNode(node);
    }
    this.dirtyNodes = [];
  }

  markDirty(node: GridNode) {
    this.dirtyNodes.push(node);
  }

  neighbors(node: GridNode): GridNode[] {
    const ret: GridNode[] = [];
    const { x, y } = node;
    const grid = this.grid;

    if (grid[x - 1]?.[y]) ret.push(grid[x - 1][y]);
    if (grid[x + 1]?.[y]) ret.push(grid[x + 1][y]);
    if (grid[x]?.[y - 1]) ret.push(grid[x][y - 1]);
    if (grid[x]?.[y + 1]) ret.push(grid[x][y + 1]);

    if (this.diagonal) {
      if (grid[x - 1]?.[y - 1]) ret.push(grid[x - 1][y - 1]);
      if (grid[x + 1]?.[y - 1]) ret.push(grid[x + 1][y - 1]);
      if (grid[x - 1]?.[y + 1]) ret.push(grid[x - 1][y + 1]);
      if (grid[x + 1]?.[y + 1]) ret.push(grid[x + 1][y + 1]);
    }

    return ret;
  }

  toString(): string {
    return this.grid
      .map((row) => row.map((node) => node.weight).join(" "))
      .join("\n");
  }
}

class GridNode implements IGridNode {
  f = 0;
  g = 0;
  h = 0;
  visited = false;
  closed = false;
  parent: GridNode | null = null;
  direction: [number, number] | null = null;

  constructor(public x: number, public y: number, public weight: number) {}

  toString(): string {
    return `[${this.x} ${this.y}]`;
  }

  getCost(fromNeighbor: GridNode): number {
    return (fromNeighbor.x !== this.x && fromNeighbor.y !== this.y)
      ? this.weight * Math.SQRT2
      : this.weight;
  }

  isWall(): boolean {
    return this.weight === 0;
  }
}

class BinaryHeap<T> {
  content: T[] = [];

  constructor(public scoreFunction: (element: T) => number) {}

  push(element: T): void {
    this.content.push(element);
    this.sinkDown(this.content.length - 1);
  }

  pop(): T {
    const result = this.content[0];
    const end = this.content.pop();
    if (this.content.length > 0 && end !== undefined) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  }

  remove(node: T): void {
    const i = this.content.indexOf(node);
    const end = this.content.pop();
    if (i !== this.content.length && end !== undefined) {
      this.content[i] = end;
      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  }

  size(): number {
    return this.content.length;
  }

  rescoreElement(node: T): void {
    this.sinkDown(this.content.indexOf(node));
  }

  sinkDown(n: number): void {
    const element = this.content[n];
    while (n > 0) {
      const parentN = ((n + 1) >> 1) - 1;
      const parent = this.content[parentN];
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        n = parentN;
      } else {
        break;
      }
    }
  }

  bubbleUp(n: number): void {
    const length = this.content.length;
    const element = this.content[n];
    const elemScore = this.scoreFunction(element);

    while (true) {
      const child2N = (n + 1) << 1;
      const child1N = child2N - 1;
      let swap: number | null = null;
      let child1Score: number=0;

      if (child1N < length) {
        const child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      if (child2N < length) {
        const child2 = this.content[child2N];
        const child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      } else {
        break;
      }
    }
  }
}

export { astar, Graph, GridNode };
