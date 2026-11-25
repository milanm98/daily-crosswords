Original prompt: Reference: https://www.resirec.rs/, https://www.zaigraj.me/krizaljka/dan, https://sr.crosswords-cat.org/play_game.php?lang=sr&game=2&p2=186&id=1201714

Ovo su 3 reference samo da imas u vidu sta planiramo. Dakle, zelim browser aplikaciju pravljenu samo za desktop, dakle kad se ucita ispod 1000px, treba prikazati da aplikacija radi samo za desktop;

Sto se tice aplikacije same, nema logovanja ili slicnog. Igrac vidi ekran i moze da zapocne igru na dugme start.

Nakon toga, idemo po levelima.
Prvi level:
Ukrstenica 3x3.
3 reda, 3 kolone, dakle 9 kvadratica.

Naravno, pre nego sto serviramo korisniku sta je ukrstenica za danas, moramo pripremiti pitanja i odgovore.
To ces raditi ti. Osmisli iz razlicitih sfera pitanja za ukrstene reci i napravi recimo 3x3 ukrstenicu kao prvi level.

Ideja je da nakon sto resimo kako treba, idemo na 4x4. Zatim 5x5 i tako sve do 8x8.

Koliko bi bilo zahtevno da napravis ovu aplikaciju. Iskljucivo je za pocetak frontend posao, nema potrebe za bazama i apijem.

Iskoristi neki framework koji najbolje lezi ovakvoj situaciji i postavi projekat. Zatim ubaci izmene u kodu vezane za ovo sto sam ispricao koristeci dosta reference. Naravno, gledaj da budes inovativan i da imamo jako dobar UI/UX.

Kad zavrsis, posalji mi url od lokalne verzije da testiram

- Postavljen React i Vite, dodata originalna ukrštenica sa šest tragova i početni ekran.
- Dodati unos sa tastature, izbor smera, provera slova, pomoć, ponovno pokretanje i lokalno čuvanje progresa.
- Proveren produkcijski build i tok igre od početnog ekrana do rešenja u Chromiumu. Provereni su pogrešan unos, pomoć, povratak na igru posle osvežavanja, reset i prelaz između 999 i 1000 piksela. Pregledani su snimci početnog ekrana, mreže, rešenja i poruke za uske prozore.
- Sledeći nivo je autorska mreža 4 × 4, nakon provere prvog izdanja.

