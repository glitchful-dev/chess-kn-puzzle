import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  F5, PAR, QUEEN, START, TARGETS, VISIT_ORDER, distance, formatTime, isSafe, knightMoves,
  labelOf, move, newGame, parseSquare, queenAttacks, type Game, type Square,
} from './game.ts';

const sq = (text: string): Square => {
  const s = parseSquare(text);
  assert.notEqual(s, null, text);
  return s as Square;
};

/** Plays a whole game along shortest safe paths, one target after another. */
function shortestPath(from: Square, to: Square): Square[] {
  const prev = new Map<Square, Square>([[from, from]]);
  const queue: Square[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift() as Square;
    if (cur === to) break;
    for (const n of knightMoves(cur)) {
      if (!prev.has(n) && (isSafe(n) || n === to)) {
        prev.set(n, cur);
        queue.push(n);
      }
    }
  }
  const path: Square[] = [];
  for (let cur = to; cur !== from; cur = prev.get(cur) as Square) path.unshift(cur);
  return path;
}

test('squares and labels round-trip', () => {
  assert.equal(labelOf(0), 'A1');
  assert.equal(labelOf(63), 'H8');
  assert.equal(labelOf(QUEEN), 'D5');
  assert.equal(sq('f5'), F5);
  assert.equal(parseSquare('i9'), null);
  for (let s = 0; s < 64; s++) assert.equal(parseSquare(labelOf(s)), s);
});

test('visit order runs H8 to A8, then down the ranks to A1', () => {
  assert.equal(VISIT_ORDER.length, 64);
  assert.deepEqual(VISIT_ORDER.slice(0, 9).map(labelOf), ['H8', 'G8', 'F8', 'E8', 'D8', 'C8', 'B8', 'A8', 'H7']);
  assert.equal(labelOf(VISIT_ORDER[63]), 'A1');
});

test('the queen on D5 attacks 27 squares, leaving 36 to visit', () => {
  const attacked = VISIT_ORDER.filter((s) => queenAttacks(QUEEN, s));
  assert.equal(attacked.length, 27);
  assert.equal(TARGETS.length, 36);
  assert.equal(TARGETS[0], START);
  assert.equal(labelOf(TARGETS[1]), 'F8'); // G8 is on the queen's diagonal
  assert.equal(labelOf(TARGETS[TARGETS.length - 1]), 'A1');
  assert.ok(!TARGETS.includes(QUEEN));
});

test('knight moves stay on the board', () => {
  assert.deepEqual(knightMoves(sq('H8')).map(labelOf).sort(), ['F7', 'G6']);
  assert.equal(knightMoves(sq('D4')).length, 8);
});

test('illegal moves are refused', () => {
  const g = newGame();
  assert.equal(move(g, sq('H7')), null);
  assert.equal(move(g, sq('F8')), null);
});

test('a move onto an attacked square loses', () => {
  const g = move(newGame(), sq('G6')) as Game; // G6: not on any of the queen's lines
  assert.equal(g.outcome, null);
  const lost = move(g, sq('E5')) as Game;
  assert.deepEqual(lost.outcome, { kind: 'lost', reason: 'attacked', square: sq('E5') });
  assert.equal(move(lost, sq('G6')), null, 'no moves after the game ends');
});

test('F5 has its own message', () => {
  const g = move(move(newGame(), sq('G6')) as Game, sq('H4')) as Game;
  assert.equal(g.outcome, null);
  const lost = move(g, F5) as Game;
  assert.deepEqual(lost.outcome, { kind: 'lost', reason: 'f5', square: F5 });
});

test('capturing the queen loses', () => {
  // E7 -> D5 is a knight move, and E7 is safe.
  const at: Game = { ...newGame(), knight: sq('E7') };
  assert.ok(isSafe(sq('E7')));
  const lost = move(at, QUEEN) as Game;
  assert.deepEqual(lost.outcome, { kind: 'lost', reason: 'queen', square: QUEEN });
});

test('reaching the next target advances; other safe squares do not', () => {
  let g = newGame();
  assert.equal(g.next, 1);
  g = move(g, sq('G6')) as Game;
  assert.equal(g.next, 1);
  g = move(g, sq('F8')) as Game;
  assert.equal(g.next, 2);
  assert.equal(g.lastVisited, sq('F8'));
  assert.equal(g.moves, 2);
});

test('the puzzle is solvable, and par is the sum of shortest hops', () => {
  for (let i = 1; i < TARGETS.length; i++) {
    assert.ok(Number.isFinite(distance(TARGETS[i - 1], TARGETS[i])), `${labelOf(TARGETS[i])} is reachable`);
  }
  let g = newGame();
  while (g.outcome === null) {
    for (const s of shortestPath(g.knight, TARGETS[g.next])) {
      g = move(g, s) as Game;
      assert.notEqual(g, null);
    }
  }
  assert.deepEqual(g.outcome, { kind: 'won' });
  assert.equal(g.moves, PAR);
});

test('time is H:MM:SS', () => {
  assert.equal(formatTime(0), '0:00:00');
  assert.equal(formatTime(61_999), '0:01:01');
  assert.equal(formatTime(3_600_000 + 5_000), '1:00:05');
});
