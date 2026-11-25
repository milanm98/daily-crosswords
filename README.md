# Presek · dnevna ukrštenica

Desktop igra na srpskom, napravljena u Reactu i Viteu. Ukrštenica je dostupna čim se otvori stranica. Upisana slova čuvaju se u pregledaču.

Dugme **Predaj** obeležava pogrešna polja na dve sekunde. Posle tačne predaje mreža pozeleni.

Č, Ć, Đ, Š i Ž možeš uneti i klikom na odgovarajuće dugme pored mreže.

## Pokretanje

Potreban je Node.js 20.19+ ili 22.12+.

```sh
npm install
npm run dev
```

Otvori http://127.0.0.1:5173/ u prozoru koji je širok barem 1000 CSS piksela. Za statički build koristi `npm run build`.

## Dodavanje ukrštenice

Igra koristi poslednju mrežu širine deset polja iz `src/series.js`. U odgovarajućem smeru rešenje je ključ uz koji stoje kategorija i trag. Generator i igra koriste ista pravila iz `src/grid.js` da odrede početna polja i brojeve tragova. Svaka nova mreža dobija jedinstven `id`, koji pregledač koristi za čuvanje napretka.

## Generisanje kandidata

```sh
npm run --silent generate:crossword -- --size 8 --limit 3 --min-categories 12
```

Komanda ispisuje JSON sa mrežama, tragovima, dužinama odgovora i raspodelom težine. Generator izostavlja rešenja i tragove iz aktuelne serije i arhive `scripts/clue-history.json`. Dopuni zbirku novim parovima pre generisanja. Za lokalnu reprodukciju postojeće mreže koristi `--allow-published`.

Od 6 × 6 generator traži najmanje četvrtinu srednje teških tragova i najviše 60% lakih. Svaki težak odgovor dobija bar jedno lako ukrštanje. Od 8 × 8 naviše mreža ima i odgovor koji zauzima celu širinu ili visinu. Kandidati se rangiraju po udelu ukrštenih polja, raznovrsnosti oblasti, vezama težih i lakših odgovora i oceni reči.

`--limit` određuje broj prikazanih kandidata. Pretraga nastavlja da razmatra konkurenciju do zadate granice `--max-nodes` (podrazumevano 150.000 po šablonu).

- `scripts/word-bank.json` sadrži rešenje velikim slovima, kategoriju, trag, težinu `easy`, `medium` ili `hard` i opcionalnu brojčanu ocenu `score`. Trag napiši kao samostalnu definiciju, sinonim, opis, ime ili oznaku. Generator odbacuje uobičajene obrasce dopunjavanja rečenica. Isti odgovor može imati više različitih tragova. Svaki znak zauzima jedno polje.
- `scripts/templates.json` sadrži kvadratne šablone. Tačka je otvoreno polje, a `#` crno polje. Uz niz redova možeš navesti i objekat oblika `{ rows, singles }`. U `singles.across` ili `singles.down` označi početno polje za jednoslovni trag indeksom redom od gornjeg levog polja, počevši od nule. Za drugi ulaz koristi `--bank` ili `--templates`.
- Izabranom kandidatu dodeli `id` i `level`, pa ga dodaj u `src/series.js`. Funkcionalne testove generatora i povezivanja tragova pokreni sa `npm test`. Pravila nezavisnog testiranja u pregledaču su u `AGENTS.md`.
