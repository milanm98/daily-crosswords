import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gridSlots } from '../src/grid.js';
import released from '../src/series.js';

export const clueKey = clue => clue.normalize('NFKC').toLocaleLowerCase('sr-Latn')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export const isFillInClue = clue =>
  /_|…|\.{3}|\b(?:dopuni(?:te)?|popuni(?:te)?|ubaci(?:te)?|umetni(?:te)?)\b|\bnedostaj\p{L}*\b[^.!?]*\b(?:rečenic|izraz|izre[ck]|poslovic|naslov)\p{L}*/iu.test(clue);

function compareQuality(a, b) {
  return b.quality.crossingCoverage - a.quality.crossingCoverage
    || b.quality.categoryCoverage - a.quality.categoryCoverage
    || b.quality.easySupport - a.quality.easySupport
    || b.quality.wordScore - a.quality.wordScore;
}

export function reservePublished(entries, history) {
  const answers = new Set(history.map(({ answer }) => answer));
  const clues = new Set(history.map(({ clue }) => clueKey(clue)));
  return entries.filter(entry => !answers.has(entry.answer) && !clues.has(clueKey(entry.clue)));
}

export function prepareTemplate(input) {
  const { rows, singles = {} } = Array.isArray(input) ? { rows: input } : input;
  const size = rows.length;
  if (!size || rows.some(row => typeof row !== 'string' || row.length !== size || /[^.#]/.test(row))) {
    throw new Error('Šablon mora biti kvadratan i sme da sadrži samo . i #.');
  }

  const slots = gridSlots(rows, singles).sort((a, b) => a.direction.localeCompare(b.direction))
    .map((slot, id) => ({ ...slot, id, crossings: [] }));
  for (const [direction, indices] of Object.entries(singles)) {
    if (!Array.isArray(indices) || new Set(indices).size !== indices.length ||
      indices.some(index => !slots.some(slot =>
        slot.direction === direction && slot.indices.length === 1 && slot.indices[0] === index))) {
      throw new Error('Oznaka za odgovor od jednog slova mora biti samostalno polje u izabranom smeru.');
    }
  }

  const cells = rows.join('');
  const memberships = Array.from({ length: cells.length }, () => []);
  for (const { id, indices } of slots) {
    indices.forEach((cell, position) => memberships[cell].push({ id, position }));
  }

  if (!slots.length) throw new Error('Šablon nema nijednu reč.');
  for (const [index, [first, second]] of memberships.entries()) {
    if (cells[index] === '.' && !first) throw new Error('Svako otvoreno polje mora pripadati odgovoru.');
    if (!second) continue;
    slots[first.id].crossings.push({ other: second.id, here: first.position, there: second.position });
    slots[second.id].crossings.push({ other: first.id, here: second.position, there: first.position });
  }
  const connected = new Set([0]);
  for (const id of connected) {
    for (const { other } of slots[id].crossings) connected.add(other);
  }
  if (connected.size !== slots.length) throw new Error('Svi delovi šablona moraju biti povezani.');
  return { rows, singles, slots };
}

export function fillTemplate(template, entries, {
  limit = 3, maxNodes = 15_000, minCategories = 0, requiredCategories = [], balance = false,
} = {}) {
  const { slots, rows, singles } = template;
  const lengths = [...new Set(slots.map(slot => slot.indices.length))].sort((a, b) => a - b);
  const size = rows.length;
  if (balance && (lengths.length < (size <= 4 ? 2 : 3) || lengths[0] > Math.min(3, size - 1) ||
    lengths.at(-1) < (size >= 8 ? size : size - 1))) return [];
  const byLength = new Map();
  const ranked = entries.filter(entry => !entry.clue || !isFillInClue(entry.clue))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  for (const entry of ranked) {
    if (!byLength.has(entry.answer.length)) byLength.set(entry.answer.length, []);
    byLength.get(entry.answer.length).push(entry);
  }

  const assigned = Array(slots.length);
  const used = new Set();
  const usedClues = new Set();
  const normalizedClues = new Map(ranked.map(entry => [entry, entry.clue ? clueKey(entry.clue) : '']));
  const categories = new Map();
  const difficulty = { easy: 0, medium: 0, hard: 0 };
  const minEasy = Math.ceil(slots.length / 3);
  const maxEasy = Math.floor(slots.length * (size >= 6 ? 0.6 : 0.7));
  const minMedium = size >= 6 ? Math.ceil(slots.length / 4) : 1;
  const minHard = Math.max(1, Math.floor(slots.length / 10));
  const maxHard = Math.max(1, Math.floor(slots.length / 3));
  const categoryTarget = balance ? Math.max(minCategories, Math.ceil(slots.length / 2)) : minCategories;
  const categoryLimit = Math.max(2, Math.floor(slots.length / 4));
  const results = [];
  const checkedCells = slots.reduce((sum, slot) => sum + slot.crossings.length, 0) / 2;
  const openCells = rows.join('').replaceAll('#', '').length;
  let nodes = 0;

  function propagate(domains, changed) {
    const queue = new Set(changed);
    for (const source of queue) {
      queue.delete(source);
      for (const { other, here, there } of slots[source].crossings) {
        const letters = new Set(domains[source].map(entry => entry.answer[here]));
        const previous = domains[other];
        const filtered = previous.filter(entry => letters.has(entry.answer[there]));
        if (!filtered.length) return false;
        if (filtered.length < previous.length) {
          domains[other] = filtered;
          queue.add(other);
        }
      }
    }
    return true;
  }

  function search(domains) {
    if (++nodes > maxNodes) return;
    const remaining = slots.filter(slot => !assigned[slot.id]);
    if (categories.size + remaining.length < categoryTarget || (balance &&
      (difficulty.easy + remaining.length < minEasy || difficulty.hard + remaining.length < minHard ||
        difficulty.medium + remaining.length < minMedium))) return;
    if (!remaining.length) {
      if (requiredCategories.some(category => !categories.has(category))) return;
      const hardWords = slots.filter(({ id }) => assigned[id].difficulty === 'hard');
      const easyCrossings = hardWords.map(({ crossings }) =>
        crossings.filter(({ other }) => assigned[other].difficulty === 'easy').length,
      );
      if (balance && easyCrossings.includes(0)) return;
      const score = assigned.reduce((sum, entry) => sum + (entry.score ?? 0), 0);
      const variant = {
        key: assigned.map(entry => entry.answer).join('|'),
        entries: assigned.slice(),
        score,
        categories: categories.size,
        difficulty: { ...difficulty },
        quality: {
          crossingCoverage: checkedCells / openCells,
          categoryCoverage: categories.size / slots.length,
          easySupport: hardWords.length ? easyCrossings.reduce((sum, count) => sum + count, 0)
            / hardWords.reduce((sum, slot) => sum + slot.indices.length, 0) : 0,
          wordScore: score / slots.length,
        },
      };
      const duplicate = results.findIndex(candidate => candidate.key === variant.key);
      if (duplicate >= 0) {
        if (compareQuality(variant, results[duplicate]) >= 0) return;
        results.splice(duplicate, 1);
      }
      results.push(variant);
      results.sort(compareQuality);
      if (results.length > limit) results.pop();
      return;
    }

    remaining.sort((a, b) => domains[a.id].length - domains[b.id].length
      || b.crossings.length - a.crossings.length);
    const { id } = remaining[0];
    for (const entry of domains[id]) {
      if (nodes >= maxNodes) break;
      const tier = entry.difficulty ?? 'medium';
      const textKey = normalizedClues.get(entry);
      if (used.has(entry.answer) || (textKey && usedClues.has(textKey)) || (balance && (
        (tier === 'easy' && difficulty.easy >= maxEasy) ||
        (tier === 'hard' && difficulty.hard >= maxHard) ||
        (categories.get(entry.category) ?? 0) >= categoryLimit
      ))) continue;
      const next = domains.slice();
      const changed = [id];
      next[id] = [entry];
      let viable = true;
      for (const { id: other } of remaining.slice(1)) {
        const candidates = next[other].filter(candidate => candidate.answer !== entry.answer);
        if (!candidates.length) {
          viable = false;
          break;
        }
        if (candidates.length < next[other].length) {
          next[other] = candidates;
          changed.push(other);
        }
      }
      if (!viable || !propagate(next, changed)) continue;
      assigned[id] = entry;
      used.add(entry.answer);
      if (textKey) usedClues.add(textKey);
      if (entry.category) categories.set(entry.category, (categories.get(entry.category) ?? 0) + 1);
      difficulty[tier]++;
      search(next);
      difficulty[tier]--;
      const count = categories.get(entry.category);
      if (count > 1) categories.set(entry.category, count - 1);
      else categories.delete(entry.category);
      used.delete(entry.answer);
      if (textKey) usedClues.delete(textKey);
      assigned[id] = undefined;
    }
  }

  const domains = slots.map(slot => byLength.get(slot.indices.length) ?? []);
  if (domains.every(domain => domain.length) && propagate(domains, slots.map(slot => slot.id))) search(domains);
  return results.map(result => {
    const grid = [...rows.join('')];
    const clues = { across: {}, down: {} };
    slots.forEach((slot, i) => {
      const { answer, category, clue } = result.entries[i];
      slot.indices.forEach((index, position) => { grid[index] = answer[position]; });
      clues[slot.direction][answer] = [category, clue];
    });
    return {
      rows: rows.map((row, i) => grid.slice(i * row.length, (i + 1) * row.length).join('')),
      singles,
      clues,
      lengths,
      difficulty: result.difficulty,
      categories: result.categories,
      score: result.score,
      quality: result.quality,
    };
  });
}

function main() {
  const { values } = parseArgs({
    options: {
      size: { type: 'string', default: '8' },
      limit: { type: 'string', default: '3' },
      'min-categories': { type: 'string' },
      'max-nodes': { type: 'string', default: '150000' },
      'require-category': { type: 'string', multiple: true, default: [] },
      bank: { type: 'string' },
      templates: { type: 'string' },
      'allow-published': { type: 'boolean', default: false },
    },
  });
  const size = Number(values.size);
  const limit = Number(values.limit);
  const minCategories = Number(values['min-categories'] ?? Math.min(size, 8));
  const maxNodes = Number(values['max-nodes']);
  if (![size, limit, minCategories].every(Number.isInteger) || size < 3 || limit < 1 || minCategories < 1) {
    throw new Error('Unesi celu veličinu mreže, broj kandidata i minimalan broj oblasti.');
  }
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1) throw new Error('Granica pretrage mora biti pozitivan ceo broj.');

  const readJson = (path, fallback) => JSON.parse(readFileSync(path ?? new URL(fallback, import.meta.url), 'utf8'));
  const entries = readJson(values.bank, './word-bank.json');
  const templates = readJson(values.templates, './templates.json').filter(template => (template.rows ?? template).length === size);
  const clueKeys = new Set();
  for (const { answer, clue, category, score, difficulty } of entries) {
    const key = JSON.stringify([answer, typeof clue === 'string' ? clueKey(clue) : clue]);
    if (typeof answer !== 'string' || !/^[A-ZČĆĐŠŽ]+$/.test(answer) ||
      typeof clue !== 'string' || !clue.trim() || typeof category !== 'string' || !category.trim() ||
      !['easy', 'medium', 'hard'].includes(difficulty) || (score !== undefined && !Number.isFinite(score)) || clueKeys.has(key)) {
      throw new Error(`Neispravan ili ponovljen unos u zbirci: ${answer}`);
    }
    if (isFillInClue(clue)) throw new Error(`Trag za ${answer} mora biti samostalan opis bez dopunjavanja.`);
    clueKeys.add(key);
  }

  const history = readJson(undefined, './clue-history.json');
  const currentClues = released.flatMap(puzzle => Object.values(puzzle.clues).flatMap(entries =>
    Object.entries(entries).map(([answer, [, clue]]) => ({ answer, clue })),
  ));
  const eligible = values['allow-published'] ? entries : reservePublished(entries, [...history, ...currentClues]);
  const requiredCategories = values['require-category'];
  const results = templates.flatMap(rows => fillTemplate(prepareTemplate(rows), eligible, {
    limit, maxNodes, minCategories, requiredCategories, balance: true,
  }));
  results.sort(compareQuality);
  const unique = new Map();
  for (const result of results) {
    const key = JSON.stringify([result.rows, result.singles]);
    if (!unique.has(key)) unique.set(key, result);
  }
  if (!results.length) throw new Error(`Nema kandidata za mrežu ${size} × ${size}. Proširi zbirku ili probaj drugi šablon.`);
  console.log(JSON.stringify([...unique.values()].slice(0, limit), null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
