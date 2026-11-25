import { gridSlots } from './grid.js';
export { directions } from './grid.js';
import series from './series.js';

export function createPuzzle({ id, level, rows, clues, singles }) {
  const size = rows.length;
  const cells = rows.flatMap((row, r) =>
    [...row].map((letter, c) => ({ r, c, letter, blocked: letter === '#', words: {} })),
  );
  const words = { across: [], down: [] };
  for (const { direction, number, indices } of gridSlots(rows, singles)) {
    cells[indices[0]].number = number;
    const answer = indices.map(index => cells[index].letter).join('');
    const entry = clues[direction][answer];
    if (!entry) throw new Error(`Puzzle ${id}: missing clue for ${direction} ${number} (${answer})`);

    const [category, clue] = entry;
    const word = { direction, number, category, clue, cells: indices };
    for (const index of indices) cells[index].words[direction] = word;
    words[direction].push(word);
  }

  if (cells.some(cell => !cell.blocked && !Object.keys(cell.words).length)) {
    throw new Error(`Puzzle ${id}: open cell without a clue`);
  }
  return { id, level, size, cells, words, openCount: cells.filter(cell => !cell.blocked).length };
}

export const puzzles = series.map(createPuzzle);
