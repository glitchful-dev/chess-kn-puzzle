import type { TargetedKeyboardEvent } from 'preact';
import { useRef } from 'preact/hooks';
import {
  QUEEN, SIZE, canMove, currentTarget, fileOf, isVisited, labelOf, queenAttacks, rankOf, squareAt,
  type Game, type Square,
} from './game.ts';
import { Knight, Queen } from './pieces.tsx';

interface BoardProps {
  game: Game;
  /** The square holding the board's single tab stop. */
  cursor: Square;
  onCursorChange: (sq: Square) => void;
  /** A square was clicked, or activated with Enter / Space. */
  onPick: (sq: Square) => void;
  showMoves: boolean;
  showAttacks: boolean;
}

const RANKS = Array.from({ length: SIZE }, (_, i) => SIZE - 1 - i); // 8 at the top
const FILES = Array.from({ length: SIZE }, (_, i) => i);

const focusSquare = (board: Element | null, sq: Square) =>
  board?.querySelector<HTMLButtonElement>(`[data-sq="${sq}"]`)?.focus();

/**
 * The board: an ARIA grid of 64 buttons with one tab stop. Arrows move the cursor,
 * Home/End go to the ends of the rank, PageUp/PageDown to the ends of the file.
 *
 * Its squares keep the same colours in both themes, like a real board, so it is pinned to
 * the light theme: pieces, marks and focus rings inside it then read against those squares.
 */
export function Board({ game, cursor, onCursorChange, onPick, showMoves, showAttacks }: BoardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const target = game.outcome ? null : currentTarget(game);
  const lost = game.outcome?.kind === 'lost' ? game.outcome.square : null;
  const revealAttacks = showAttacks || lost !== null;

  const go = (sq: Square) => {
    onCursorChange(sq);
    focusSquare(ref.current, sq);
  };

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const f = fileOf(cursor);
    const r = rankOf(cursor);
    const clamp = (n: number) => Math.min(SIZE - 1, Math.max(0, n));
    let to: Square;
    switch (e.key) {
      case 'ArrowUp': to = squareAt(f, clamp(r + 1)); break;
      case 'ArrowDown': to = squareAt(f, clamp(r - 1)); break;
      case 'ArrowLeft': to = squareAt(clamp(f - 1), r); break;
      case 'ArrowRight': to = squareAt(clamp(f + 1), r); break;
      case 'Home': to = squareAt(0, r); break;
      case 'End': to = squareAt(SIZE - 1, r); break;
      case 'PageUp': to = squareAt(f, SIZE - 1); break;
      case 'PageDown': to = squareAt(f, 0); break;
      default: return;
    }
    e.preventDefault();
    go(to);
  };

  return (
    <div class="kp-board" data-theme="light" role="grid" aria-label="Board" ref={ref} onKeyDown={onKeyDown}>
      {RANKS.map((rank) => (
        <div class="kp-board__rank" role="row" key={rank}>
          {FILES.map((file) => {
            const sq = squareAt(file, rank);
            const hasKnight = game.knight === sq;
            const hasQueen = sq === QUEEN && !hasKnight;
            const isTarget = sq === target;
            const legal = showMoves && canMove(game, sq);
            const visited = !hasKnight && isVisited(game, sq);
            const attacked = revealAttacks && queenAttacks(QUEEN, sq);
            const name = [
              labelOf(sq),
              hasKnight && 'knight',
              hasQueen && 'queen',
              isTarget && 'next target',
              visited && 'visited',
              legal && 'knight can move here',
              attacked && 'attacked',
            ].filter(Boolean).join(', ');
            return (
              <button
                key={sq}
                type="button"
                role="gridcell"
                class="kp-square"
                data-sq={sq}
                data-shade={(file + rank) % 2 === 0 ? 'dark' : 'light'}
                data-target={isTarget || undefined}
                data-legal={legal || undefined}
                data-attacked={attacked || undefined}
                data-lost={sq === lost || undefined}
                aria-label={name}
                tabIndex={sq === cursor ? 0 : -1}
                onClick={() => onPick(sq)}
                onFocus={() => sq !== cursor && onCursorChange(sq)}
              >
                {file === 0 && <span class="kp-square__rank" aria-hidden="true">{rank + 1}</span>}
                {rank === 0 && <span class="kp-square__file" aria-hidden="true">{'ABCDEFGH'[file]}</span>}
                {hasQueen && <Queen />}
                {hasKnight && <Knight />}
                {legal && !hasKnight && !hasQueen && <span class="kp-square__dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
