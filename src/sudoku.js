const SIZE = 9;
const BOX = 3;

export function cloneBoard(board) {
  return board.map(row => row.slice());
}

function shuffle(items, random = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canPlace(board, row, col, num) {
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }
  const startRow = Math.floor(row / BOX) * BOX;
  const startCol = Math.floor(col / BOX) * BOX;
  for (let r = startRow; r < startRow + BOX; r++) {
    for (let c = startCol; c < startCol + BOX; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function findEmpty(board) {
  let best = null;
  let bestCandidates = null;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== 0) continue;
      const candidates = [];
      for (let n = 1; n <= 9; n++) if (canPlace(board, r, c, n)) candidates.push(n);
      if (!best || candidates.length < bestCandidates.length) {
        best = [r, c];
        bestCandidates = candidates;
      }
      if (candidates.length === 0) return [r, c, []];
      if (candidates.length === 1) return [r, c, candidates];
    }
  }
  return best ? [best[0], best[1], bestCandidates] : null;
}

function fillBoard(board, random = Math.random) {
  const empty = findEmpty(board);
  if (!empty) return true;
  const [row, col, candidates] = empty;
  for (const num of shuffle(candidates, random)) {
    board[row][col] = num;
    if (fillBoard(board, random)) return true;
    board[row][col] = 0;
  }
  return false;
}

export function solveSudoku(input) {
  const board = cloneBoard(input);
  if (fillBoard(board)) return board;
  return null;
}

export function generatePuzzle(difficulty = "Easy", seed = null) {
  const random = seed === null ? Math.random : seededRandom(seed);
  const solution = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  fillBoard(solution, random);
  const puzzle = cloneBoard(solution);

  const removalTargets = { Easy: 36, Medium: 43, Hard: 49, Expert: 54 };
  const removeCount = removalTargets[difficulty] ?? 36;
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9]),
    random
  );
  let removed = 0;
  for (const [r, c] of positions) {
    if (removed >= removeCount) break;
    puzzle[r][c] = 0;
    removed++;
  }
  return { puzzle, solution };
}

export function isBoardComplete(board) {
  return board.every(row => row.every(value => value >= 1 && value <= 9));
}

export function getConflicts(board) {
  const conflicts = new Set();
  const addDuplicates = cells => {
    const seen = new Map();
    cells.forEach(([r, c]) => {
      const value = board[r][c];
      if (!value) return;
      if (!seen.has(value)) seen.set(value, []);
      seen.get(value).push([r, c]);
    });
    for (const positions of seen.values()) {
      if (positions.length > 1) positions.forEach(([r, c]) => conflicts.add(`${r}-${c}`));
    }
  };
  for (let i = 0; i < 9; i++) {
    addDuplicates(Array.from({ length: 9 }, (_, j) => [i, j]));
    addDuplicates(Array.from({ length: 9 }, (_, j) => [j, i]));
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const cells = [];
      for (let r = br; r < br + 3; r++) {
        for (let c = bc; c < bc + 3; c++) cells.push([r, c]);
      }
      addDuplicates(cells);
    }
  }
  return conflicts;
}

export function dateSeed(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
