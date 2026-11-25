export const directions = {
  across: { label: 'Vodoravno', symbol: '→', step: [0, 1] },
  down: { label: 'Uspravno', symbol: '↓', step: [1, 0] },
};

export function gridSlots(rows, singles = {}) {
  const open = (r, c) => (rows[r]?.[c] ?? '#') !== '#';
  const shortStarts = Object.fromEntries(Object.keys(directions).map(direction =>
    [direction, new Set(singles[direction] ?? [])],
  ));
  const slots = [];
  let number = 0;

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows.length; c++) {
      if (!open(r, c)) continue;
      const index = r * rows.length + c;
      const starts = Object.entries(directions).filter(([direction, { step: [dr, dc] }]) =>
        !open(r - dr, c - dc) && (open(r + dr, c + dc) || shortStarts[direction].has(index)),
      );
      if (!starts.length) continue;
      number++;
      for (const [direction, { step: [dr, dc] }] of starts) {
        const indices = [];
        for (let row = r, col = c; open(row, col); row += dr, col += dc) {
          indices.push(row * rows.length + col);
        }
        slots.push({ direction, number, indices });
      }
    }
  }
  return slots;
}
