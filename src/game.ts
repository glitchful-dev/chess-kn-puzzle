// The puzzle, with no DOM. A square is 0..63: index = rank * 8 + file, A1 = 0, H8 = 63.

export type Square = number;

export const SIZE = 8;
const FILES = 'ABCDEFGH';

export const fileOf = (sq: Square): number => sq % SIZE;
export const rankOf = (sq: Square): number => Math.floor(sq / SIZE);
export const squareAt = (file: number, rank: number): Square => rank * SIZE + file;
export const onBoard = (file: number, rank: number): boolean =>
  file >= 0 && file < SIZE && rank >= 0 && rank < SIZE;

export const labelOf = (sq: Square): string => `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;

export function parseSquare(text: string): Square | null {
  const m = /^([a-h])([1-8])$/i.exec(text.trim());
  if (!m) return null;
  return squareAt(FILES.indexOf(m[1].toUpperCase()), Number(m[2]) - 1);
}

const square = (text: string): Square => {
  const sq = parseSquare(text);
  if (sq === null) throw new Error(`not a square: ${text}`);
  return sq;
};

export const QUEEN = square('D5');
export const START = square('H8');
/** Attacked like every other queen square, but it has its own message. */
export const F5 = square('F5');

const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];

export function knightMoves(from: Square): Square[] {
  const f = fileOf(from);
  const r = rankOf(from);
  const out: Square[] = [];
  for (const [df, dr] of KNIGHT_DELTAS) {
    if (onBoard(f + df, r + dr)) out.push(squareAt(f + df, r + dr));
  }
  return out;
}

export function isKnightMove(from: Square, to: Square): boolean {
  const df = Math.abs(fileOf(from) - fileOf(to));
  const dr = Math.abs(rankOf(from) - rankOf(to));
  return (df === 1 && dr === 2) || (df === 2 && dr === 1);
}

/**
 * Whether a queen on `queen` attacks `sq`. Nothing can block her: the only other
 * piece on the board is the knight, and it is the piece being attacked.
 */
export function queenAttacks(queen: Square, sq: Square): boolean {
  if (queen === sq) return false;
  const df = fileOf(sq) - fileOf(queen);
  const dr = rankOf(sq) - rankOf(queen);
  return df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr);
}

/** A square the knight may stand on without losing. */
export const isSafe = (sq: Square): boolean => sq !== QUEEN && !queenAttacks(QUEEN, sq);

/** Every square in reading order from the top right: H8 … A8, H7 … A7, …, H1 … A1. */
export const VISIT_ORDER: readonly Square[] = (() => {
  const order: Square[] = [];
  for (let rank = SIZE - 1; rank >= 0; rank--) {
    for (let file = SIZE - 1; file >= 0; file--) order.push(squareAt(file, rank));
  }
  return order;
})();

/** The squares to reach, in order: VISIT_ORDER minus the queen and everything she attacks. */
export const TARGETS: readonly Square[] = VISIT_ORDER.filter(isSafe);

/** Fewest knight moves from `from` to `to`, standing only on safe squares. */
export function distance(from: Square, to: Square): number {
  if (from === to) return 0;
  const seen = new Set<Square>([from]);
  let frontier: Square[] = [from];
  for (let d = 1; frontier.length > 0; d++) {
    const next: Square[] = [];
    for (const sq of frontier) {
      for (const n of knightMoves(sq)) {
        if (n === to) return d;
        if (!seen.has(n) && isSafe(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

/** The fewest moves that solve the puzzle. */
export const PAR: number = TARGETS.slice(1).reduce(
  (sum, target, i) => sum + distance(TARGETS[i], target),
  0,
);

export type LossReason = 'f5' | 'attacked' | 'queen';
export type Outcome = { kind: 'won' } | { kind: 'lost'; reason: LossReason; square: Square };

export interface Game {
  knight: Square;
  /** Index into TARGETS of the next square to reach. */
  next: number;
  moves: number;
  /** The last target reached. */
  lastVisited: Square;
  outcome: Outcome | null;
}

export function newGame(): Game {
  // The knight starts on the first target, so that one is already visited.
  return { knight: START, next: TARGETS[0] === START ? 1 : 0, moves: 0, lastVisited: START, outcome: null };
}

export const canMove = (game: Game, to: Square): boolean =>
  game.outcome === null && isKnightMove(game.knight, to);

/** The game after moving the knight to `to`, or null if that isn't a legal move now. */
export function move(game: Game, to: Square): Game | null {
  if (!canMove(game, to)) return null;
  const reached = to === TARGETS[game.next];
  const next = reached ? game.next + 1 : game.next;
  let outcome: Outcome | null = null;
  if (next === TARGETS.length) outcome = { kind: 'won' };
  else if (to === F5) outcome = { kind: 'lost', reason: 'f5', square: to };
  else if (queenAttacks(QUEEN, to)) outcome = { kind: 'lost', reason: 'attacked', square: to };
  else if (to === QUEEN) outcome = { kind: 'lost', reason: 'queen', square: to };
  return {
    knight: to,
    next,
    moves: game.moves + 1,
    lastVisited: reached ? to : game.lastVisited,
    outcome,
  };
}

/** Targets reached so far, the start square included. */
export const visitedCount = (game: Game): number => game.next;

export const isVisited = (game: Game, sq: Square): boolean => {
  const i = TARGETS.indexOf(sq);
  return i >= 0 && i < game.next;
};

export const currentTarget = (game: Game): Square | null =>
  game.next < TARGETS.length ? TARGETS[game.next] : null;

/** H:MM:SS, as the original page showed it. */
export function formatTime(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
