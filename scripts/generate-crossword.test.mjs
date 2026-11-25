import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createPuzzle } from '../src/puzzle.js';
import series from '../src/series.js';
import { clueKey, fillTemplate, isFillInClue, prepareTemplate, reservePublished } from './generate-crossword.mjs';

const readJson = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const bank = readJson('./word-bank.json');
const templates = readJson('./templates.json');

for (const [index, edition] of series.entries()) {
  test(`generates, balances and numbers the installed ${index + 3}×${index + 3} puzzle`, () => {
    const size = index + 3;
    const puzzle = createPuzzle(edition);
    const template = prepareTemplate(templates[index]);
    assert.equal(puzzle.size, size);
    assert.equal(puzzle.level, index + 1);
    assert.equal(puzzle.cells.length, size ** 2);

    const releasedClues = Object.values(edition.clues).flatMap(entries =>
      Object.entries(entries).map(([answer, [category, clue]]) => {
        const entry = bank.find(word => word.answer === answer && word.clue === clue && word.category === category);
        assert(entry, `Missing bank entry for ${answer}`);
        return entry;
      }),
    );
    const candidates = fillTemplate(template, releasedClues, {
      limit: 16, minCategories: Math.min(size, 8), balance: true,
    });
    const matching = candidates.find(candidate => candidate.rows.join() === edition.rows.join());
    assert(matching, 'The released puzzle must be reproducible from its bank entries');
    assert.deepEqual(matching.clues, edition.clues);
    assert.equal(matching.lengths.at(-1), size);
    if (size >= 7) assert(matching.lengths.includes(1) || matching.lengths.includes(2));
    assert(matching.difficulty.easy && matching.difficulty.medium && matching.difficulty.hard);

    const answers = new Set();
    for (const { direction, number, indices } of template.slots) {
      const displayed = puzzle.cells[indices[0]].words[direction];
      const answer = indices.map(i => puzzle.cells[i].letter).join('');
      assert.equal(displayed.number, number);
      assert.deepEqual(displayed.cells, indices);
      assert.equal(displayed.clue, edition.clues[direction][answer][1]);
      assert(!answers.has(answer));
      answers.add(answer);
    }
    assert.equal(answers.size, releasedClues.length);
  });
}

test('only explicit singleton clues are numbered and isolated open areas are rejected', () => {
  const rows = ['...', '..#', '...'];
  assert(prepareTemplate(rows).slots.every(slot => slot.indices.length > 1));
  const { slots } = prepareTemplate({ rows, singles: { down: [8] } });
  assert(slots.some(slot => slot.direction === 'down' && String(slot.indices) === '8'));
  assert.throws(() => prepareTemplate({ rows, singles: { down: [0] } }), /jednog slova/);
  assert.throws(() => prepareTemplate(['.##', '###', '##.']), /nema nijednu reč/);
});

test('published levels have unique answers and clue text across the entire series', () => {
  const answers = new Set();
  const clues = new Set();
  for (const puzzle of series) {
    for (const words of Object.values(puzzle.clues)) {
      for (const [answer, [, clue]] of Object.entries(words)) {
        const key = clueKey(clue);
        assert(!answers.has(answer), `Repeated answer: ${answer}`);
        assert(!clues.has(key), `Repeated clue for ${answer}`);
        answers.add(answer);
        clues.add(key);
      }
    }
  }
});

test('publication history excludes an old answer with a new clue and vice versa', () => {
  const history = [{ answer: 'PRIMER', clue: 'Poznato pitanje?' }];
  const unseen = { answer: 'NACRT', clue: 'Drugačiji trag.' };
  assert.deepEqual(reservePublished([
    { answer: 'PRIMER', clue: 'Novi trag.' },
    { answer: 'DRUGI', clue: 'POZNATO — pitanje!' },
    unseen,
  ], history), [unseen]);
});

test('the live series does not reuse any archived answer or clue', () => {
  const history = readJson('./clue-history.json');
  const active = series.flatMap(puzzle => Object.values(puzzle.clues).flatMap(clues =>
    Object.entries(clues).map(([answer, [, clue]]) => ({ answer, clue })),
  ));
  assert.deepEqual(reservePublished(active, history), active);
});

test('published clues and bank entries stand on their own', () => {
  for (const { answer, clue } of bank) {
    assert(!isFillInClue(clue), `Fill-in clue for ${answer}`);
  }
  for (const puzzle of series) {
    for (const clues of Object.values(puzzle.clues)) {
      assert(Object.values(clues).every(([, clue]) => !isFillInClue(clue)));
    }
  }
  assert(isFillInClue('Dopunite naslov.'));
  assert(isFillInClue('Reč koja nedostaje u izreci.'));
  assert(isFillInClue('Predlog: „__ škole”.'));
  assert(!isFillInClue('Prezime pisca romana „Na Drini ćuprija”.'));
});

test('the output limit keeps the best discovered grid and excludes fill-in clues', () => {
  const template = prepareTemplate(['..#', '.##', '...']);
  const entries = [
    { answer: 'AB', clue: 'Prvi opis.', category: 'Jezik', score: 30 },
    { answer: 'AG', clue: 'Drugi opis.', category: 'Hemija' },
    { answer: 'AX', clue: 'Dopuni naslov.', category: 'Istorija', score: 40 },
    { answer: 'ACD', clue: 'Treći opis.', category: 'Muzika' },
    { answer: 'DEF', clue: 'Četvrti opis.', category: 'Jezik' },
  ];
  const [result] = fillTemplate(template, entries, { limit: 1 });
  assert.deepEqual(result.rows, ['AG#', 'C##', 'DEF']);
  assert.equal(result.quality.categoryCoverage, 1);
});
