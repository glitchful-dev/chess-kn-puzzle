import {
  AppShell, Badge, Button, Card, CardBody, CardHeader, Dialog, Icon, ProgressBar,
  SegmentedControl, StatusBar, StatusBarItem, Switch, useTheme, type StatusTone,
} from '@glitchful-dev/ds-ui';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { Board } from './Board.tsx';
import {
  PAR, QUEEN, START, TARGETS, currentTarget, formatTime, labelOf, move, newGame,
  visitedCount, type Game, type LossReason, type Square,
} from './game.ts';
import { Knight } from './pieces.tsx';
import { load, save } from './storage.ts';

interface Settings { showMoves: boolean; showAttacks: boolean }
interface Best { moves: number | null; ms: number | null }

const SETTINGS_KEY = 'kn-puzzle:settings';
const BEST_KEY = 'kn-puzzle:best';

// The original page's messages.
const LOSS_TITLES: Record<LossReason, string> = {
  f5: 'Knife F5 also loses!',
  attacked: 'Knight can be captured!',
  queen: 'Leave the Queen alone!',
};

export function App() {
  const [game, setGame] = useState<Game>(newGame);
  const [cursor, setCursor] = useState<Square>(START);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [resultOpen, setResultOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [newBest, setNewBest] = useState<{ moves: boolean; ms: boolean }>({ moves: false, ms: false });
  const [settings, setSettings] = useState<Settings>(() =>
    load<Settings>(SETTINGS_KEY, { showMoves: false, showAttacks: false }));
  const [best, setBest] = useState<Best>(() => load<Best>(BEST_KEY, { moves: null, ms: null }));

  const playing = startedAt !== null && game.outcome === null;
  const elapsed = startedAt === null ? 0 : (finishedAt ?? now) - startedAt;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [playing]);

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    save(SETTINGS_KEY, next);
  };

  const restart = useCallback(() => {
    setGame(newGame());
    setStartedAt(null);
    setFinishedAt(null);
    setResultOpen(false);
    setHint(null);
    setAnnouncement(`New game. Knight on ${labelOf(START)}, next target ${labelOf(TARGETS[1])}.`);
  }, []);

  const pick = useCallback((sq: Square) => {
    setCursor(sq);
    const refuse = (text: string) => {
      setHint(text);
      setAnnouncement(text);
    };
    if (game.outcome) {
      refuse('Game over. Restart to play again.');
      return;
    }
    const next = move(game, sq);
    if (!next) {
      refuse(sq === game.knight
        ? `The knight is on ${labelOf(sq)}.`
        : `${labelOf(sq)} isn't a knight move from ${labelOf(game.knight)}.`);
      return;
    }
    const t = Date.now();
    const started = startedAt ?? t;
    if (startedAt === null) setStartedAt(t);
    setNow(t);
    setGame(next);
    setHint(null);
    const reached = next.next > game.next ? `, ${labelOf(sq)} visited` : '';
    const upcoming = currentTarget(next);
    setAnnouncement(`Knight to ${labelOf(sq)}${reached}.${!next.outcome && upcoming !== null ? ` Next target ${labelOf(upcoming)}.` : ''}`);
    if (!next.outcome) return;
    setFinishedAt(t);
    setResultOpen(true);
    if (next.outcome.kind === 'won') {
      const ms = t - started;
      const record = {
        moves: best.moves === null || next.moves < best.moves,
        ms: best.ms === null || ms < best.ms,
      };
      setNewBest(record);
      const updated = { moves: record.moves ? next.moves : best.moves, ms: record.ms ? ms : best.ms };
      setBest(updated);
      save(BEST_KEY, updated);
    }
  }, [game, startedAt, best]);

  const visited = visitedCount(game);
  const target = currentTarget(game);
  const outcome = game.outcome;

  const state: { tone: StatusTone; text: string } =
    outcome?.kind === 'won' ? { tone: 'success', text: 'Solved' }
      : outcome ? { tone: 'danger', text: 'Lost' }
        : playing ? { tone: 'accent', text: 'Playing' }
          : { tone: 'neutral', text: 'Ready' };

  return (
    <AppShell
      header={<Header onRestart={restart} />}
      statusBar={
        <StatusBar
          start={
            <>
              <StatusBarItem dot={state.tone} pulse={playing}>{state.text}</StatusBarItem>
              <StatusBarItem label="Last" value={labelOf(game.lastVisited)} />
              {hint && <StatusBarItem className="kp-hint">{hint}</StatusBarItem>}
            </>
          }
          end={
            <>
              <StatusBarItem label="Par" value={String(PAR)} />
              <StatusBarItem label="Best" value={best.ms === null ? '-' : `${formatTime(best.ms)} · ${best.moves}`} />
            </>
          }
        />
      }
    >
      <div class="kp-layout">
        <section class="kp-stage" aria-label="Puzzle">
          <div class="kp-play">
            <div class="kp-score">
              <Stat label="Target" value={target === null ? '-' : labelOf(target)} accent={target !== null && !outcome} />
              <Stat label="Visited" value={`${visited}/${TARGETS.length}`} />
              <Stat label="Moves" value={String(game.moves)} />
              <Stat label="Time" value={formatTime(elapsed)} />
              <ProgressBar
                className="kp-score__progress"
                label="Squares visited"
                value={visited}
                max={TARGETS.length}
                size="sm"
                tone={outcome?.kind === 'won' ? 'success' : outcome ? 'danger' : 'accent'}
              />
            </div>
            <Board
              game={game}
              cursor={cursor}
              onCursorChange={setCursor}
              onPick={pick}
              showMoves={settings.showMoves}
              showAttacks={settings.showAttacks}
            />
          </div>
        </section>

        <aside class="kp-panel" aria-label="About the puzzle">
          <Card as="section">
            <CardHeader>How to play</CardHeader>
            <CardBody className="kp-prose">
              <ol>
                <li>Move the knight by clicking a square it can reach.</li>
                <li>
                  Visit every square in order: <span class="ds-mono">H8</span> to <span class="ds-mono">A8</span>,
                  then <span class="ds-mono">H7</span> to <span class="ds-mono">A7</span>, and on down to{' '}
                  <span class="ds-mono">A1</span>.
                </li>
                <li>Skip the squares the queen attacks, and never land on one.</li>
                <li>Leave the queen alone.</li>
              </ol>
              <p class="ds-muted">
                The outlined square is the next one to reach. The clock starts with your first move.
              </p>
            </CardBody>
          </Card>

          <Card as="section">
            <CardHeader>Options</CardHeader>
            <CardBody className="ds-stack">
              <Switch checked={settings.showMoves} onCheckedChange={(v) => updateSettings({ showMoves: v })}>
                Show knight moves
              </Switch>
              <Switch checked={settings.showAttacks} onCheckedChange={(v) => updateSettings({ showAttacks: v })}>
                Show the queen's attacks
              </Switch>
            </CardBody>
          </Card>
        </aside>
      </div>

      <div class="ds-visually-hidden" role="status" aria-live="polite">{announcement}</div>

      <Dialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        size="sm"
        title={outcome?.kind === 'lost' ? LOSS_TITLES[outcome.reason] : 'Victory!'}
        description={describe(game)}
        footer={
          <>
            <Button onClick={() => setResultOpen(false)}>Look at the board</Button>
            <Button variant="primary" data-autofocus onClick={restart}>Play again</Button>
          </>
        }
      >
        <dl class="kp-result">
          <div>
            <dt class="ds-label">Moves</dt>
            <dd class="ds-mono">
              {game.moves}
              {outcome?.kind === 'won' && newBest.moves && <Badge tone="success">Best</Badge>}
            </dd>
          </div>
          <div>
            <dt class="ds-label">Time</dt>
            <dd class="ds-mono">
              {formatTime(elapsed)}
              {outcome?.kind === 'won' && newBest.ms && <Badge tone="success">Best</Badge>}
            </dd>
          </div>
          <div>
            <dt class="ds-label">Visited</dt>
            <dd class="ds-mono">{visited}/{TARGETS.length}</dd>
          </div>
        </dl>
      </Dialog>
    </AppShell>
  );
}