- Uklonjeni su desni panel, footer, provera unosa i otkrivanje slova. Mreža i aktivni trag su u sredini.
- Dodate su autorske mreže 4 × 4 i 5 × 5 sa osam i deset tragova. Svaka ima po jedan trag iz sporta i geografije. Mreža 5 × 5 ima dva crna polja.
- U Chromiumu su provereni redosled otključavanja, unos, ponovni ulazak posle osvežavanja, zadržavanje već otključanih nivoa pri resetovanju i učitavanje napretka iz prethodne verzije. Produkcijski build prolazi.
- Uklonjeni su dugme „Kako se igra”, dijalog s uputstvom, brojač popunjenih polja i traka napretka. Potvrđeni su prikaz, reset i prelazak kroz sva tri nivoa u Chromiumu.
- Dodat je lokalni Node generator sa dva šablona 8 × 8 i zbirkom od 60 odgovora sa tragovima i oblastima. Provereni su ponovljiv izlaz, filtriranje po obaveznim oblastima, ukrštanja i jedinstvenost odgovora.
- Dodata je 8 × 8 sa 44 polja za unos, 20 crnih polja i 26 tragova. Otključava se posle 5 × 5, dok su 6 × 6 i 7 × 7 u pripremi. Nezavisni QA je iz tragova rešio svih 44 polja u Chromiumu i potvrdio ukrštanja, prelazak i završetak.
- Generator sada koristi istu numeraciju i geometriju kao igra. Podržava reči od 1 i 2 slova, broji oblasti i težine, i traži bar jedno lako ukrštanje za svaki težak trag.
- Stara serija je zamenjena sa osam generisanih nivoa, 3 × 3 do 10 × 10. Novi identifikatori pokreću novu seriju od prvog nivoa. Na 8 × 8 najduža rešenja imaju osam slova, a 9 × 9 i 10 × 10 imaju rešenja od devet i deset.
- Svaki nivo je rešio zaseban subagent u Chromiumu na osnovu prikazanih tragova. Na 9 × 9 pojašnjena su tri traga i ponovna provera je prošla. Dodatni prolazak kroz celu seriju u jednom browseru potvrdio je redosled otključavanja i čuvanje novog napretka.
- Odvojeni su redovi za broj i slovo u polju. Dodata je eksplicitna predaja sa dvosekundnim crvenim ili zelenim stanjem i automatskim prelaskom na sledeći nivo. Nova predaja se čuva odvojeno od unetih slova.
- U osam nivoa su 124 jedinstvena rešenja i jedinstveni tragovi. Generator koristi arhivu i aktuelnu seriju kao zabranu ponavljanja, a od 6 × 6 traži više srednje teških tragova. Prvih četiri nivoa zadržavaju identifikatore, a mreže od 7 × 7 do 10 × 10 imaju nove.
- Četiri nezavisna QA subagenta odigrala su izmenjene nivoe 7 × 7 do 10 × 10, ispravke tragova su ponovo potvrđene, a integracioni prolazak svih osam nivoa proverio je novo ponašanje i čuvanje unosa.
- Pored mreže su dodata klikabilna Č, Ć, Đ, Š i Ž, sa istim izborom sledećeg polja kao pri unosu sa tastature.
- Svih 19 aktivnih tragova s dopunjavanjem zamenjeno je samostalnim opisima. Isti obrasci uklonjeni su iz zbirke i odbacuju se pri generisanju. Pretraga rangira kandidate do granice od 150.000 čvorova i vraća najbolje otkrivene mreže.
- Objavljena je nova serija od 3 × 3 do 10 × 10 sa 123 jedinstvena traga i odgovora. Arhiva od 200 ranijih odgovora služi za proveru ponavljanja, a najduži odgovor u svakom nivou odgovara širini mreže.
- Osam zasebnih subagenata rešilo je redom dodeljene nivoe iz prikazanih tragova u Chromiumu. Dva traga u 8 × 8 su pojašnjena i ta mreža je ponovo odigrana. Integraciona provera u jednoj sesiji potvrdila je svih osam prelaza do završnog ekrana, odvojeni napredak nove serije i čuvanje tog napretka pri osvežavanju.
- Igra sada otvara jednu postojeću ukrštenicu preko dugmeta Start. Prikaz nivoa i dimenzija je uklonjen, a zbirka i generator su zadržani.
- Dodat je tajmer od pet minuta. Zatamnjenje polja ide od ivica ka centru u poslednjih 100 sekundi. Rešavanje može da se nastavi posle isteka, a rezultat prikazuje ukupno vreme.
- Chromium je potvrdio postepeno zatamnjenje, stabilan raspored pri 00:00, obnavljanje pokušaja posle osvežavanja, označavanje pogrešnih slova, završetak u roku i posle isteka, reset i ograničenje širine prozora.
- Zatamnjenje sada kreće zajedno s tajmerom. Chromium potvrđuje da ivice počinju da tamne u prvoj sekundi, zatim polja prema sredini, a efekat se pojačava do isteka vremena.
- Uklonjeni su početni ekran, Start, tajmer i zatamnjenje. Ukrštenica se odmah prikazuje, uz postojeći unos, Predaj i Ispočetka. Provera u Chromiumu potvrdila je direktan ulazak, očuvanje unosa iz verzije sa tajmerom, predaju, reset i granicu širine prozora.
- Kartica aktivnog traga rezerviše prostor za dva reda teksta. U Chromiumu su položaj i veličina mreže ostali isti pri izboru svih 28 tragova.
