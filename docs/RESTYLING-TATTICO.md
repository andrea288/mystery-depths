# Restyling Pokédex tattico

Il restyling segue la seconda proposta visiva scelta: scocca rossa, interno
avorio, schermo incassato blu scuro, selezioni azzurre e comandi da console.
È applicato al gioco reale, non soltanto a una schermata dimostrativa.

## Interfaccia

- Campo base, selezione dello starter, equipaggiamento iniziale e regioni
  hanno lo stesso linguaggio grafico della spedizione.
- Squadra laterale su desktop, ritratti e PS in alto su telefono. Lo starter
  resta contrassegnato dalla stella. Il menu Squadra gestisce anche le riserve.
- Mappa al centro; mosse e PP immediatamente sotto, con accenti per tipo.
- **Muovi** esce dalla modalità Orienta e seleziona il movimento nei boss.
  **Orienta** continua a ruotare gratuitamente. Restano disponibili tastiera,
  clic destro e comandi diagonali.
- **Zaino** o **B** apre un pannello sovrapposto. **Esc** o il pulsante di
  chiusura lo chiudono. I tasti di movimento non attraversano il pannello.
  Durante le animazioni il pannello mette in pausa la riproduzione.
- Il diario occupa una sola riga; **Diario** o **L** apre lo storico completo.
- Boss: griglia, caselle raggiungibili azzurre per il Pokémon selezionato,
  zone di pericolo, frecce degli ordini e conferma dell’intera squadra.
- Zaino, ricompense, evoluzioni, mercanti, scoperte, impostazioni e salvataggi
  usano pannelli avorio con cornice rossa e indicazione del focus da tastiera.

## Mappa

`src/world-art.mjs` disegna tessere pixel originali, memorizzate in una piccola
cache: lastre irregolari, pietra, muschio, vegetazione, pareti rialzate, ombre e
lampade. Acqua animata, ghiaccio, sabbia ed erba hanno disegni distinti. Scrigni,
ristori, bancarelle, bandiere delle sfide e segnali di soccorso sostituiscono i
precedenti quadrati con lettere. Le scale sono una piccola scalinata in pietra.

I 18 biomi hanno palette coerenti con i tipi; alcune famiglie condividono la
stessa base cromatica. L’arena usa lastre più grandi e meno dettagliate per
non confondere griglia, Pokémon e ordini. La modalità movimento ridotto ferma
le nuove animazioni ambientali. Su desktop l’esplorazione è più ravvicinata;
l’arena resta interamente inquadrata secondo lo spazio disponibile.

Il terreno visuale segue le caselle del gioco: nessuna decorazione modifica
collisioni, visibilità, seed, turni, statistiche o salvataggi. Le zone mai
esplorate rimangono nascoste. Gli effetti e i dettagli sono realizzati nel
renderer, non ritagliati dall’immagine del mockup; non si tratta di una copia
pixel per pixel dell’illustrazione generata.

## Verifiche

- 74 test del motore superati.
- `tests/browser/redesign.mjs`: desktop e mobile, squadra di tre, zaino e
  isolamento dei tasti, orientamento gratuito, assenza di overflow orizzontale,
  render di tutti i 18 biomi senza mutare la partita.
- Suite browser di squadra/boss, reclutamento, animazioni, comandi pixel e
  funzionalità dell’avventura; risultati in `test-results/`.
- Spedizione con comandi reali: primo boss superato, piano 6 raggiunto,
  salvataggio ripreso, morte e nuova spedizione verificati senza errori JS.
- Immagini `dex-*` in `test-results/`: campi base, dungeon, zaino e boss.
  Le immagini di confronto del dungeon usano uno scenario controllato con tre
  Pokémon e celle già esplorate; non rappresentano il salvataggio dell’utente.

File principali: `src/dex.css`, `src/dex-layout.mjs`, `src/world-art.mjs`,
`src/render.mjs`, `src/adventure-render.mjs`, `src/app.mjs`.

Lo ZIP runtime è stato estratto in una cartella separata e avviato con il suo
server: anche su questa copia passano le suite browser redesign, adventure e
team, sia desktop sia mobile, senza errori JavaScript o risorse mancanti.