function describe(game: Game): string {
  const o = game.outcome;
  if (!o) return '';
  if (o.kind === 'won') {
    return `Every safe square, in order. Par is ${PAR} moves.`;
  }
  if (o.reason === 'queen') return `Taking the queen on ${labelOf(QUEEN)} isn't part of the puzzle.`;
  return `The queen on ${labelOf(QUEEN)} attacks ${labelOf(o.square)}.`;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div class="kp-stat">
      <span class="ds-label">{label}</span>
      <span class="kp-stat__value ds-mono" data-accent={accent || undefined}>{value}</span>
    </div>
  );
}

function Header({ onRestart }: { onRestart: () => void }) {
  const { choice, setChoice } = useTheme();
  return (
    <>
      <span class="kp-brand" aria-hidden="true"><Knight /></span>
      <h1 class="kp-title">Knight puzzle</h1>
      <span class="ds-label kp-subtitle">Queen {labelOf(QUEEN)}</span>
      <span class="ds-spacer" />
      <Button size="sm" onClick={onRestart}>Restart</Button>
      <SegmentedControl
        size="sm"
        label="Theme"
        value={choice}
        onValueChange={(v) => setChoice(v as typeof choice)}
        options={[
          { value: 'light', label: null, leading: <Icon name="sun" />, 'aria-label': 'Light' },
          { value: 'dark', label: null, leading: <Icon name="moon" />, 'aria-label': 'Dark' },
          { value: 'system', label: 'Auto' },
        ]}
      />
    </>
  );
}
