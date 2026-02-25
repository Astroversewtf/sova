/**
 * Procedural maze generator using recursive backtracker.
 *
 * The internal grid uses "cell + wall" encoding:
 *   - Odd row/col indices are cells (walkable if carved)
 *   - Even row/col indices are walls (can be opened to connect cells)
 *
 * The returned grid is a 2D boolean array where:
 *   true  = wall
 *   false = walkable floor
 */

export interface MazeConfig {
  /** Number of cells wide (actual grid width = cellsX * 2 + 1) */
  cellsX: number;
  /** Number of cells tall (actual grid height = cellsY * 2 + 1) */
  cellsY: number;
}

export interface MazeData {
  grid: boolean[][];
  width: number;
  height: number;
  start: { x: number; y: number };
  exit: { x: number; y: number };
}

export function generateMaze(config: MazeConfig): MazeData {
  const { cellsX, cellsY } = config;
  const width = cellsX * 2 + 1;
  const height = cellsY * 2 + 1;

  // Fill everything with walls
  const grid: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(true)
  );

  // Track visited cells
  const visited: boolean[][] = Array.from({ length: cellsY }, () =>
    Array(cellsX).fill(false)
  );

  // Convert cell coords to grid coords
  const toGrid = (cx: number, cy: number) => ({
    gx: cx * 2 + 1,
    gy: cy * 2 + 1,
  });

  // Shuffle array in place
  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Recursive backtracker
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
  ];

  // Use iterative stack to avoid call-stack overflow on large mazes
  const stack: { cx: number; cy: number }[] = [];

  // Start from top-left cell
  const startCellX = 0;
  const startCellY = 0;
  visited[startCellY][startCellX] = true;
  const { gx: sgx, gy: sgy } = toGrid(startCellX, startCellY);
  grid[sgy][sgx] = false;
  stack.push({ cx: startCellX, cy: startCellY });

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = shuffle([...directions])
      .map((d) => ({
        cx: current.cx + d.dx,
        cy: current.cy + d.dy,
        dx: d.dx,
        dy: d.dy,
      }))
      .filter(
        (n) =>
          n.cx >= 0 &&
          n.cx < cellsX &&
          n.cy >= 0 &&
          n.cy < cellsY &&
          !visited[n.cy][n.cx]
      );

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[0];
    visited[next.cy][next.cx] = true;

    // Carve the cell
    const { gx: ngx, gy: ngy } = toGrid(next.cx, next.cy);
    grid[ngy][ngx] = false;

    // Carve the wall between current and next
    const { gx: cgx, gy: cgy } = toGrid(current.cx, current.cy);
    const wallX = (cgx + ngx) / 2;
    const wallY = (cgy + ngy) / 2;
    grid[wallY][wallX] = false;

    stack.push({ cx: next.cx, cy: next.cy });
  }

  // Start position: top-left cell
  const start = toGrid(startCellX, startCellY);

  // Exit position: bottom-right cell
  const exitCell = toGrid(cellsX - 1, cellsY - 1);

  return {
    grid,
    width,
    height,
    start: { x: start.gx, y: start.gy },
    exit: { x: exitCell.gx, y: exitCell.gy },
  };
}
