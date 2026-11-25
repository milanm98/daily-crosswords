import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { directions, puzzles } from './puzzle';
import './styles.css';

const puzzle = puzzles.findLast(entry => entry.size === 10);
const storageKey = `presek-crossword-${puzzle.id}`;
const emptyLetters = puzzle => puzzle.cells.map(() => '');
const alphabet = /^[A-ZČĆĐŠŽ]$/u;
const specialLetters = ['Č', 'Ć', 'Đ', 'Š', 'Ž'];
const isSolved = (puzzle, letters) => puzzle.cells.every((cell, i) => cell.blocked || cell.letter === letters[i]);

function readGame() {
  try {
    const current = localStorage.getItem(storageKey);
    const saved = JSON.parse(current ?? localStorage.getItem(`presek-timed-${puzzle.id}`));
    if (Array.isArray(saved?.letters) && saved.letters.length === puzzle.cells.length &&
      saved.letters.every(letter => typeof letter === 'string' && (!letter || alphabet.test(letter)))) {
      const submitted = current === null ? Number.isFinite(saved.finishedAt) : saved.solved === true;
      return { letters: saved.letters, solved: submitted && isSolved(puzzle, saved.letters) };
    }
  } catch {
    // The game also works when browser storage is unavailable.
  }
  return { letters: emptyLetters(puzzle), solved: false };
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon" aria-hidden="true"><i /><i /><i /><i /></span>
      <span>presek<span className="brand-period">.</span></span>
    </div>
  );
}

function Game({ game, saveLetters, resetDialog, narrow }) {
  const { letters, solved } = game;
  const firstCell = puzzle.cells.findIndex(cell => !cell.blocked);
  const [selected, setSelected] = useState(() => {
    const firstEmpty = puzzle.cells.findIndex((cell, i) => !cell.blocked && !letters[i]);
    return firstEmpty === -1 ? firstCell : firstEmpty;
  });
  const [direction, setDirection] = useState(() => puzzle.cells[selected].words.across ? 'across' : 'down');
  const [feedback, setFeedback] = useState(null);
  const buttons = useRef([]);
  const completion = useRef(null);
  const timer = useRef(null);
  const checking = feedback?.kind === 'wrong' || feedback?.kind === 'success';
  const filled = puzzle.cells.filter((cell, i) => !cell.blocked && letters[i]).length;
  const active = puzzle.cells[selected].words[direction];
  const allWords = [...puzzle.words.across, ...puzzle.words.down];

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (narrow) return;
    if (solved) completion.current?.focus();
    else buttons.current[selected]?.focus();
  }, [narrow, solved]);

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify({
      mode: narrow ? 'desktop-only' : solved ? 'solved' : 'playing',
      grid: letters.map((letter, i) => puzzle.cells[i].blocked ? '#' : letter),
      selected,
      direction,
      filled,
      feedback: feedback?.kind ?? null,
      incorrect: feedback?.kind === 'wrong' ? [...feedback.cells] : [],
      clue: solved ? null : { number: active.number, category: active.category, text: active.clue },
    });
  });

  function select(index, preferredDirection) {
    const { words } = puzzle.cells[index];
    const nextDirection = words[preferredDirection] ? preferredDirection : Object.keys(words)[0];
    setSelected(index);
    setDirection(nextDirection);
    buttons.current[index]?.focus();
  }

  function writeAt(index, letter) {
    const next = letters.slice();
    next[index] = letter;
    setFeedback(null);
    saveLetters(next);
    return next;
  }

  function advance(index, currentLetters) {
    const remaining = active.cells.slice(active.cells.indexOf(index) + 1);
    const next = remaining.find(cell => !currentLetters[cell]);
    if (next !== undefined) {
      select(next, direction);
      return;
    }

    const currentWord = allWords.indexOf(active);
    const ordered = [...allWords.slice(currentWord + 1), ...allWords.slice(0, currentWord + 1)];
    const incomplete = ordered.find(word => word.cells.some(cell => !currentLetters[cell]));
    if (incomplete) select(incomplete.cells.find(cell => !currentLetters[cell]), incomplete.direction);
    else if (remaining.length) select(remaining[0], direction);
  }

  function typeLetter(index, letter) {
    const next = writeAt(index, letter);
    buttons.current[index]?.focus();
    if (next.some((letter, i) => !letter && !puzzle.cells[i].blocked)) advance(index, next);
  }

  function handleKeys(event, index) {
    if (solved || checking || event.altKey || event.ctrlKey || event.metaKey) return;
    const { key } = event;
    const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    if (moves[key]) {
      event.preventDefault();
      const [dr, dc] = moves[key];
      const current = puzzle.cells[index];
      const row = current.r + dr;
      const column = current.c + dc;
      const next = row * puzzle.size + column;
      const preferred = dr ? 'down' : 'across';
      if (row >= 0 && row < puzzle.size && column >= 0 && column < puzzle.size &&
        !puzzle.cells[next].blocked) select(next, preferred);
      else select(index, preferred);
      return;
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      select(index, direction === 'across' ? 'down' : 'across');
      return;
    }

    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      const before = active.cells[active.cells.indexOf(index) - 1];
      if (key === 'Backspace' && !letters[index] && before !== undefined) {
        writeAt(before, '');
        select(before, direction);
      } else {
        writeAt(index, '');
      }
      return;
    }

    const letter = key.toLocaleUpperCase('sr-Latn');
    if (alphabet.test(letter)) {
      event.preventDefault();
      typeLetter(index, letter);
    }
  }

  function reset() {
    setFeedback(null);
    saveLetters(emptyLetters(puzzle));
    select(firstCell, 'across');
  }

  function submit() {
    if (solved || timer.current !== null) return;
    if (filled < puzzle.openCount) {
      setFeedback({ kind: 'incomplete' });
      return;
    }

    const wrong = puzzle.cells.flatMap((cell, i) =>
      !cell.blocked && letters[i] !== cell.letter ? [i] : [],
    );
    setFeedback(wrong.length ? { kind: 'wrong', cells: new Set(wrong) } : { kind: 'success' });
    timer.current = setTimeout(() => {
      timer.current = null;
      setFeedback(null);
      if (wrong.length) buttons.current[selected]?.focus();
    }, 2000);
    if (!wrong.length) saveLetters(letters, true);
  }

  return (
    <main className="game">
      <div className="game-heading">
        <h1>Ukrštenica<span>.</span></h1>
      </div>
      <section className="board-panel" aria-label="Mreža ukrštenice">
        {solved ? (
          <div className="active-clue victory" role="status" ref={completion} tabIndex={-1}>
            <span className="active-number" aria-hidden="true">✓</span>
            <p>Ukrštenica je rešena!</p>
          </div>
        ) : (
          <div className="active-clue" aria-live="polite">
            <span className="active-number" aria-hidden="true">{active.number}{directions[direction].symbol}</span>
            <div>
              <span className="eyebrow">{directions[direction].label} <span>·</span> {active.category}</span>
              <p id="active-clue">{active.clue}</p>
            </div>
          </div>
        )}
        <div className="board-area">
          <div className={`board ${solved ? 'board-solved' : ''}`} style={{ '--size': puzzle.size }}>
            {puzzle.cells.map((cell, i) => cell.blocked ? <span key={i} className="cell blocked" aria-hidden="true" /> : (
              <button
                key={i}
                ref={element => { buttons.current[i] = element; }}
                className={`cell ${!solved && active.cells.includes(i) ? 'word' : ''} ${i === selected && !solved ? 'selected' : ''} ${feedback?.cells?.has(i) ? 'cell-incorrect' : ''}`}
                tabIndex={i === selected && !solved ? 0 : -1}
                disabled={solved}
                aria-label={`Red ${cell.r + 1}, kolona ${cell.c + 1}: ${letters[i] || 'prazno'}${feedback?.cells?.has(i) ? ', pogrešno slovo' : ''}`}
                aria-describedby={!solved && i === selected ? 'active-clue' : undefined}
                onClick={() => {
                  if (!checking) select(i, i === selected ? (direction === 'across' ? 'down' : 'across') : direction);
                }}
                onKeyDown={event => handleKeys(event, i)}
              >
                {cell.number && <span className="cell-number" aria-hidden="true">{cell.number}</span>}
                <span className="cell-letter" aria-hidden="true">{letters[i]}</span>
              </button>
            ))}
          </div>
          {!solved && (
            <div className="letter-keys" role="group" aria-label="Posebna slova">
              {specialLetters.map(letter => (
                <button key={letter} type="button" className="letter-key" disabled={checking}
                  onClick={() => typeLetter(selected, letter)}>
                  {letter}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="board-actions">
          {!solved && <button className="button primary compact" disabled={checking} onClick={submit}>Predaj</button>}
          <button className="button text-button compact" disabled={!filled || checking} onClick={() => resetDialog(reset)}>Ispočetka</button>
        </div>
        {feedback?.kind === 'wrong' && <p className="feedback" role="status">Označena slova treba ispraviti.</p>}
        {feedback?.kind === 'incomplete' && <p className="feedback" role="status">Popuni sva otvorena polja pre predaje.</p>}
      </section>
    </main>
  );
}

function App() {
  const [game, setGame] = useState(readGame);
  const [resetAction, setResetAction] = useState(null);
  const desktop = useRef(window.matchMedia('(width >= 1000px)'));
  const [narrow, setNarrow] = useState(!desktop.current.matches);
  const dialogRef = useRef(null);
  const cancelButton = useRef(null);
  useEffect(() => {
    const query = desktop.current;
    const handleWidth = event => setNarrow(!event.matches);
    query.addEventListener('change', handleWidth);
    return () => query.removeEventListener('change', handleWidth);
  }, []);

  useEffect(() => {
    if (resetAction && !narrow && !dialogRef.current.open) {
      dialogRef.current.showModal();
      cancelButton.current?.focus();
    }
    if ((!resetAction || narrow) && dialogRef.current.open) dialogRef.current.close();
  }, [resetAction, narrow]);

  function saveLetters(letters, solved = false) {
    const next = { letters, solved };
    setGame(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Storage can be disabled by browser settings.
    }
  }

  return (
    <>
      <div className="desktop">
        <header className="topbar">
          <div className="shell topbar-inner">
            <Brand />
          </div>
        </header>
        <div className="shell">
          <Game game={game} saveLetters={saveLetters} narrow={narrow}
            resetDialog={onConfirm => setResetAction(() => onConfirm)} />
        </div>
      </div>
      <main className="mobile-gate">
        <Brand />
        <h1>Prebaci se na računar.</h1>
        <p>Presek radi samo na desktopu, u prozoru širokom najmanje 1000 piksela.</p>
      </main>
      <dialog ref={dialogRef} aria-labelledby="dialog-title" onClose={() => setResetAction(null)}>
        <h2 id="dialog-title">Kreni ispočetka?</h2>
        <p>Ovo će obrisati sva slova iz mreže.</p>
        <div className="dialog-actions">
          <button ref={cancelButton} className="button secondary"
            onClick={() => dialogRef.current.close()}>Odustani</button>
          <button className="button primary" onClick={() => {
            dialogRef.current.close();
            resetAction?.();
          }}>Kreni ispočetka</button>
        </div>
      </dialog>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
